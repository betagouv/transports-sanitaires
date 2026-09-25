// Les régressions v9.7.3 de l'éditeur indépendantes de ses campagnes
// (`tests/v973.mjs`, identifiants `V973-*`), rejouées au moteur.
//
// Une garde se vérifie comme chez l'éditeur : une situation valide, puis une
// réponse contradictoire posée par-dessus, et la garde doit refuser.
//
// Non transposés :
// - `V973-TITRE-VALEUR-INCHANGEE` compare deux moteurs, avec et sans un titre ;
//   `V973-TITRES-COMPLETS` suffit à garder l'intention ;
// - `V973-RESTAURATION-*` : l'application ne restaure pas de session
//   (`exportState()`), cf. ticket 18 ;
// - `YAML-JS-*` et `CAMPAGNE-V973-*` vérifient le paquet de l'éditeur lui-même
//   (lecture de ses YAML, exécution et inventaire de sa campagne). Chez nous,
//   `pnpm valider-regles` lit le modèle recopié, et ces fichiers sont le
//   portage de la campagne.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import type { Situation } from "publicodes";
import { describe, expect, it } from "vitest";
import { avecEntreesCalculees } from "../../front/simulateur/entrees-calculees";
import { moteur, texte, vrai } from "../../front/simulateur/moteur";
import { capaciteDeLaDap } from "../../front/simulateur/nombre-permission-dap";
import { saisieACorriger } from "../../front/simulateur/questionnaire/saisie-a-corriger";
import { type OptionsDuLivrable, situationDuLivrable } from "./livrable";

const PMT = "prescription médicale de transport";
const DAP = "demande d’accord préalable";
const CAISSE = "orientation vers la caisse pour accord préalable";
const ETABLISSEMENT = "transport à la charge de l’établissement";
const TRANSFERT =
  "Transfert d’un patient hospitalisé vers un autre établissement de santé";
const PERMISSION = "Permission temporaire de sortie";
const CLINIQUE: OptionsDuLivrable = {
  criterion: "p1_critere_brancardage_portage",
};

describe("V973, le modèle", () => {
  it("V973-TITRES-COMPLETS", () => {
    const racine = join(dirname(fileURLToPath(import.meta.url)), "../..");
    const regles = yaml.load(
      readFileSync(join(racine, "regles/regles.publicodes"), "utf-8"),
    ) as Record<string, { titre?: string } | null>;
    const sansTitre = Object.entries(regles)
      .filter(([, regle]) => !regle?.titre)
      .map(([nom]) => nom);
    expect(sansTitre).toEqual([]);
  });
});

describe("V973, les lieux déduits", () => {
  it.each([
    ["ENTREE", "Entrée en hospitalisation", "arrivee"],
    ["SORTIE", "Sortie d’hospitalisation", "depart"],
    ["URGENCES", "Transport vers un service d’urgences", "arrivee"],
  ] as const)("V973-LIEU-DEDUIT-RECAP-%s", (id, reason, bout) => {
    const trajet = bout === "depart" ? "p2_trajet_depart" : "p2_trajet_arrivee";
    const situation = sans(
      situationDuLivrable({
        ...CLINIQUE,
        reason,
        ...(id === "SORTIE" ? { arrival: "Domicile" } : {}),
      }),
      trajet,
    );
    const positionne = moteur.setSituation(avecEntreesCalculees(situation));
    expect(texte(positionne, "cible_cas_final")).toBe(PMT);
    const lieu =
      bout === "depart" ? "cible_lieu_depart_type" : "cible_lieu_arrivee_type";
    expect(texte(positionne, lieu)).toBe("Structure de soins");
  });
});

describe("V973, les précisions médicales", () => {
  it.each([
    { reason: "Examen médical" },
    { reason: "Consultation médicale", transfer: true },
    { reason: PERMISSION, age: "20 ans ou plus" },
  ])("V973-DETAIL-AUCUN-CERFA (%o)", (options) => {
    const positionne = moteur.setSituation(situationDuLivrable(options));
    expect(vrai(positionne, "cible_resultat_2_affichable")).toBe(true);
    expect(positionne.evaluate("p2_motif_detail").nodeValue).toBeNull();
    expect(
      positionne.evaluate("p2_transfert_motif_detail").nodeValue,
    ).toBeNull();
  });

  it("V973-DETAIL-DOCUMENT-OBLIGATOIRE", () => {
    const pmt = situationDuLivrable(CLINIQUE);
    const sansPrecision = avecEntreesCalculees(sans(pmt, "p2_motif_detail"));
    expect(affichable(sansPrecision)).toBe(false);
    const generique = avecEntreesCalculees({
      ...pmt,
      p2_motif_detail: "'Autre - préciser'",
    });
    expect(saisieACorriger("p2_motif_detail", generique)).toBeDefined();
    expect(affichable(generique)).toBe(false);
  });
});

