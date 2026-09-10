// DAP S3139h, Cerfa 11575*08 — pages 2 à 4 du PDF, volets 1 à 3. Les rubriques
// telles que le YAML documentaire de la v9.7 les décrit.
//
// La DAP porte deux choses que le PMT n'a pas : les motifs qui la rendent
// nécessaire, en ①, et la sous-situation qui accompagne un transport par avion
// ou bateau, dans la même rubrique. Le livrable prévient : « ne pas renseigner
// une sous-situation aérienne sans transport aérien ».

import type { Rubrique } from "./case-de-formulaire";
import {
  ACCIDENT_CAUSE_PAR_UN_TIERS,
  EXONERATION_DU_TICKET_MODERATEUR,
  MODE_DE_TRANSPORT,
  TRAJET,
  URGENCE,
  VOLET_MEDICAL,
} from "./rubriques-communes";

export const RUBRIQUES_DAP: readonly Rubrique[] = [
  ACCIDENT_CAUSE_PAR_UN_TIERS,
  {
    titre: "Rubrique ① — situation nécessitant un accord préalable",
    icone: "fr-icon-health-book-line",
    // Le SAMSAH n'a pas de case à lui : le livrable le range dans les éléments
    // d'ordre médical du volet 1, et met en garde — « ne pas utiliser la case
    // CAMSP/CMPP pour SAMSAH ». Jusqu'à la v9.5.1 le produit en listait une, qui
    // ne correspondait à rien sur le papier.
    cases: [
      {
        id: "longue_distance",
        libelle: "Transport à plus de 150 km.",
        source: "cible_dap_motif_longue_distance",
      },
      {
        id: "serie",
        libelle: "Transports en série.",
        source: "cible_dap_motif_serie",
      },
      {
        id: "camsp_cmpp",
        libelle: "Transport vers un CAMSP ou un CMPP.",
        source: "cible_dap_motif_camsp_cmpp",
      },
      {
        id: "engagement_maternite",
        libelle: "Transport Engagement maternité.",
        source: "cible_dap_motif_engagement_maternite",
      },
      {
        id: "avion_bateau",
        libelle: "Transport par avion ou bateau de ligne régulière.",
        source: "cible_dap_motif_avion_bateau",
      },
    ],
  },
  {
    titre: "Rubrique ① — sous-situation avion ou bateau",
    icone: "fr-icon-ship-2-line",
    cases: [
      {
        id: "air_accompagnant",
        libelle: "Personne accompagnante sur la ligne avion ou bateau.",
        source: "cible_avion_bateau_accompagnant",
      },
      {
        id: "air_hospitalisation",
        libelle: "Hospitalisation ou séances.",
        source: "cible_situation_hospitalisation",
        quand: { toutes: ["cible_dap_motif_avion_bateau"] },
      },
      {
        id: "air_ald_exo",
        libelle: "ALD (Affection de Longue Durée) exonérante.",
        source: "cible_ald_exonerante",
        quand: { toutes: ["cible_dap_motif_avion_bateau", "p1_ald_validee"] },
      },
      {
        id: "air_ald_non_exo",
        libelle: "ALD (Affection de Longue Durée) non exonérante.",
        source: "cible_ald_non_exonerante",
        quand: { toutes: ["cible_dap_motif_avion_bateau", "p1_ald_validee"] },
      },
      {
        id: "air_atmp",
        libelle: "Accident du travail ou maladie professionnelle.",
        source: "cible_situation_at_mp",
        quand: { toutes: ["cible_dap_motif_avion_bateau"] },
      },
      {
        id: "air_atmp_date",
        libelle: "Date de l’accident du travail ou de la maladie",
        source: "cible_date_at_mp",
        rendu: "date",
        quand: {
          toutes: ["cible_dap_motif_avion_bateau", "cible_situation_at_mp"],
        },
      },
    ],
  },
  {
    titre: "Rubrique ② — mode de transport",
    icone: "fr-icon-car-line",
    cases: [
      ...MODE_DE_TRANSPORT,
      // Sous les modes, et sur la DAP seulement : le lien avec le droit qui
      // ouvre la prise en charge se redéclare ici, indépendamment de la
      // sous-situation aérienne.
      {
        id: "lien_ald",
        libelle:
          "Transport en lien avec une ALD (Affection de Longue Durée) exonérante.",
        source: "cible_ald_exonerante",
      },
      {
        id: "lien_atmp",
        libelle:
          "Transport en lien avec un accident du travail ou une maladie professionnelle.",
        source: "cible_situation_at_mp",
      },
      {
        id: "lien_atmp_date",
        libelle: "Date de l’accident du travail ou de la maladie",
        source: "cible_date_at_mp",
        rendu: "date",
        quand: { toutes: ["cible_situation_at_mp"] },
      },
    ],
  },
  {
    titre: "Rubrique ② — trajet, nombre et urgence",
    icone: "fr-icon-road-map-line",
    cases: [
      ...TRAJET,
      {
        id: "nombre",
        libelle: "Nombre de transports",
        source: "cible_nombre_transports_document",
        rendu: "nombre",
      },
      ...URGENCE,
    ],
  },
  {
    titre: "Rubrique ③ — volet 1 exclusivement",
    icone: "fr-icon-stethoscope-line",
    cases: VOLET_MEDICAL,
  },
  {
    titre: "Rubrique ④ — exonération du ticket modérateur",
    icone: "fr-icon-money-euro-circle-line",
    cases: EXONERATION_DU_TICKET_MODERATEUR,
  },
];
