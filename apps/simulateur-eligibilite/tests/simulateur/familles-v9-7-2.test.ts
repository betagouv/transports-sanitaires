// Les trois familles engendrées de la matrice v9.5.1 : l'exploration exhaustive de
// la Partie 1 (P1-EXHAUSTIVE), les huit réponses d'A2.1 (CONVOCATION-001) et les
// neuf exceptions restant à la charge de l'Assurance Maladie (EXCEPTION-001).
// Le livrable les décrit par un générateur plutôt que par des cas nommés — d'où
// leur séparation d'avec `regression-v9-5-1.test.ts`.

import { describe, expect, it } from "vitest";
import {
  evalue,
  HOSPITALISATION,
  PMT,
  PRO,
  TPMR,
  VSL,
} from "./situations-v9-7-2";

describe("modèle v9.7 — P1-EXHAUSTIVE", () => {
  const CRITERES_AMBULANCE = [
    "p1_critere_position_allongee_demi_assise",
    "p1_critere_brancardage_portage",
    "p1_critere_surveillance_constante",
    "p1_critere_oxygene",
    "p1_critere_isolement_asepsie",
  ];

  it.each(CRITERES_AMBULANCE)(
    "%s l'emporte sur le fauteuil (TPMR)",
    (critere) => {
      const moteur = evalue({
        p1_autonomie: PRO,
        [critere]: "oui",
        p1_critere_fauteuil_sans_transfert: "oui",
        p1_critere_aucun: "non",
      });
      expect(moteur.evaluate("p1_mode_transport_medical").nodeValue).toBe(
        "ambulance",
      );
    },
  );

  it("le fauteuil l'emporte sur le VSL ou taxi conventionné", () => {
    const moteur = evalue({
      p1_autonomie: PRO,
      p1_critere_fauteuil_sans_transfert: "oui",
      p1_critere_hygiene_desinfection: "oui",
      p1_critere_aucun: "non",
    });
    expect(moteur.evaluate("p1_mode_transport_medical").nodeValue).toBe(TPMR);
  });

  // Q1.1 n'a plus d'option « Aucune » : sans critère coché, la question reste
  // sans réponse et le mode n'est pas conclu. C'est le modèle qui l'impose —
  // la branche VSL exige désormais `p1_criteres_transport_repondus`.
  it("un besoin professionnel sans critère coché ne conclut à aucun mode", () => {
    // Ni critère ni sortie « aucun » : la mosaïque est sans réponse, et le
    // modèle ne tranche pas. La base neutre répond « aucun », il faut donc la
    // défaire pour retrouver l'indécision.
    const moteur = evalue({ p1_autonomie: PRO, p1_critere_aucun: null });
    expect(
      moteur.evaluate("p1_mode_transport_medical").nodeValue ?? null,
    ).toBeNull();
  });

  it("un besoin professionnel dont le seul critère est l'aide produit un VSL", () => {
    const moteur = evalue({
      p1_autonomie: PRO,
      p1_critere_aide_professionnel: "oui",
      p1_critere_aucun: "non",
    });
    expect(
      moteur.evaluate("cible_transport_sanitaire_prescrit").nodeValue,
    ).toBe(VSL);
  });

  // La v9.5.1 qualifiait la permission de sortie en M0, par une case du
  // prescripteur qui l'emportait sur les critères médicaux et tranchait la
  // Partie 1. La v9.7 l'a déplacée en Partie 2 : elle se déclare par la raison
  // principale puis par son cadre, et ne touche plus au mode retenu.
  it("la permission de sortie ne touche plus au mode médical", () => {
    const moteur = evalue({
      p1_autonomie: PRO,
      p1_critere_oxygene: "oui",
      p1_critere_aucun: "non",
      p2_raison_principale: "'Permission temporaire de sortie'",
      p2_permission_cadre: "'Demande du patient sans justification médicale'",
    });
    expect(
      moteur.evaluate("cible_transport_sanitaire_prescrit").nodeValue,
    ).toBe("ambulance");
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(
      "permission de sortie sans motif médical",
    );
  });

  // La v9.5.0 avait fait du SMUR une réponse de Q1, qui tranchait la Partie 1 à
  // elle seule ; la v9.7 a retiré cette réponse et le cas final qui allait avec.
  // Q1 n'a plus que trois réponses, et aucune ne conclut sans la Partie 2.
  it("Q1 n’offre plus de réponse qui tranche à elle seule", () => {
    const possibles = (
      evalue({}).getRule("p1_autonomie").rawNode as {
        "une possibilité"?: string[];
      }
    )["une possibilité"];
    expect(possibles).toHaveLength(3);
    expect(possibles?.join(" ")).not.toMatch(/SMUR/);
  });
});

describe("modèle v9.7 — générateurs du livrable", () => {
  const CONVOCATIONS = [
    "Convocation du contrôle médical de l’Assurance Maladie.",
    "Convocation d’un médecin-expert ou consultant désigné par une juridiction.",
    "Audience au cours de laquelle une consultation clinique a lieu.",
    "Consultation d’un expert désigné selon l’article R. 141-1 du Code de la sécurité sociale.",
    "Convocation de la commission prévue par l’article R. 142-8 du Code de la sécurité sociale.",
    "Convocation du médecin désigné par cette commission.",
    "Déplacement chez un fournisseur d’appareillage agréé.",
  ];
  const EXCEPTIONS = [
    "p2_exception_aide_medicale_urgente",
    "p2_exception_avion_bateau",
    "p2_exception_had_hors_protocole",
    "p2_exception_usld",
    "p2_exception_ehpad",
    "p2_exception_radiotherapie_moins_48h",
    "p2_exception_dialyse_domicile",
    "p2_exception_admission_had",
  ];

  it.each(CONVOCATIONS)("CONVOCATION-001 — %s vaut prescription", (type) => {
    const moteur = evalue({
      p2_convocation_ou_avis_type: `'${type}'`,
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(
      "convocation ou avis d’audience",
    );
  });

  // La huitième réponse d'A2.1, née de la fusion des deux écrans : elle ne vaut
  // pas prescription et laisse le parcours administratif se poursuivre. C'est la
  // seule qui le fasse — d'où sa place au même endroit que les sept autres.
  it("CONVOCATION-001 — « Aucun de ces cas. » poursuit le parcours", () => {
    const moteur = evalue({
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      p1_critere_aucun: "non",
      ...HOSPITALISATION,
      p2_convocation_ou_avis_type: "'Aucun de ces cas.'",
    });
    expect(moteur.evaluate("p2_convocation").nodeValue).toBe(false);
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(PMT);
  });

  it.each(EXCEPTIONS)(
    "EXCEPTION-001 — %s reste dans le parcours Assurance Maladie",
    (exception) => {
      const moteur = evalue({
        p1_autonomie: PRO,
        p1_critere_hygiene_desinfection: "oui",
        p1_critere_aucun: "non",
        ...HOSPITALISATION,
        p2_transfert_en_cours: "oui",
        [exception]: "oui",
        p2_exception_aucune: "non",
      });
      // Les huit exceptions laissent le transport dans le champ de l'Assurance
      // Maladie, et aucune n'appelle d'accord préalable. La v9.5.1 faisait
      // exception pour l'avion et le bateau ; la v9.7 a déplacé ce motif vers
      // les situations spéciales (`p2_special_avion_bateau`), où il vaut DAP.
      expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(PMT);
    },
  );
});
