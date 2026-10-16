// Le résultat de `ISSUE_PMT` et de `ISSUE_S3141` (#135) : la fiche patient
// positive. Il charge les textes de l'éditeur à la demande, calcule la trace
// des réponses, puis montre la fiche.

import type { Answers } from "../../socle";
import { AvecLeCatalogue } from "./AvecLeCatalogue";
import type { Cibles } from "./declarations/cibles";
import type { Questions } from "./declarations/questions";
import { FichePositive } from "./FichePositive";
import {
  type IssueAvecFichePositive,
  texteDeLaFichePositive,
} from "./texte-de-la-fiche-positive";
import { traceDuResultat } from "./trace-du-resultat";

type Props = {
  answers: Answers<Questions>;
  cibles: Cibles;
  issue: IssueAvecFichePositive;
};

export function ResultatPositif({ answers, cibles, issue }: Props) {
  return (
    <AvecLeCatalogue>
      {(catalogue) => {
        const texte = texteDeLaFichePositive(
          catalogue,
          traceDuResultat(answers, cibles),
          issue,
        );
        return texte ? <FichePositive texte={texte} /> : <SansMode />;
      }}
    </AvecLeCatalogue>
  );
}

// ---- implémentation ----

// Sans mode, les règles n'ont pas pu choisir le transport : un fait dont elles
// dépendent est absent.
function SansMode() {
  return (
    <p>
      Les réponses données ne suffisent pas à choisir le mode de transport : le
      questionnaire n’est pas complet.
    </p>
  );
}
