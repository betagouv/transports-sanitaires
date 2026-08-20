// Ce que chaque partie du questionnaire doit déterminer.
//
// Le graphe de dépendances d'une cible décide des questions posées : ces deux
// listes sont, à elles seules, le découpage du parcours en Partie 1 (médicale)
// et Partie 2 (administrative). Elles se lisent côte à côte parce que la seconde
// se pose *par-dessus* la première — c'est ce qu'établit la passation chez un
// utilisateur, et ce que rejoue `questionnaire/rejeu.ts` pour une seed.

import type { Cible } from "./contrat-regles-publicodes";

// Décision médicale + sorties Partie 1 destinées au document : cibler ces
// sorties fait collecter leurs questions propres (sinon jamais posées, car
// applicables mais hors du graphe des cibles). Toutes sont P1 (aucune
// dépendance p2_*), donc aucune question Partie 2 ici.
export const CIBLES_MEDICALES = [
  "cible_transport_sanitaire_prescrit",
  "cible_partie_2_requise",
  "cible_transport_partage_incompatible",
] as const satisfies readonly Cible[];

// Le cas final et le document, plus les douze sorties qui portent les saisies
// d'adresse. Cibler ces sorties fait collecter leurs questions propres, et rien
// d'autre ne le ferait : le complément et le pays ne sont dans le graphe d'aucune
// autre cible — le CERFA les lit, et les recevait donc toujours vides. Quant aux
// huit obligatoires, la conjonction `p2_adresses_obligatoires_completes` les
// révélait **une par une** : publicodes n'évalue pas ce qui suit sa première
// condition non satisfaite, si bien qu'une seule adresse manquait à la fois — et
// qu'aucune pagination n'aurait pu les réunir.
export const CIBLES_ADMINISTRATIVES = [
  "cible_cas_final",
  "cible_document_a_remettre_au_patient",
  "cible_document_depart_nom",
  "cible_document_depart_adresse",
  "cible_document_depart_complement",
  "cible_document_depart_code_postal",
  "cible_document_depart_commune",
  "cible_document_depart_pays",
  "cible_document_arrivee_nom",
  "cible_document_arrivee_adresse",
  "cible_document_arrivee_complement",
  "cible_document_arrivee_code_postal",
  "cible_document_arrivee_commune",
  "cible_document_arrivee_pays",
] as const satisfies readonly Cible[];
