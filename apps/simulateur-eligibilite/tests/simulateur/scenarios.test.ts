import { describe, it, expect } from "vitest";
import { makeEngine } from "./engine";

// Matrice de non-régression métier du modèle v3 (règles plates).
// Le modèle n'a pas de `par défaut` : on part d'une base « tout à non »
// puis on surcharge avec les entrées du scénario, comme la validation de réf.
const base: Record<string, string> = {
  p1_situation_smur: "non",
  p1_situation_bariatrique_seul: "non",
  p1_situation_permission_sans_motif_medical: "non",
  p1_motif_hospitalisation: "non",
  p1_motif_seance_chimio_radio_hemodialyse: "non",
  p1_motif_ald: "non",
  p1_ald_lien_avec_ald_reconnue: "non",
  p1_ald_seance_specifique: "non",
  p1_ald_incapacite_ou_deficience: "non",
  p1_motif_accident_travail_maladie_professionnelle: "non",
  p1_motif_retour_etablissement_penitentiaire: "non",
  p1_motif_aucun: "non",
  // v6 : les critères ne sont applicables qu'après réponse à l'autonomie, elle-même
  // gatée par la sélection d'un motif. Base neutre : autonomie répondue.
  p1_autonomie: "'aucune de ces situations'",
  p1_critere_regles_hygiene: "non",
  p1_critere_risques_effets_secondaires: "non",
  p1_critere_fauteuil_sans_transfert: "non",
  p1_critere_position_allongee_demi_assise: "non",
  p1_critere_brancardage_portage: "non",
  p1_critere_surveillance_personne_qualifiee: "non",
  p1_critere_oxygene: "non",
  p1_critere_asepsie: "non",
  p1_critere_aucune_situation_encadree: "non",
  p2_patient_hospitalise: "non",
  p2_exception_restant_assurance_maladie: "non",
  p2_detenu_hospitalise: "non",
  p2_detenu_inter_etablissements: "non",
  p2_detenu_uhsa_uhsi: "non",
  p2_detenu_retour_etablissement_penitentiaire: "non",
  p2_convocation_ou_avis: "non",
  p2_distance_aller_superieure_150km: "non",
  p2_transport_en_serie: "non",
  p2_avion_ou_bateau: "non",
  p2_camsp_cmpp: "non",
  p2_maternite_eloignee: "non",
  p2_samsah: "non",
  p2_accompagnement_tiers: "non",
  // v8.1 : le cas final PMT/DAP n'est déterminé qu'après complétion des
  // informations de trajet A4, et le cas convocation qu'après sélection du type
  // en A2.2. Ces champs ne sont applicables que dans leur parcours (gate
  // `applicable si`) ; renseignés dans la base neutre, ils permettent à
  // `cas_final` de se résoudre sans variable manquante là où ils s'appliquent.
  p2_trajet_aller_retour: "'aller simple'",
  p2_trajet_depart: "'domicile'",
  p2_trajet_arrivee: "'structure de soins'",
  p2_nombre_transports_prevus: "1",
  p2_transport_urgence: "'non'",
  p2_accident_cause_par_tiers: "non",
  p2_convocation_ou_avis_type: "'convocation contrôle médical'",
};

const TARGETS = [
  "resultat_medical",
  "transport_sanitaire_prescrit",
  "partie_2_requise",
  "cas_final",
  "document_a_remettre_au_patient",
] as const;

