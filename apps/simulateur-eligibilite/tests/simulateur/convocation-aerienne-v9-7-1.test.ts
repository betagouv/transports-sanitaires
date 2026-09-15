// Le volet aérien de la convocation, part de la matrice de non-régression du
// livrable v9.7.1 (tmp/9.7.1/tests/convocation.mjs). Le volet terrestre — la
// distance seule — est dans `convocation-v9-7-1.test.ts`.
//
// Un avion ou un bateau de ligne régulière ouvre, selon le contexte, l'une des
// quatre sous-situations qu'une DAP sait déjà motiver (hospitalisation, ALD,
// ATMP…) ; à défaut de contexte, le modèle ne sait composer aucune sous-situation
// et oriente le patient vers sa caisse — le huitième cas final de la v9.7.1.
//
// Les identifiants sont ceux du livrable, préfixés `CONV971-` ou `INDEPENDANT971-`
// comme il le fait.

import { describe, expect, it } from "vitest";
import {
  evaluerLeCas,
  type OptionsDuLivrable,
  situationDuLivrable,
} from "./livrable-v9-7-1";
import { moteurDeTest } from "./moteur";
import { DAP, ORIENTATION_CAISSE } from "./situations-v9-7-1";

const convocation = (overrides?: Record<string, string>) =>
  ({
    overrides: {
      p2_convocation_ou_avis_type:
        "'Convocation du contrôle médical de l’Assurance Maladie.'",
      ...overrides,
    },
  }) satisfies OptionsDuLivrable;

const AVION_BATEAU = { p2_convocation_avion_bateau: "oui" };
const LONG_ET_AIR = {
  p2_convocation_plus_150km: "oui",
  p2_convocation_avion_bateau: "oui",
};

