import { describe, it, expect } from "vitest";
import { BASE_NEUTRE, makeEngine } from "./engine";

// Matrice de non-régression métier (règles plates v8.10). On part de la base neutre
// « tout à non » (cf. BASE_NEUTRE) puis on surcharge avec les entrées du scénario.
const base = BASE_NEUTRE;

const TARGETS = [
  "cible_resultat_medical",
  "cible_transport_sanitaire_prescrit",
  "cible_partie_2_requise",
  "cible_cas_final",
  "cible_document_a_remettre_au_patient",
] as const;

type Sortie = Partial<Record<(typeof TARGETS)[number], string | null>>;

function evaluer(inputs: Record<string, string>): Record<string, unknown> {
  const engine = makeEngine({ ...base, ...inputs });
  return Object.fromEntries(
    TARGETS.map((t) => {
      const r = engine.evaluate(t);
      const missing = Object.keys(r.missingVariables ?? {});
      expect(missing, `${t} a des variables manquantes`).toEqual([]);
      return [t, r.nodeValue];
    })
  );
}

const scenarios: Array<{ id: string; inputs: Record<string, string>; expected: Sortie }> = [
  {
    id: "ROUTE-P1-01-SMUR",
    inputs: { p1_situation_smur: "oui" },
    expected: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "transport par équipe SMUR",
      cible_partie_2_requise: "non",
      cible_cas_final: "SMUR",
    },
  },
  {
    id: "ROUTE-P1-02-BARIATRIQUE",
    inputs: { p1_situation_bariatrique_seul: "oui" },
    expected: {
      cible_resultat_medical: "défavorable",
      cible_transport_sanitaire_prescrit: "aucun",
      cible_partie_2_requise: "non",
      cible_cas_final: "bariatrique seul",
    },
  },
  {
    id: "ROUTE-P1-03-PERMISSION",
    inputs: { p1_situation_permission_sans_motif_medical: "'Oui'" },
    expected: {
      cible_resultat_medical: "défavorable",
      cible_transport_sanitaire_prescrit: "aucun",
      cible_partie_2_requise: "non",
      cible_cas_final: "permission sortie sans motif médical",
    },
  },
  {
    id: "ROUTE-P1-04-DEFAVORABLE-GENERIQUE",
    inputs: { p1_motif_aucun: "oui", p1_critere_aucune_situation_encadree: "oui" },
    expected: {
      cible_resultat_medical: "défavorable",
      cible_transport_sanitaire_prescrit: "aucun",
      cible_partie_2_requise: "non",
      cible_cas_final: "non éligible assurance maladie dans ce parcours",
    },
  },
  {
    id: "ROUTE-P1-05-AMBULANCE-MOTIF-DEDUIT",
    inputs: { p1_motif_aucun: "oui", p1_critere_oxygene: "oui" },
    expected: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
    },
  },
  {
    id: "PMT-HOSPITALISATION-VP-TC",
    inputs: { p1_motif_hospitalisation: "oui", p1_critere_aucune_situation_encadree: "oui" },
    expected: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "véhicule personnel ou transport en commun",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_document_a_remettre_au_patient: "Prescription Médicale de Transport",
    },
  },
  {
    id: "DAP-DISTANCE-AMBULANCE",
    inputs: {
      p1_motif_hospitalisation: "oui",
      p1_critere_oxygene: "oui",
      p2_distance_aller_superieure_150km: "oui",
    },
    expected: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande accord préalable",
      cible_document_a_remettre_au_patient: "Demande d’Accord Préalable",
    },
  },
  {
    // v8.10 : série calculée (nombre >= 4 + chaque trajet aller > 50 km). ALD validée
    // (séance spécifique) → pas de DAP au seul titre de la série.
    id: "SERIE-ALD-VALIDEE-PAS-DAP-SEULE",
    inputs: {
      p1_motif_ald: "oui",
      p1_ald_lien_avec_ald_reconnue: "oui",
      p1_ald_seance_specifique: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_nombre_transports_prevus: "4",
      p2_chaque_trajet_aller_superieur_50km: "oui",
    },
    expected: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_cas_final: "prescription médicale de transport",
    },
  },
  {
    // v8.10 : série calculée, hors ALD → DAP déclenchée par la série.
    id: "SERIE-NON-ALD-DAP",
    inputs: {
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_nombre_transports_prevus: "4",
      p2_chaque_trajet_aller_superieur_50km: "oui",
    },
    expected: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_cas_final: "demande accord préalable",
    },
  },
  {
    id: "ETABLISSEMENT-HOSPITALISE-SANS-EXCEPTION",
    inputs: {
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_patient_hospitalise: "oui",
      p2_exception_type: "'Non, le transport ne fait pas partie de ces exceptions.'",
    },
    expected: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_cas_final: "transport charge établissement",
    },
  },
  {
    id: "CONVOCATION",
    inputs: {
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_convocation_ou_avis: "oui",
    },
    expected: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_cas_final: "convocation ou avis audience",
    },
  },
  {
    // v8.10 : nouveau cas — la prestation à l'origine du déplacement n'est pas prise
    // en charge (A2.3 = Non) → prioritaire sur le mode, aucun document.
    id: "PRESTATION-NON-PRISE-EN-CHARGE",
    inputs: {
      p1_motif_aucun: "oui",
      p1_critere_oxygene: "oui",
      p2_prestation_prise_en_charge_assurance_maladie: "non",
    },
    expected: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prestation non prise en charge par assurance maladie",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
];

describe("modèle v8.10 — scénarios métier", () => {
  for (const s of scenarios) {
    it(s.id, () => {
      const actual = evaluer(s.inputs);
      for (const [key, value] of Object.entries(s.expected)) {
        expect(actual[key], `${s.id} — ${key}`).toBe(value);
      }
    });
  }
});

describe("modèle v8.10 — couverture des cas finaux", () => {
  it("les 9 cas finaux sont atteints par la matrice", () => {
    const attendus = [
      "prescription médicale de transport",
      "demande accord préalable",
      "convocation ou avis audience",
      "transport charge établissement",
      "prestation non prise en charge par assurance maladie",
      "SMUR",
      "bariatrique seul",
      "permission sortie sans motif médical",
      "non éligible assurance maladie dans ce parcours",
    ];
    const couverts = new Set(
      scenarios.map((s) => evaluer(s.inputs).cible_cas_final as string)
    );
    for (const cas of attendus) expect(couverts).toContain(cas);
  });
});
