// TS973-11 : une adresse déjà saisie perd son sens si le lieu qu'elle décrit
// devient déduit d'un autre type entre deux saisies, ou cesse de l'être (un
// motif qui ne le déduit plus rouvre la question, sans réponse ; l'adresse
// visée par l'ancienne déduction resterait alors attachée à un lieu qu'elle
// ne décrit plus). Le prescripteur doit resaisir, pas hériter d'une adresse
// qui ne correspond plus au lieu affiché.
//
// Ne porte que sur un lieu **déduit**, dans l'une des deux situations : un
// simple changement de réponse (EHPAD vers Domicile, par ex.) reste sous
// `trajet-domicile.ts`, qui gère déjà le seul conflit qu'un trajet répondu
// peut produire (deux domiciles).

import type Engine from "publicodes";
import type { Situation } from "publicodes";
import { moteur, texte } from "../moteur";
import { estDeduit } from "./lieu-deduit";

// Le type répondu part avec l'adresse : un retour pénitentiaire retiré laisse
// sinon « Établissement pénitentiaire » en réponse à une question qui
// redevient posée, et que le parcours ne repose pas (TR-CTX-4).
const ADRESSE_DEPART = [
  "p2_trajet_depart",
  "p2_depart_nom_lieu",
  "p2_depart_adresse",
  "p2_depart_complement_adresse",
  "p2_depart_code_postal",
  "p2_depart_commune",
  "p2_depart_pays",
] as const;

const ADRESSE_ARRIVEE = [
  "p2_trajet_arrivee",
  "p2_arrivee_nom_lieu",
  "p2_arrivee_adresse",
  "p2_arrivee_complement_adresse",
  "p2_arrivee_code_postal",
  "p2_arrivee_commune",
  "p2_arrivee_pays",
] as const;

// Les seules réponses dont dépendent `p2_type_depart_deduit`/
// `p2_type_arrivee_deduit` et la valeur déduite (cf. `lieu-deduit.ts`).
// Aucune d'elles inchangée entre deux saisies garantit qu'aucune déduction
// n'a pu changer : sortir sur ce seul test évite tout appel moteur pour la
// quasi-totalité des saisies du parcours, qui ne les touchent pas.
const CHAMPS_DECLENCHEURS = [
  "p2_raison_principale",
  "p2_exception_admission_had",
  "p2_exception_retour_penitentiaire",
  "p2_contexte_retour_penitentiaire",
] as const;

/**
 * Retire l'adresse d'un côté dont le lieu déduit a changé de type, dans un
 * sens ou dans l'autre, entre `situationPrecedente` et `situation`. Les deux
 * doivent déjà porter les entrées calculées : c'est de leur cohérence que
 * dépend la comparaison.
 *
 * `surApres` doit déjà positionner `moteur` sur `situation` : c'est
 * `avecCalculs` qui le fait, pour ne payer qu'une fois le coût de
 * `setSituation` sur la saisie la plus fréquente du parcours. Cette fonction
 * garantit en retour `moteur` positionné sur la situation qu'elle renvoie,
 * donc l'appelant n'a jamais à le repositionner lui-même après l'appel.
 */
export function avecLieuInvalide(
  surApres: Engine,
  situation: Situation<string>,
  situationPrecedente: Situation<string>,
): Situation<string> {
  if (CHAMPS_DECLENCHEURS.every((c) => situation[c] === situationPrecedente[c]))
    return situation;

  const departApresDeduit = estDeduit(surApres, "p2_trajet_depart");
  const arriveeApresDeduit = estDeduit(surApres, "p2_trajet_arrivee");
  const departApres = texte(surApres, "cible_lieu_depart_type");
  const arriveeApres = texte(surApres, "cible_lieu_arrivee_type");

  const surAvant = moteur.setSituation(situationPrecedente);
  const departAvantDeduit = estDeduit(surAvant, "p2_trajet_depart");
  const arriveeAvantDeduit = estDeduit(surAvant, "p2_trajet_arrivee");
  const departAvant = texte(surAvant, "cible_lieu_depart_type");
  const arriveeAvant = texte(surAvant, "cible_lieu_arrivee_type");

  let resultat = situation;
  if (aEffacer(departAvantDeduit, departApresDeduit, departAvant, departApres))
    resultat = sansChamps(resultat, ADRESSE_DEPART);
  if (
    aEffacer(arriveeAvantDeduit, arriveeApresDeduit, arriveeAvant, arriveeApres)
  )
    resultat = sansChamps(resultat, ADRESSE_ARRIVEE);
  // `moteur` est resté positionné sur `situationPrecedente` depuis la
  // comparaison : le remettre sur le résultat tient la garantie ci-dessus.
  moteur.setSituation(resultat);
  return resultat;
}

// ---- implémentation ----

// Un lieu déduit avant ou après la saisie, dont le type a changé. Ou un lieu
// qui cesse d'être déduit : il perd toujours ce qui lui était répondu, car la
// réponse, masquée tant qu'il était déduit, n'a pas été confirmée pour le
// trajet actuel.
function aEffacer(
  avantDeduit: boolean,
  apresDeduit: boolean,
  avant: string,
  apres: string,
): boolean {
  if (avantDeduit && !apresDeduit && avant !== "") return true;
  return (avantDeduit || apresDeduit) && aChange(avant, apres);
}

// Un lieu qui n'était pas encore tranché (page pas encore atteinte) n'a pas
// d'adresse à invalider : la comparaison ne porte que sur un type déjà connu.
function aChange(ancien: string, nouveau: string): boolean {
  return ancien !== "" && ancien !== nouveau;
}

function sansChamps(
  situation: Situation<string>,
  champs: readonly string[],
): Situation<string> {
  const copie = { ...situation };
  for (const champ of champs) delete copie[champ];
  return copie;
}