describe("matrice v9.7.1 — la convocation aérienne", () => {
  it.each([
    ["HOSPITALISATION", { reason: "Entrée en hospitalisation" }],
    ["ALD", { m0: { p1_m0_ald: "oui" } }],
    [
      "ALD-NON-EXO-AVANT-OCT",
      { m0: { p1_m0_ald: "oui" }, aldType: "Non exonérante" },
    ],
    ["ATMP", { contexts: { p2_contexte_at_mp: "oui" } }],
  ] as const)("CONV971-AIR-SOUS-SITUATION-%s", (_id, o) => {
    // Un contexte déjà reconnu par le modèle (hospitalisation, ALD, ATMP)
    // rattache l'avion ou le bateau à une DAP, comme n'importe quel autre motif.
    const moteur = evaluerLeCas({
      ...convocation(),
      ...o,
      convocationCharacteristics: AVION_BATEAU,
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(DAP);
    expect(moteur.evaluate("cible_dap_motif_avion_bateau").nodeValue).toBe(
      true,
    );
    expect(
      moteur.evaluate("cible_dap_motif_longue_distance").nodeValue,
    ).not.toBe(true);
  });

  it("CONV971-AIR-DOUBLE-MOTIF-DAP", () => {
    // Longue distance et avion/bateau cochés ensemble : les deux motifs
    // coexistent dès qu'un contexte rattache la DAP.
    const moteur = evaluerLeCas({
      ...convocation(),
      reason: "Entrée en hospitalisation",
      convocationCharacteristics: LONG_ET_AIR,
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(DAP);
    expect(moteur.evaluate("cible_dap_motif_longue_distance").nodeValue).toBe(
      true,
    );
    expect(moteur.evaluate("cible_dap_motif_avion_bateau").nodeValue).toBe(
      true,
    );
  });

  it.each([
    ["SANS_CONTEXTE", {}],
    ["ALD_SANS_INCAPACITE", { autonomy: 0, m0: { p1_m0_ald: "oui" } }],
    ["AMBULANCE_SEULE", { criterion: "p1_critere_oxygene" }],
    [
      "ALD_NON_EXO_APRES_OCT",
      {
        m0: { p1_m0_ald: "oui" },
        aldType: "Non exonérante",
        instant: "2026-10-02T10:00:00Z",
      },
    ],
    ["LONG_ET_AIR", { convocationCharacteristics: LONG_ET_AIR }],
  ] as const)("CONV971-AIR-ORIENTATION-%s", (_id, o) => {
    // Sans contexte qui la rattache à une DAP, l'avion ou le bateau de la
    // convocation oriente vers la caisse — huitième cas final de la v9.7.1.
    const moteur = evaluerLeCas({
      ...convocation(),
      convocationCharacteristics: AVION_BATEAU,
      ...o,
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(
      ORIENTATION_CAISSE,
    );
    expect(
      moteur.evaluate("cible_document_a_remettre_au_patient").nodeValue,
    ).toBe("Synthèse pour démarche auprès de la caisse");
    expect(moteur.evaluate("cible_resultat_2_couleur").nodeValue).toBe("bleu");
  });

  it("AIR-FAIT-DEJA-CONNU-REUTILISE (partie moteur)", () => {
    // Un avion/bateau déjà établi par ailleurs (l'exception Assurance Maladie)
    // vaut motif, même quand la mosaïque de convocation répond « aucune ».
    const moteur = evaluerLeCas({
      ...convocation(),
      reason:
        "Transfert d’un patient hospitalisé vers un autre établissement de santé",
      transfer: true,
      exceptions: { p2_exception_avion_bateau: "oui" },
      convocationCharacteristics: { p2_convocation_aucune: "oui" },
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(DAP);
    expect(moteur.evaluate("cible_dap_motif_avion_bateau").nodeValue).toBe(
      true,
    );
  });

  it.each([
    ["APPEL15", "Appel au SAMU - Centre 15"],
    ["AUTRE", "Autre urgence médicale attestée"],
  ] as const)("CONV971-CAISSE-URGENCE-%s", (id, urgency) => {
    const moteur = evaluerLeCas({
      ...convocation(),
      convocationCharacteristics: AVION_BATEAU,
      urgency,
      overrides: {
        ...convocation().overrides,
        p2_urgence_autre_precision:
          "'Précision clinique confidentielle à ne pas reprendre dans la synthèse.'",
      },
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(
      ORIENTATION_CAISSE,
    );
    expect(moteur.evaluate("cible_urgence_attestee").nodeValue).toBe(true);
    expect(
      moteur.evaluate("cible_attente_accord_prealable_requise").nodeValue,
    ).toBe(false);
    expect(
      moteur.evaluate(
        id === "APPEL15" ? "cible_urgence_appel15" : "cible_urgence_autre",
      ).nodeValue,
    ).toBe(true);
  });

  it("CONV971-CAISSE-NON-URGENT-DEMARCHE-SANS-CERFA", () => {
    const moteur = evaluerLeCas({
      ...convocation(),
      convocationCharacteristics: AVION_BATEAU,
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(
      ORIENTATION_CAISSE,
    );
    expect(moteur.evaluate("cible_urgence_attestee").nodeValue).toBe(false);
    expect(
      moteur.evaluate("cible_document_a_remettre_au_patient").nodeValue,
    ).toBe("Synthèse pour démarche auprès de la caisse");
  });

  // CAISSE-URGENCE-REPONSE-OBLIGATOIRE et CAISSE-AUTRE-URGENCE-DETAIL-OBLIGATOIRE
  // ne se transposent pas au moteur seul : privé de sa réponse, le moteur range
  // la situation en « non éligible » plutôt que de la laisser indécise — la garde
  // réelle est portée par l'ordre du parcours (`etapes.ts`), pas redondée ici.

  it("CONV971-SYNTHESE-AIR-ET-LONGUE-DISTANCE", () => {
    const moteur = evaluerLeCas({
      ...convocation(),
      convocationCharacteristics: LONG_ET_AIR,
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(
      ORIENTATION_CAISSE,
    );
    expect(
      moteur.evaluate("cible_tranche_distance_trajet_aller").nodeValue,
    ).toBe("Plus de 150 km");
  });

  it("CONV971-SYNTHESE-AIR-SEUL-DISTANCE-MAX150", () => {
    // L'avion seul, sans la caractéristique « plus de 150 km », ne retombe pas
    // sur « 50 km ou moins » : la convocation retient « 150 km ou moins ».
    const moteur = evaluerLeCas({
      ...convocation(),
      convocationCharacteristics: AVION_BATEAU,
    });
    expect(
      moteur.evaluate("cible_tranche_distance_trajet_aller").nodeValue,
    ).toBe("150 km ou moins");
    expect(
      moteur.evaluate("cible_tranche_distance_trajet_aller").nodeValue,
    ).not.toBe("50 km ou moins");
  });

  it("CONV971-CAS-AERIEN-HORS-CONVOCATION-INCHANGE", () => {
    // Un avion/bateau hors convocation (situation spéciale A3.1) reste
    // incomplet faute de sous-situation, comme avant la v9.7.1 : elle ne touche
    // qu'à la branche convocation, et ne le fait pas basculer en orientation.
    const moteur = evaluerLeCas({
      criterion: "p1_critere_oxygene",
      special: { p2_special_avion_bateau: "oui" },
    });
    expect(moteur.evaluate("cible_resultat_2_affichable").nodeValue).not.toBe(
      true,
    );
    expect(moteur.evaluate("p2_document_dap_determine").nodeValue).toBe(true);
    expect(moteur.evaluate("cible_orientation_caisse").nodeValue).not.toBe(
      true,
    );
  });

  describe("INDEPENDANT971 — contrôles adverses transposés", () => {
    it.each(
      [
        "Convocation du contrôle médical de l’Assurance Maladie.",
        "Convocation d’un médecin-expert ou consultant désigné par une juridiction.",
        "Audience devant une juridiction saisie d’un litige relevant de la Sécurité sociale, avec examen clinique du patient.",
        "Consultation d’un médecin expert désigné dans le cadre d’une contestation médicale avec un organisme de Sécurité sociale.",
        "Convocation de la Commission Médicale de Recours Amiable dans le cadre d’une contestation médicale (exemples : invalidité ou le taux d’incapacité après un AT/MP).",
        "Convocation d’un médecin désigné par la Commission Médicale de Recours Amiable pour réaliser un examen clinique ou une expertise.",
        "Déplacement chez un fournisseur d’appareillage agréé : prothèse oculaire ou faciale, chaussure orthopédique sur mesure, orthèse ou une prothèse externe.",
      ].map((type, i) => [i, type] as const),
    )("funding-no-missing-all-convocation-types-airpluslong-%s", (_i, type) => {
      const moteur = evaluerLeCas({
        convocationCharacteristics: LONG_ET_AIR,
        criterion: "p1_critere_oxygene",
        overrides: { p2_convocation_ou_avis_type: `'${type}'` },
      });
      expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(
        ORIENTATION_CAISSE,
      );
      for (const cible of [
        "cible_cas_final",
        "cible_resultat_2_affichable",
        "cible_document_a_remettre_au_patient",
        "cible_regime_financement",
      ])
        expect(
          Object.keys(moteur.evaluate(cible).missingVariables ?? {}),
        ).toEqual([]);
    });

    it("atmp-date-mandatory-air-convocation", () => {
      // Une date future ou un 30 février ne sont pas rejetés par le moteur
      // seul — le calendrier de saisie s'en charge
      // (`bornes-de-saisie.test.tsx`) ; seule l'absence de date l'est ici.
      for (const date of [undefined, "''"]) {
        const situation = situationDuLivrable({
          ...convocation(),
          convocationCharacteristics: AVION_BATEAU,
          contexts: { p2_contexte_at_mp: "oui" },
        });
        if (date === undefined) delete situation.p2_date_at_mp;
        else situation.p2_date_at_mp = date;
        const moteur = moteurDeTest(situation);
        expect(
          moteur.evaluate("cible_resultat_2_affichable").nodeValue,
          String(date),
        ).not.toBe(true);
      }
    });

    it("air-atmp-urgent-cases-no-auto-approval", () => {
      const moteur = evaluerLeCas({
        ...convocation(),
        convocationCharacteristics: LONG_ET_AIR,
        contexts: { p2_contexte_at_mp: "oui" },
        urgency: "Autre urgence médicale attestée",
      });
      expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(DAP);
      expect(
        moteur.evaluate("cible_attente_accord_prealable_requise").nodeValue,
      ).toBe(false);
      expect(moteur.evaluate("cible_dap_motif_avion_bateau").nodeValue).toBe(
        true,
      );
    });
  });
});
