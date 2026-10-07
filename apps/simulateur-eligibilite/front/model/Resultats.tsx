// Les deux résultats du modèle factice : la commande, puis la commande
// complétée.

import type { Answers } from "../socle";
import type { Cibles } from "./declarations/cibles";
import type { Questions } from "./declarations/questions";

type Props = { answers: Answers<Questions>; cibles: Cibles };

export function Commande({ cibles }: Props) {
  return <p className="fr-text--lead">Commande : {cibles.commande}</p>;
}

export function CommandeCompletee({ answers, cibles }: Props) {
  return (
    <p className="fr-text--lead">
      Commande : {cibles.commande}, {String(answers.quantite)} tasses
    </p>
  );
}
