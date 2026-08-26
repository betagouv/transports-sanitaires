// L'accord préalable et le trajet, part de la matrice de non-régression du
// livrable v9.5.1 (tmp/9.5.1/…/transports-sanitaires.tests.v9-5-1.yaml).
//
// Ce qui fait basculer une prescription en demande d'accord préalable : la série
// de transports et son exception ALD, le nombre exact saisi en A3.2, la distance,
// puis ce que le trajet exige avant que le résultat s'affiche. Et, depuis la
// v9.5.1, ce qui dispense d'attendre la décision : l'urgence médicale attestée,
// qui ne supprime pas le document mais bien l'attente. Le droit ouvert est dans
// `regression-v9-5-1.test.ts`, la charge de l'établissement dans
// `article-80-v9-5-1.test.ts`.

import { describe } from "vitest";
import { type Cas, rejouerLaMatrice } from "./matrice";
import {
  ALD,
  DAP,
  HOSPITALISATION,
  PMT,
  PRO,
  type Reponses,
} from "./situations-v9-5-1";

// Le fond des scénarios d'urgence : un VSL sur entrée d'hospitalisation, auquel
// chaque cas ajoute son motif de DAP — ou n'en ajoute aucun.
const VSL_HOSPITALISATION: Reponses = {
  p1_autonomie: PRO,
  p1_critere_hygiene_desinfection: "oui",
  ...HOSPITALISATION,
};

// Les deux réponses d'A4.5 qui attestent l'urgence, mot pour mot.
const SAMU = "'Appel au SAMU (Service d’Aide Médicale Urgente) - Centre 15'";
const AUTRE_URGENCE =
  "'Autre urgence médicale attestée par le médecin prescripteur'";

// Le fond des scénarios A3.2 : un VSL sur entrée d'hospitalisation, dont chaque
// trajet aller dépasse 50 km. Seul le nombre de transports y varie.
const SERIE_50KM: Reponses = {
  p1_autonomie: PRO,
  p1_critere_hygiene_desinfection: "oui",
  ...HOSPITALISATION,
  p2_chaque_trajet_aller_superieur_50km: "oui",
};

// `null` retire la clé de la situation : voir `Reponses` dans `situations-v9-5-1`.
const matrice: Cas[] = [
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
    // La v9.4.0 renverse l'ordre : A3.4 précède désormais A3.3. C'est donc la
    // réponse à A3.3 qu'une situation ne doit plus faire compter tant qu'A3.4
    // reste sans réponse — `p2_chaque_trajet_aller_superieur_50km` exige
    // `p2_situations_accord_prealable_repondues` pour être applicable.
    id: "A3.3-002",
    given: {
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      ...HOSPITALISATION,
      p2_nombre_transports_prevus: "4",
      p2_special_avion_bateau: null,
      p2_special_camsp_cmpp: null,
      p2_special_engagement_maternite: null,
      p2_special_samsah: null,
      p2_special_aucune: null,
      p2_chaque_trajet_aller_superieur_50km: "oui",
    },
    expect: {
      // Répondue « oui » dans la situation : sans la neutralisation elle
      // vaudrait `true`. Non applicable, elle ne vaut plus rien.
      p2_chaque_trajet_aller_superieur_50km: undefined,
      cible_resultat_2_affichable: false,
    },
  },
  // NOMBRE-001 : le nombre exact saisi en A3.2, et ce qu'il déclenche. La cible
  // est née avec la v9.5.0 pour que le document reprenne le chiffre sans que
  // l'application aille le relire dans les réponses.
  {
    id: "NOMBRE-001 · 1 transport",
    given: { ...SERIE_50KM, p2_nombre_transports_prevus: "1" },
    expect: {
      cible_nombre_transports_prevus: 1,
      p2_transport_en_serie: false,
      cible_cas_final: PMT,
    },
  },
  {
    id: "NOMBRE-001 · 3 transports",
    given: { ...SERIE_50KM, p2_nombre_transports_prevus: "3" },
    expect: {
      cible_nombre_transports_prevus: 3,
      p2_transport_en_serie: false,
      cible_cas_final: PMT,
    },
  },
  {
    id: "NOMBRE-001 · 4 transports",
    given: { ...SERIE_50KM, p2_nombre_transports_prevus: "4" },
    expect: {
      cible_nombre_transports_prevus: 4,
      p2_transport_en_serie: true,
      cible_dap_motif_serie: true,
      cible_cas_final: DAP,
    },
  },
  {
    // L'exception ALD ne neutralise que la cause « série » : la longue distance
    // reste une cause de DAP à elle seule, ALD validée ou non.
    id: "NOMBRE-001 · 5 transports, ALD validée et plus de 150 km",
    given: {
      ...SERIE_50KM,
      ...ALD,
      p1_m0_seance: "oui",
      p2_nombre_transports_prevus: "5",
      p2_distance_aller_superieure_150km: "oui",
    },
    expect: {
      cible_nombre_transports_prevus: 5,
      cible_dap_motif_serie: false,
      cible_dap_motif_longue_distance: true,
      cible_cas_final: DAP,
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
  // Les quatre scénarios d'urgence de la v9.5.1. Le document ne bouge pas — une
  // cause réglementaire de DAP reste une DAP — mais l'attente disparaît, et avec
  // elle le délai de 15 jours.
  {
    id: "URGENCE-001",
    given: { ...VSL_HOSPITALISATION, p2_transport_urgence: SAMU },
    expect: {
      cible_urgence_attestee: true,
      cible_type_urgence: "appel SAMU - Centre 15",
      cible_attente_accord_prealable_requise: false,
      cible_cas_final: PMT,
    },
  },
  {
    id: "URGENCE-002",
    given: {
      ...VSL_HOSPITALISATION,
      p2_distance_aller_superieure_150km: "oui",
      p2_transport_urgence: SAMU,
    },
    expect: {
      cible_urgence_attestee: true,
      cible_attente_accord_prealable_requise: false,
      cible_cas_final: DAP,
    },
  },
  {
    id: "URGENCE-003",
    given: {
      ...VSL_HOSPITALISATION,
      p2_special_camsp_cmpp: "oui",
      p2_special_aucune: "non",
      p2_transport_urgence: AUTRE_URGENCE,
    },
    expect: {
      cible_type_urgence: "autre urgence médicale attestée",
      cible_attente_accord_prealable_requise: false,
      cible_dap_motif_camsp_cmpp: true,
      cible_cas_final: DAP,
    },
  },
  {
    id: "URGENCE-004",
    given: {
      ...VSL_HOSPITALISATION,
      p2_distance_aller_superieure_150km: "oui",
    },
    expect: {
      cible_urgence_attestee: false,
      cible_type_urgence: "aucune",
      cible_attente_accord_prealable_requise: true,
      cible_cas_final: DAP,
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

describe("modèle v9.5.1 — l’accord préalable et le trajet", () => {
  rejouerLaMatrice(matrice);
});