describe("V973, les gardes du moteur", () => {
  it.each([
    ["EHPAD", "p2_exception_ehpad"],
    ["USLD", "p2_exception_usld"],
  ])("V973-GARDE-MOTEUR-EXCEPTION-%s", (type, cle) => {
    const valide = situationDuLivrable({
      ...CLINIQUE,
      reason: TRANSFERT,
      exceptions: { [cle]: "oui" },
      depart: type,
      arrival: "Structure de soins",
    });
    expect(texte(moteur.setSituation(valide), "cible_cas_final")).toBe(PMT);
    const contradictoire = recalcule(valide, {
      p2_trajet_depart: "'Domicile'",
      p2_trajet_arrivee: "'Autre lieu'",
    });
    expect(contradictoire.p2_exceptions_trajet_valides).toBe("non");
    expect(affichable(contradictoire)).toBe(false);
  });

  it.each([
    ["M0-ABSENT", {}],
    [
      "DEFINITIF",
      { nature: "Définitif", m0: { p1_m0_seance_radiotherapie: "oui" } },
    ],
  ])("V973-GARDE-AVANT-SORTIE-ETABLISSEMENT-%s", (_id, options) => {
    const valide = situationDuLivrable({ reason: TRANSFERT, ...options });
    expect(texte(moteur.setSituation(valide), "cible_cas_final")).toBe(
      ETABLISSEMENT,
    );
    const contradictoire = recalcule(valide, {
      p2_exception_radiotherapie_moins_48h: "oui",
    });
    expect(contradictoire.p2_qualification_declarations_valides).toBe("non");
    expect(affichable(contradictoire)).toBe(false);
  });

  const radiotherapie = situationDuLivrable({
    ...CLINIQUE,
    reason: TRANSFERT,
    depart: "Structure de soins",
    m0: { p1_m0_seance_radiotherapie: "oui" },
    exceptions: { p2_exception_radiotherapie_moins_48h: "oui" },
  });
  it.each([
    ["DUREE", { p2_nature_transfert: "'Définitif'" }],
    ["MEDICAL", { p1_m0_seance_radiotherapie: "non", p1_m0_aucun: "oui" }],
  ])("V973-GARDE-MOTEUR-RADIO-%s", (_id, contradiction) => {
    const contradictoire = recalcule(radiotherapie, contradiction);
    expect(contradictoire.p2_exceptions_trajet_valides).toBe("non");
    expect(affichable(contradictoire)).toBe(false);
  });

  it("V973-GARDE-MOTEUR-PRISON-CONTRADICTOIRE", () => {
    const contradictoire = recalcule(
      situationDuLivrable({ ...CLINIQUE, reason: "Entrée en hospitalisation" }),
      { p2_contexte_aucun: "non", p2_contexte_retour_penitentiaire: "oui" },
    );
    expect(contradictoire.p2_exceptions_trajet_valides).toBe("non");
    expect(affichable(contradictoire)).toBe(false);
  });

  it.each(["3", "999"])(
    "V973-GARDE-MOTEUR-PERMISSION-QUANTITE (%s)",
    (total) => {
      const valide = situationDuLivrable({ reason: PERMISSION, distance: 2 });
      expect(texte(moteur.setSituation(valide), "cible_cas_final")).toBe(DAP);
      const contradictoire = recalcule(valide, {
        p2_nombre_transports_permission_dap: total,
      });
      expect(contradictoire.p2_nombre_permission_dap_valide).toBe("non");
      expect(affichable(contradictoire)).toBe(false);
    },
  );
});

describe("V973, les permissions et l'orientation caisse", () => {
  const courte = (fin: string, total: string, organisation: string) =>
    situationDuLivrable({
      reason: PERMISSION,
      distance: 2,
      organization: organisation,
      permissionStart: "2026-09-05T10:00:00+02:00",
      permissionEnd: "2026-09-07T10:00:00+02:00",
      overrides: {
        p2_permission_ar_par_mois: "1",
        p2_permission_periode_fin: `'${fin}'`,
        p2_nombre_transports_permission_dap: total,
      },
    });

  it("V973-PERMISSION-FIN-EXCLUT-RETOUR", () => {
    const simples = courte("2026-09-05", "1", "trajets simples");
    expect(texte(moteur.setSituation(simples), "cible_cas_final")).toBe(DAP);
    expect(capaciteDeLaDap(simples)).toBe(1);
    expect(
      capaciteDeLaDap({
        ...simples,
        p2_organisation_transports: "'aller-retour identique'",
      }),
    ).toBe(0);
  });

  it("V973-PERMISSION-BORNE-SANS-JOUR-IMPOSE", () => {
    const situation = situationDuLivrable({
      reason: PERMISSION,
      distance: 2,
      permissionStart: "2026-09-04T10:00:00+02:00",
      permissionEnd: "2026-09-06T10:00:00+02:00",
      overrides: {
        p2_permission_ar_par_mois: "1",
        p2_permission_periode_fin: "'2026-10-03'",
        p2_nombre_transports_permission_dap: "4",
      },
    });
    const positionne = moteur.setSituation(situation);
    expect(texte(positionne, "cible_cas_final")).toBe(DAP);
    expect(texte(positionne, "cible_nombre_transports_document")).toBe("4");
    expect(capaciteDeLaDap(situation)).toBe(4);
  });

  it.each([
    ["NON", "Non", true],
    ["URGENT", "Autre urgence médicale attestée", false],
  ])("V973-AIR-CAISSE-SANS-DEPENDANCE-%s", (_id, urgency, attente) => {
    const positionne = moteur.setSituation(
      situationDuLivrable({
        ...CLINIQUE,
        reason: "Transport vers un service d’urgences",
        special: { p2_special_avion_bateau: "oui" },
        urgency,
      }),
    );
    expect(texte(positionne, "cible_cas_final")).toBe(CAISSE);
    expect(vrai(positionne, "cible_attente_accord_prealable_requise")).toBe(
      attente,
    );
  });
});

// ---- implémentation ----

function sans(situation: Situation<string>, cle: string): Situation<string> {
  const { [cle]: _, ...reste } = situation;
  return reste;
}

function recalcule(
  situation: Situation<string>,
  contradiction: Record<string, string>,
): Situation<string> {
  return avecEntreesCalculees({ ...situation, ...contradiction });
}

function affichable(situation: Situation<string>): boolean {
  return vrai(moteur.setSituation(situation), "cible_resultat_2_affichable");
}
