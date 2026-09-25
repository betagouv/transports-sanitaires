// Le fait déduit d'un lieu de trajet (TS973-11) : quand le type de lieu n'est
// pas répondu mais déduit du reste du parcours (admission HAD, retour
// pénitentiaire, entrée/sortie d'hospitalisation, arrivée aux urgences), le
// prescripteur ne doit pas le voir comme une question. `ChampsDePage.tsx`
// l'affiche ici comme un fait, avec l'origine qui l'explique.

import type Engine from "publicodes";
import { inapplicable, texte, vrai } from "../moteur";

export type FaitDeduit = { valeur: string; origine: string };

/** Le lieu de départ déduit, ou `undefined` s'il reste une question. */
export function lieuDepartDeduit(
  moteurPositionne: Engine,
): FaitDeduit | undefined {
  if (!estDeduit(moteurPositionne, "p2_trajet_depart")) return undefined;
  return {
    valeur: texte(moteurPositionne, "cible_lieu_depart_type"),
    origine: origineDepart(moteurPositionne),
  };
}

/** Le lieu d'arrivée déduit, ou `undefined` s'il reste une question. */
export function lieuArriveeDeduit(
  moteurPositionne: Engine,
): FaitDeduit | undefined {
  if (!estDeduit(moteurPositionne, "p2_trajet_arrivee")) return undefined;
  return {
    valeur: texte(moteurPositionne, "cible_lieu_arrivee_type"),
    origine: origineArrivee(moteurPositionne),
  };
}

/**
 * Le type de lieu est-il déduit du parcours plutôt que répondu ? Utile hors
 * de ce module à `invalidation-lieu.ts`, qui ne recalcule une adresse que
 * pour un lieu devenu déduit, pas pour un simple changement de réponse (déjà
 * géré par `trajet-domicile.ts`).
 */
export function estDeduit(
  moteurPositionne: Engine,
  question: "p2_trajet_depart" | "p2_trajet_arrivee",
): boolean {
  return inapplicable(moteurPositionne, question);
}

// ---- implémentation ----
//
// Pour l'arrivée, le même ordre de priorité que `p2_lieu_arrivee_type_effectif`
// (regles.publicodes) : l'admission HAD et le retour pénitentiaire l'emportent
// sur la raison principale. Le départ, lui, n'a qu'une seule valeur déduite
// (« Structure de soins », quelle qu'en soit la cause) : `p2_lieu_depart_type_effectif`
// ne distingue pas les causes entre elles, donc l'ordre ci-dessous pour
// `origineDepart` est un choix de ce module, pas une priorité du modèle. Le
// retour pénitentiaire se lit sur les deux questions qui le déclarent plutôt
// que sur `p2_retour_penitentiaire_effectif`, absente du contrat pour rester
// sous la limite de taille de ce fichier.

function retourPenitentiaire(moteurPositionne: Engine): boolean {
  return (
    vrai(moteurPositionne, "p2_exception_retour_penitentiaire") ||
    vrai(moteurPositionne, "p2_contexte_retour_penitentiaire")
  );
}

function origineDepart(moteurPositionne: Engine): string {
  if (vrai(moteurPositionne, "p2_exception_admission_had"))
    return "de l’admission en hospitalisation à domicile";
  if (retourPenitentiaire(moteurPositionne))
    return "du retour vers un établissement pénitentiaire";
  return "de la sortie d’hospitalisation";
}

function origineArrivee(moteurPositionne: Engine): string {
  if (vrai(moteurPositionne, "p2_exception_admission_had"))
    return "de l’admission en hospitalisation à domicile";
  if (retourPenitentiaire(moteurPositionne))
    return "du retour vers un établissement pénitentiaire";
  if (
    texte(moteurPositionne, "p2_raison_principale") ===
    "Entrée en hospitalisation"
  )
    return "de l’entrée en hospitalisation";
  return "du transport vers un service d’urgences";
}
