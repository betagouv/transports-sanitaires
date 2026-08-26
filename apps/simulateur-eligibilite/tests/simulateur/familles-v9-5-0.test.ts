// Les trois familles engendrées de la matrice v9.5.0 : l'exploration exhaustive de
// la Partie 1 (P1-EXHAUSTIVE), les huit réponses d'A2.1 (CONVOCATION-001) et les
// neuf exceptions restant à la charge de l'Assurance Maladie (EXCEPTION-001).
// Le livrable les décrit par un générateur plutôt que par des cas nommés — d'où
// leur séparation d'avec `regression-v9-5-0.test.ts`.

import { describe, expect, it } from "vitest";
import {
  DAP,
  evalue,
  HOSPITALISATION,
  PMT,
  PRO,
  SMUR,
  TPMR,
  VSL,
} from "./situations-v9-5-0";

describe("modèle v9.5.0 — P1-EXHAUSTIVE", () => {
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
    });
    expect(moteur.evaluate("p1_mode_transport_medical").nodeValue).toBe(TPMR);
  });

  // Q1.1 n'a plus d'option « Aucune » : sans critère coché, la question reste
  // sans réponse et le mode n'est pas conclu. C'est le modèle qui l'impose —
  // la branche VSL exige désormais `p1_criteres_transport_repondus`.
  it("un besoin professionnel sans aucun critère ne conclut à aucun mode", () => {
    const moteur = evalue({ p1_autonomie: PRO });
    expect(moteur.evaluate("p1_mode_transport_medical").nodeValue).toBeNull();
  });

  it("un besoin professionnel dont le seul critère est l'aide produit un VSL", () => {
    const moteur = evalue({
      p1_autonomie: PRO,
      p1_critere_aide_professionnel: "oui",
    });
    expect(
      moteur.evaluate("cible_transport_sanitaire_prescrit").nodeValue,
    ).toBe(VSL);
  });

  it("la permission de sortie sans motif médical l'emporte sur les critères médicaux", () => {
    const moteur = evalue({
      p1_autonomie: PRO,
      p1_critere_oxygene: "oui",
      p1_m0_permission_sans_motif_medical: "oui",
      p1_m0_aucun: "non",
    });
    expect(moteur.evaluate("p1_cas_final_direct").nodeValue).toBe(
      "permission sortie sans motif médical",
    );
  });

  // Le SMUR ne se dispute plus la priorité avec les critères : il est répondu en
  // Q1, qui n'ouvre alors ni Q1.1 ni M0.
  it("l'urgence vitale répondue en Q1 tranche à elle seule", () => {
    const moteur = evalue({ p1_autonomie: SMUR });
    expect(moteur.evaluate("p1_cas_final_direct").nodeValue).toBe("SMUR");
  });
});

describe("modèle v9.5.0 — générateurs du livrable", () => {
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
    "p2_exception_permission_mineur",
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
      ...HOSPITALISATION,
      p2_convocation_ou_avis_type: "'Aucun de ces cas.'",
    });
    expect(moteur.evaluate("p2_convocation_ou_avis").nodeValue).toBe(false);
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(PMT);
  });

  it.each(EXCEPTIONS)(
    "EXCEPTION-001 — %s reste dans le parcours Assurance Maladie",
    (exception) => {
      const moteur = evalue({
        p1_autonomie: PRO,
        p1_critere_hygiene_desinfection: "oui",
        ...HOSPITALISATION,
        p2_patient_hospitalise: "oui",
        [exception]: "oui",
        p2_exception_aucune: "non",
      });
      // L'avion ou le bateau ouvre le droit, mais sous accord préalable.
      expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(
        exception === "p2_exception_avion_bateau" ? DAP : PMT,
      );
    },
  );
});
