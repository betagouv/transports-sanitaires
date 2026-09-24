// TS973-16 : changer la raison du déplacement, le transfert en cours ou la
// nature du transfert invalide les réponses qui en dépendaient. Les étapes
// suivantes se reposent, comme chez l'éditeur (« toute modification réelle
// invalide les seules étapes en aval »).
//
// Sans cela, une exception cochée pour un transfert provisoire resterait
// après le passage à « Définitif ». Le modèle l'ignore, mais la garde des
// déclarations la lit dans la situation brute et bloquerait le résultat.
//
// Effacer ne suffit pas : `@publicodes/forms` ne repose jamais une page déjà
// visitée. L'historique est donc tronqué à la page modifiée, sur le principe
// de `convocation-revalidation.ts`.

import type { FormState } from "@publicodes/forms";
import { formBuilder } from "./constructeur-de-formulaire";
import { champsEnAval } from "./etapes";

/**
 * Efface les réponses en aval de `id` quand `id` change réellement de valeur :
 * pas à la première réponse, ni à une réponse identique. `précédente` est la
 * valeur d'avant, lue par l'appelant avant `handleInputChange`.
 */
export function avecTransfertRequalifie(
  id: string,
  précédente: string | undefined,
  etatApres: FormState<string>,
): FormState<string> {
  if (!DECLENCHEURS.includes(id)) return etatApres;
  if (précédente === undefined || précédente === etatApres.situation[id])
    return etatApres;
  const repondus = champsEnAval(id).filter(
    (champ) => etatApres.situation[champ] !== undefined,
  );
  if (repondus.length === 0) return etatApres;
  const efface = repondus.reduce(
    (etat, champ) => formBuilder.handleInputChange(etat, champ, undefined),
    etatApres,
  );
  return avecPagesTronquees(efface, id);
}

// ---- implémentation ----

const DECLENCHEURS = [
  "p2_raison_principale",
  "p2_transfert_en_cours",
  "p2_nature_transfert",
];

// La page modifiée devient la dernière de l'historique : les suivantes se
// recalculent comme neuves.
function avecPagesTronquees(
  etat: FormState<string>,
  id: string,
): FormState<string> {
  const index = etat.pages.findIndex((page) => page.elements.includes(id));
  if (index === -1) return etat;
  return {
    ...etat,
    pages: etat.pages.slice(0, index + 1),
    currentPageIndex: index,
  };
}
