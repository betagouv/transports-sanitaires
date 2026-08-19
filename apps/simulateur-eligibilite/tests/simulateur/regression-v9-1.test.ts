// Portage de la matrice de non-régression du livrable v9.1
// (tmp/9.1/transports-sanitaires.tests.v9-1.yaml → dynamic_scenarios).
//
// Le livrable v9.1 énonce ses dix-neuf scénarios en prose, là où la v8.10 les
// donnait en `given`/`expect` exploitables. Ils sont donc réencodés ici, un cas
// par scénario, en gardant l'identifiant du livrable : c'est lui qu'on cite
// quand un désaccord doit remonter au fournisseur du modèle.
//
// Les assertions purement UI de la matrice (avancement automatique,
// verrouillage, contenus interdits) ne sont pas ici : elles relèvent des tests
// d'interface.

import { describe, expect, it } from "vitest";
import {
  ALD,
  AUTONOME,
  CHARGE_ETABLISSEMENT,
  DAP,
  evalue,
  HOSPITALISATION,
  NON_ELIGIBLE,
  PMT,
  PRO,
  PROCHE,
  type Reponses,
  VSL,
} from "./situations-v9-1";

// `null` retire la clé de la situation : voir `Reponses` dans `situations-v9-1`.
type Cas = {
  id: string;
  given: Reponses;
  expect: Record<string, unknown>;
};

const matrice: Cas[] = [
  {
    id: "ALD-001",
    given: { p1_autonomie: AUTONOME, ...ALD },
    expect: { p1_ald_validee: false, cible_cas_final: NON_ELIGIBLE },
  },
  {
    id: "ALD-002",
    given: { p1_autonomie: PROCHE, ...ALD },
    expect: {
      p1_ald_incapacite_ou_deficience: true,
      p1_ald_validee: true,
      cible_transport_sanitaire_prescrit:
        "véhicule personnel ou transport en commun",
      cible_cas_final: PMT,
    },
  },
  {
    id: "ALD-003",
    given: { p1_autonomie: AUTONOME, ...ALD, p1_m0_seance: "oui" },
    expect: {
      p1_ald_incapacite_ou_deficience: false,
      p1_ald_validee: true,
      cible_cas_final: PMT,
    },
  },
  {
    id: "PRESTA-001",
    given: {
      p1_autonomie: PRO,
      p1_critere_oxygene: "oui",
      p2_prestation_prise_en_charge_assurance_maladie: "non",
    },
    expect: {
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_cas_final: "prestation non prise en charge par l’Assurance Maladie",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "MOTIF-001",
    given: { p1_autonomie: PRO, p1_critere_aucune_situation: "oui" },
    expect: {
      cible_transport_sanitaire_prescrit: VSL,
      p2_motif_ouvrant_droit: false,
      cible_cas_final: NON_ELIGIBLE,
    },
  },
  {
    id: "AMBULANCE-001",
    given: { p1_autonomie: PRO, p1_critere_oxygene: "oui", ...HOSPITALISATION },
    expect: {
      cible_transport_sanitaire_prescrit: "ambulance",
      p2_accord_prealable_requis: false,
      cible_cas_final: PMT,
    },
  },
  {
    id: "SERIE-001",
    given: {
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      ...HOSPITALISATION,
      p2_nombre_transports_prevus: "4",
      p2_chaque_trajet_aller_superieur_50km: "oui",
    },
    expect: {
      p2_transport_en_serie: true,
      p2_transport_serie_declenche_dap: true,
      cible_cas_final: DAP,
    },
  },
  {
    id: "SERIE-002",
    given: {
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      ...ALD,
      p1_m0_seance: "oui",
      p2_nombre_transports_prevus: "4",
      p2_chaque_trajet_aller_superieur_50km: "oui",
    },
    expect: {
      p2_transport_en_serie: true,
      p2_transport_serie_declenche_dap: false,
      cible_cas_final: PMT,
    },
  },
  {
    id: "A3.3-001",
    given: {
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      ...HOSPITALISATION,
      p2_nombre_transports_prevus: "3",
      p2_chaque_trajet_aller_superieur_50km: "oui",
    },
    expect: { p2_transport_en_serie: false, cible_cas_final: PMT },
  },
  {
    id: "A3.3-002",
    given: {
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      ...HOSPITALISATION,
      p2_nombre_transports_prevus: "4",
      p2_chaque_trajet_aller_superieur_50km: null,
    },
    expect: { cible_resultat_2_affichable: false },
  },
  {
    id: "ARTICLE80-001",
    given: {
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      ...HOSPITALISATION,
      p2_patient_hospitalise: "oui",
    },
    expect: {
      p2_transport_charge_etablissement: true,
      p2_article_80_situation_specifique: false,
      cible_cas_final: CHARGE_ETABLISSEMENT,
    },
  },
  {
    id: "ARTICLE80-002",
    given: {
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      ...HOSPITALISATION,
      p2_patient_hospitalise: "oui",
      p2_exception_admission_had: "oui",
      p2_exception_aucune: "non",
      p2_detenu_hospitalise: "oui",
      p2_detenu_inter_etablissements: "oui",
    },
    expect: {
      p2_article_80_situation_specifique: true,
      cible_cas_final: CHARGE_ETABLISSEMENT,
    },
  },
  {
    id: "ARTICLE80-003",
    given: {
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      ...HOSPITALISATION,
      p2_patient_hospitalise: "oui",
      p2_exception_admission_had: "oui",
      p2_exception_aucune: "non",
      p2_detenu_hospitalise: "oui",
      p2_detenu_uhsa_uhsi: "oui",
    },
    expect: {
      p2_article_80_situation_specifique: true,
      cible_cas_final: CHARGE_ETABLISSEMENT,
    },
  },
  {
    id: "PENITENTIAIRE-001",
    given: {
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      p2_contexte_retour_penitentiaire: "oui",
      p2_contexte_aucun: "non",
      p2_patient_hospitalise: "oui",
    },
    expect: {
      p2_transport_charge_etablissement: false,
      cible_cas_final: PMT,
      cible_regime_financement: "Assurance Maladie",
    },
  },
  {
    id: "ADDRESS-001",
    given: {
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      ...HOSPITALISATION,
      p2_depart_adresse: null,
    },
    expect: {
      p2_adresses_obligatoires_completes: false,
      cible_resultat_2_affichable: false,
    },
  },
  {
    id: "A4.1-001",
    given: {
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      ...HOSPITALISATION,
      p2_trajet_aller_retour: "'aller-retour différent'",
    },
    expect: { cible_resultat_2_affichable: true, cible_cas_final: PMT },
  },
];

describe("modèle v9.1 — matrice de non-régression du livrable", () => {
  for (const cas of matrice) {
    it(cas.id, () => {
      const moteur = evalue(cas.given);
      for (const [regle, attendu] of Object.entries(cas.expect))
        expect(moteur.evaluate(regle).nodeValue, `${cas.id} — ${regle}`).toBe(
          attendu,
        );
    });
  }
});
