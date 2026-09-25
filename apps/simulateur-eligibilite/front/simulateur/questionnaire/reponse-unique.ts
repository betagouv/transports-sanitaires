// Une réponse posée à une question simple, ou celles d'une mosaïque,
// complétées des nettoyages qu'un changement peut demander : les réponses en
// aval (`aval-invalide.ts`), l'arrivée Domicile devenue invalide
// (`trajet-domicile.ts`), et une convocation déjà caractérisée qui doit
// reposer sa mosaïque (`convocation-revalidation.ts`). Séparé de
// `passation.ts` pour que les nettoyages composent sans y allonger les
// fonctions `repondre` et `repondrePlusieurs`.

import type { FormState } from "@publicodes/forms";
import { avecAvalInvalide } from "./aval-invalide";
import { formBuilder } from "./constructeur-de-formulaire";
import { avecConvocationRequalifiee } from "./convocation-revalidation";
import { avecArriveeDomicileEffacee } from "./trajet-domicile";

type ValeurSaisie = string | number | boolean | undefined;

export function avecReponse(
  formState: FormState<string>,
  id: string,
  valeur: unknown,
): FormState<string> {
  // `handleInputChange` mute `formState` en place (sa propre implémentation
  // réassigne `formState.situation`) : la valeur précédente doit donc être
  // lue avant l'appel, jamais sur `formState` après.
  const précédente = formState.situation[id] as string | undefined;
  const apres = formBuilder.handleInputChange(
    formState,
    id,
    valeur as ValeurSaisie,
  );
  return avecAvalInvalide(
    [[id, précédente]],
    avecConvocationRequalifiee(
      id,
      précédente,
      avecArriveeDomicileEffacee(id, valeur, apres),
    ),
  );
}

/**
 * Plusieurs réponses booléennes en une passe, celles d'une mosaïque : à chaque
 * clic, l'option touchée et les autres figées (sinon indéfinies, donc non
 * répondues pour le moteur). Un changement réel invalide l'aval comme une
 * réponse unique.
 */
export function avecReponses(
  formState: FormState<string>,
  reponses: ReadonlyArray<readonly [string, boolean | undefined]>,
): FormState<string> {
  // Lues avant `handleInputChange`, qui mute l'état.
  const changements = reponses.map(
    ([id]) => [id, formState.situation[id]] as const,
  );
  let etat = formState;
  for (const [id, valeur] of reponses)
    etat = formBuilder.handleInputChange(etat, id, valeur);
  return avecAvalInvalide(changements, etat);
}
