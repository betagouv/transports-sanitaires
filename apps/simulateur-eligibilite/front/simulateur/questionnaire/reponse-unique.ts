// Une réponse posée à une question simple, complétée des nettoyages qu'un
// changement peut demander : les réponses en aval d'un transfert requalifié
// (`transfert-requalifie.ts`), l'arrivée Domicile devenue invalide
// (`trajet-domicile.ts`), et une convocation déjà caractérisée qui doit
// reposer sa mosaïque (`convocation-revalidation.ts`). Séparé de
// `passation.ts` pour que les trois nettoyages composent sans y allonger la
// fonction `repondre`.

import type { FormState } from "@publicodes/forms";
import { formBuilder } from "./constructeur-de-formulaire";
import { avecConvocationRequalifiee } from "./convocation-revalidation";
import { avecArriveeDomicileEffacee } from "./trajet-domicile";
import { avecTransfertRequalifie } from "./transfert-requalifie";

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
  return avecTransfertRequalifie(
    id,
    précédente,
    avecConvocationRequalifiee(
      id,
      précédente,
      avecArriveeDomicileEffacee(id, valeur, apres),
    ),
  );
}
