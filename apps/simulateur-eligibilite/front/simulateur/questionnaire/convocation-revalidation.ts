// `state.convocation_route_revalidation` du contrat v9.7.1 : une convocation
// déjà caractérisée (CONV-AP — plus de 150 km, avion ou bateau) dont le trajet
// change réellement doit reposer la mosaïque plutôt que de garder des
// caractéristiques établies pour un autre trajet. Le modèle ne le recalcule
// pas de lui-même — les trois réponses restent celles données une fois —, donc
// ce nettoyage vit ici, côté application, sur le même principe que
// `trajet-domicile.ts`.
//
// Portée aux trois questions à choix unique du trajet (départ, arrivée,
// organisation) : les douze saisies d'adresse, tapées caractère par caractère,
// n'ont pas de moment de confirmation atomique où comparer un « avant » et un
// « après » sans redéclencher la requalification à chaque frappe. Pas de
// reprise durable non plus (`clinical_criteria_revision`,
// `restore_revalidation`) : hors périmètre, `sessionStorage` seulement.
//
// Effacer les trois réponses ne suffit pas à les faire reposer : CONV-AP est
// **avant** le trajet dans le parcours, et `computeNextFields`
// (`@publicodes/forms`) exclut d'office toute règle déjà portée par une page
// visitée — la marche normale, pour ne jamais reposer une page qu'on vient de
// quitter. Cette page-ci fait exception à dessein : elle est tronquée de
// l'historique et reprise comme page courante, pour que le prochain calcul la
// traite comme neuve.

import type { FormState } from "@publicodes/forms";
import { formBuilder } from "./constructeur-de-formulaire";

const CHAMPS_DU_TRAJET = [
  "p2_trajet_depart",
  "p2_trajet_arrivee",
  "p2_organisation_transports",
];

const CARACTERISTIQUES_DE_LA_CONVOCATION = [
  "p2_convocation_plus_150km",
  "p2_convocation_avion_bateau",
  "p2_convocation_aucune",
];

/**
 * Efface les caractéristiques d'une convocation déjà répondues quand `id`
 * change réellement de valeur — pas à la première réponse, ni à une réponse
 * identique à celle déjà en situation. `précédente` est la valeur d'avant,
 * lue par l'appelant avant que `handleInputChange` ne la remplace.
 */
export function avecConvocationRequalifiee(
  id: string,
  précédente: string | undefined,
  etatApres: FormState<string>,
): FormState<string> {
  if (!CHAMPS_DU_TRAJET.includes(id)) return etatApres;
  if (précédente === undefined || précédente === etatApres.situation[id])
    return etatApres;
  if (
    !CARACTERISTIQUES_DE_LA_CONVOCATION.some(
      (champ) => etatApres.situation[champ] !== undefined,
    )
  )
    return etatApres;
  const efface = CARACTERISTIQUES_DE_LA_CONVOCATION.reduce(
    (etat, champ) => formBuilder.handleInputChange(etat, champ, undefined),
    etatApres,
  );
  return avecPageConvApReprise(efface);
}

// ---- implémentation ----

/**
 * Tronque l'historique des pages visitées à celle de CONV-AP et la reprend
 * comme page courante : le prochain calcul de `computeNextFields` la traite
 * comme neuve, plutôt que de l'exclure parce qu'elle a déjà été montrée.
 */
function avecPageConvApReprise(etat: FormState<string>): FormState<string> {
  const index = etat.pages.findIndex((page) =>
    page.elements.includes("p2_convocation_plus_150km"),
  );
  if (index === -1) return etat;
  return {
    ...etat,
    pages: etat.pages.slice(0, index + 1),
    currentPageIndex: index,
  };
}
