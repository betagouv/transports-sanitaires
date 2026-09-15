// Les fonctions pures de la composition des éléments d'ordre médical (contrat
// EM-1, spec 0005) : dédoublonnage, cas particuliers, dates. Les parcours
// complets, sur le moteur réel, sont dans `elements-medicaux-parcours.test.ts`.
//
// La plupart des cas d'ici passent par un `Reponses` de fabrication plutôt que
// par le moteur : ce sont des assertions sur `composerElementsMedicaux` elle-
// même, indépendantes de toute règle — la décision 3 de la spec 0005 réserve
// le moteur réel aux cas où « non applicable rendu absent » compte vraiment.
//
// `EM-INCONNU-IGNORE` est cité, pas porté : une clé inconnue de `Reponses` est
// refusée par `CleDeRegle` à la compilation, avant même d'atteindre
// `composerElementsMedicaux`.

import { describe, expect, it } from "vitest";
import { composerElementsMedicaux } from "../../front/outils-produit/beta/cerfa/elements-medicaux/composition.ts";
import {
  dateEtHeureAvecDecalage,
  dateEtHeureDePermission,
  dateMedicale,
} from "../../front/outils-produit/beta/cerfa/elements-medicaux/dates.ts";
import {
  type Reponses,
  reponsesDe,
} from "../../front/outils-produit/beta/cerfa/reponses.ts";
import { seedParId } from "../../front/outils-produit/seeds/catalogue.ts";
import { situationDe } from "../../front/outils-produit/seeds/seed.ts";
import type { CleDeRegle } from "../../front/simulateur/contrat-regles-publicodes.ts";
import { moteurDeTest } from "../simulateur/moteur.ts";

function reponsesStub(valeurs: Partial<Record<CleDeRegle, unknown>>): Reponses {
  const valeur = (règle: CleDeRegle) => valeurs[règle];
  return {
    valeur,
    vrai: (règle) => valeur(règle) === true,
    texte: (règle) => {
      const v = valeur(règle);
      return v === undefined || v === null ? "" : String(v);
    },
    transport: "" as Reponses["transport"],
  };
}

describe("cas non positifs d'un critère", () => {
  // Les deux formes que rend réellement le moteur : une question non
  // applicable rend `undefined`, une réponse « Non » rend le booléen `false`.
  // `null` et la chaîne `'non'` ne sont jamais des valeurs de `nodeValue` sur
  // ce contrat : `EM-CRITERE-NON-POSITIF-null` et `-non` sont donc cités,
  // pas portés.
  it.each([undefined, false])("EM-CRITERE-NON-POSITIF-%s", (valeur) => {
    const réponses = reponsesStub({ p1_critere_oxygene: valeur });
    expect(composerElementsMedicaux(réponses)).toBe("");
  });
});

it("EM-ASEPSIE-LIBELLE-VALIDE", () => {
  const réponses = reponsesStub({ p1_critere_isolement_asepsie: true });
  expect(composerElementsMedicaux(réponses)).toBe(
    "L’état du patient nécessite un transport dans des conditions d’asepsie.",
  );
});

it("EM-RADIO-PAS-DE-DOUBLON", () => {
  const réponses = reponsesStub({
    cible_motif_medical_deplacement: "Séance de radiothérapie",
    p1_m0_seance_radiotherapie: true,
  });
  const occurrences =
    composerElementsMedicaux(réponses).split("Séance de radiothérapie").length -
    1;
  expect(occurrences).toBe(1);
});

it("EM-MOTIF-LIBRE-SANS-REECRITURE", () => {
  const motif =
    "IRM : contrôle à J+30.\nNe pas confondre avec le soin précédent.";
  const réponses = reponsesStub({ cible_motif_medical_deplacement: motif });
  expect(composerElementsMedicaux(réponses)).toBe(motif);
});

it("EM-VALEURS-ABSENTES-PAS-DE-UNDEFINED", () => {
  const réponses = reponsesStub({
    cible_situation_centre_reference_maladies_rares: true,
    cible_dap_motif_samsah: true,
    p2_permission_speciale: true,
  });
  const texte = composerElementsMedicaux(réponses);
  expect(texte).not.toMatch(/undefined|null|Invalid Date/);
  expect(texte).not.toContain("par mois");
});

it("EM-DISTANCE-INAPPLICABLE-SOURCE-ANCIENNE-IGNOREE", () => {
  const réponses = reponsesStub({
    cible_dap_motif_longue_distance: false,
    cible_justification_longue_distance: "Ancienne justification",
  });
  expect(composerElementsMedicaux(réponses)).toBe("");
});

it("EM-HTNM-NON-RENSEIGNE-IGNORE", () => {
  const réponses = reponsesStub({ p2_contexte_engagement_maternite: true });
  const texte = composerElementsMedicaux(réponses);
  expect(texte).toBe("Engagement maternité.");
  expect(texte).not.toContain("Hébergement");
});

it("EM-RETOUR-DISTANCE-EFFACEMENT", () => {
  // Le moteur relit toujours l'état courant : une ancienne justification qui
  // traînerait dans la situation ne doit pas reparaître si le trajet repasse
  // sous 150 km — `cible_dap_motif_longue_distance` devient faux, le bloc
  // disparaît quelle que soit `cible_justification_longue_distance`.
  const situationLongueDistance = situationDe(
    seedParId("secretariat-accord-prealable-distance"),
  );
  const situationRapprochée: Record<string, string> = {
    ...situationLongueDistance,
    p2_tranche_distance_trajet_aller: "'50 km ou moins'",
  };
  const réponses = reponsesDe(moteurDeTest(), situationRapprochée);
  expect(composerElementsMedicaux(réponses)).not.toContain(
    "Justification du trajet de plus de 150 km",
  );
});

describe("dates médicales", () => {
  it("EM-DATE-FRANCAISE", () => {
    expect(dateMedicale("2026-12-31")).toBe("31/12/2026");
  });

  it("EM-DATE-INVALIDE-REFUSEE", () => {
    expect(() => dateMedicale("2026-02-30")).toThrow(/invalide/);
  });

  it("EM-DATE-HEURE-ETE", () => {
    expect(dateEtHeureAvecDecalage("2026-09-05T08:00:00Z")).toBe(
      "05/09/2026 à 10h00",
    );
  });

  it("EM-DATE-HEURE-HIVER", () => {
    expect(dateEtHeureAvecDecalage("2026-12-01T23:30:00Z")).toBe(
      "02/12/2026 à 00h30",
    );
  });

  it("EM-DATE-HEURE-INCOMPLETE-REFUSEE", () => {
    // Le contrat, à la lettre : sans décalage, `dateEtHeureAvecDecalage` lève.
    // C'est `dateEtHeureDePermission`, plus bas, qui en ajoute un plutôt que
    // d'appliquer ce refus à une saisie de permission (question ouverte 1).
    expect(() => dateEtHeureAvecDecalage("2026-09-05T10:00:00")).toThrow(
      /invalides/,
    );
  });

  it("dateEtHeureDePermission ajoute le décalage de Paris, été comme hiver", () => {
    expect(dateEtHeureDePermission("2026-01-20T10:00")).toBe(
      "20/01/2026 à 10h00",
    );
    expect(dateEtHeureDePermission("2026-07-14T10:00")).toBe(
      "14/07/2026 à 10h00",
    );
  });
});
