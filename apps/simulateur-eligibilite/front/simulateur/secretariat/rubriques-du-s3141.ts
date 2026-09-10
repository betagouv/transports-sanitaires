// S3141, Cerfa 16184*01 — page 2 du PDF. Le formulaire des permissions
// temporaires de sortie, apparu avec la v9.7 en même temps que le septième cas
// final. 55 lignes du mapping, comptées par `tests/cerfa/mapping.test.ts`.
//
// Il ne porte ni rubrique médicale, ni urgence, ni centre de référence, et le
// livrable le répète deux fois : « aucune rubrique éléments médicaux, urgence ou
// centre de référence sur S3141 », « ne pas en créer ». Il n'a pas non plus de
// cadre organisme, contrairement au PMT et à la DAP.

import type { Rubrique } from "./case-de-formulaire";
import { ACCIDENT_CAUSE_PAR_UN_TIERS } from "./rubriques-en-tete";
import { MODE_DE_TRANSPORT } from "./rubriques-mode-de-transport";
import {
  CADRE_TRANSPORTEUR,
  DATE_PRESCRIPTION,
  IDENTITE_PRESCRIPTEUR_ET_STRUCTURE,
  SIGNATURE_PRESCRIPTEUR,
} from "./rubriques-prescripteur";
import { EXONERATION_DU_TICKET_MODERATEUR } from "./rubriques-situation-medicale";
import { ADRESSES_DU_TRAJET, TRAJET } from "./rubriques-trajet";

export const RUBRIQUES_S3141: readonly Rubrique[] = [
  ACCIDENT_CAUSE_PAR_UN_TIERS,
  {
    titre: "Rubrique ① — hospitalisation",
    icone: "fr-icon-hotel-line",
    cases: [
      {
        id: "debut_hospitalisation",
        libelle: "Date de début d’hospitalisation",
        source: "cible_s3141_debut_hospitalisation",
        rendu: "date",
      },
    ],
  },
  {
    titre: "Rubrique ② — mode de transport",
    icone: "fr-icon-car-line",
    cases: MODE_DE_TRANSPORT,
  },
  {
    titre: "Rubrique ③ — trajet",
    icone: "fr-icon-road-map-line",
    cases: [...TRAJET, ...ADRESSES_DU_TRAJET],
  },
  {
    titre: "Rubrique ④ — périodicité des permissions",
    icone: "fr-icon-calendar-line",
    cases: [
      // Un aller-retour compte pour deux trajets. L'éditeur marque la case
      // `provisional` : l'unité exacte attendue reste à confirmer avec la CNAM,
      // et il l'inscrit dans ses réserves plutôt que de la trancher seul.
      {
        id: "nombre",
        libelle: "Nombre de trajets par mois",
        source: "cible_s3141_nombre_trajets_mois",
        rendu: "nombre",
      },
      {
        id: "periode_fin",
        libelle: "Permissions prescrites jusqu’au",
        source: "cible_s3141_periode_fin",
        rendu: "date",
      },
    ],
  },
  {
    titre: "Rubrique ⑤ — lien avec une ALD ou un accident du travail",
    icone: "fr-icon-health-book-line",
    cases: [
      {
        id: "lien_ald",
        libelle:
          "Transport en lien avec une ALD (Affection de Longue Durée) exonérante.",
        source: "cible_ald_exonerante",
        quand: { toutes: ["p1_ald_validee"] },
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
    titre: "Rubrique ⑥ — exonération du ticket modérateur",
    icone: "fr-icon-money-euro-circle-line",
    cases: EXONERATION_DU_TICKET_MODERATEUR,
  },
  {
    titre: "Bloc prescripteur et structure",
    icone: "fr-icon-user-line",
    cases: [
      ...IDENTITE_PRESCRIPTEUR_ET_STRUCTURE,
      ...DATE_PRESCRIPTION,
      ...SIGNATURE_PRESCRIPTEUR,
      ...CADRE_TRANSPORTEUR,
    ],
  },
];