type Sortie = Partial<Record<(typeof TARGETS)[number], string>>;

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
      resultat_medical: "favorable",
      transport_sanitaire_prescrit: "transport par équipe SMUR",
      partie_2_requise: "non",
      cas_final: "SMUR",
    },
  },
  {
    id: "ROUTE-P1-02-BARIATRIQUE",
    inputs: { p1_situation_bariatrique_seul: "oui" },
    expected: {
      resultat_medical: "défavorable",
      transport_sanitaire_prescrit: "aucun",
      partie_2_requise: "non",
      cas_final: "bariatrique seul",
    },
  },
  {
    id: "ROUTE-P1-03-PERMISSION",
    inputs: { p1_situation_permission_sans_motif_medical: "oui" },
    expected: {
      resultat_medical: "défavorable",
      transport_sanitaire_prescrit: "aucun",
      partie_2_requise: "non",
      cas_final: "permission sortie sans motif médical",
    },
  },
  {
    id: "ROUTE-P1-04-DEFAVORABLE-GENERIQUE",
    inputs: { p1_motif_aucun: "oui", p1_critere_aucune_situation_encadree: "oui" },
    expected: {
      resultat_medical: "défavorable",
      transport_sanitaire_prescrit: "aucun",
      partie_2_requise: "non",
      cas_final: "non éligible assurance maladie dans ce parcours",
    },
  },
  {
    id: "ROUTE-P1-05-AMBULANCE-MOTIF-DEDUIT",
    inputs: { p1_motif_aucun: "oui", p1_critere_oxygene: "oui" },
    expected: {
      resultat_medical: "favorable",
      transport_sanitaire_prescrit: "ambulance",
      partie_2_requise: "oui",
      cas_final: "prescription médicale de transport",
    },
  },
  {
    id: "PMT-HOSPITALISATION-VP-TC",
    inputs: { p1_motif_hospitalisation: "oui", p1_critere_aucune_situation_encadree: "oui" },
    expected: {
      resultat_medical: "favorable",
      transport_sanitaire_prescrit: "véhicule personnel ou transport en commun",
      partie_2_requise: "oui",
      cas_final: "prescription médicale de transport",
      document_a_remettre_au_patient: "Prescription Médicale de Transport",
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
      resultat_medical: "favorable",
      transport_sanitaire_prescrit: "ambulance",
      partie_2_requise: "oui",
      cas_final: "demande accord préalable",
      document_a_remettre_au_patient: "Demande d’Accord Préalable",
    },
  },
  {
    id: "SERIE-ALD-VALIDEE-PAS-DAP-SEULE",
    inputs: {
      p1_motif_ald: "oui",
      p1_ald_lien_avec_ald_reconnue: "oui",
      p1_ald_seance_specifique: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_transport_en_serie: "oui",
    },
    expected: {
      resultat_medical: "favorable",
      transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cas_final: "prescription médicale de transport",
    },
  },
  {
    id: "SERIE-NON-ALD-DAP",
    inputs: {
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_transport_en_serie: "oui",
    },
    expected: {
      resultat_medical: "favorable",
      transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cas_final: "demande accord préalable",
    },
  },
  {
    id: "ETABLISSEMENT-HOSPITALISE-SANS-EXCEPTION",
    inputs: {
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_patient_hospitalise: "oui",
      p2_exception_restant_assurance_maladie: "non",
    },
    expected: {
      resultat_medical: "favorable",
      transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cas_final: "transport charge établissement",
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
      resultat_medical: "favorable",
      transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cas_final: "convocation ou avis audience",
    },
  },
];

describe("modèle v3 — scénarios métier", () => {
  for (const s of scenarios) {
    it(s.id, () => {
      const actual = evaluer(s.inputs);
      for (const [key, value] of Object.entries(s.expected)) {
        expect(actual[key], `${s.id} — ${key}`).toBe(value);
      }
    });
  }
});

describe("modèle v3 — couverture des cas finaux", () => {
  it("les 8 cas finaux sont atteints par la matrice", () => {
    const attendus = [
      "prescription médicale de transport",
      "demande accord préalable",
      "convocation ou avis audience",
      "transport charge établissement",
      "SMUR",
      "bariatrique seul",
      "permission sortie sans motif médical",
      "non éligible assurance maladie dans ce parcours",
    ];
    const couverts = new Set(
      scenarios.map((s) => evaluer(s.inputs).cas_final as string)
    );
    for (const cas of attendus) expect(couverts).toContain(cas);
  });
});
