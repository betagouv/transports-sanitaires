// Le résultat de `ISSUE_NON_ELIGIBLE` (#134) : la fiche patient négative. Il
// charge les textes de l'éditeur à la demande, calcule la trace des réponses,
// puis montre la fiche.

import type { Answers } from "../../socle";
import { AvecLeCatalogue } from "./AvecLeCatalogue";
import type { Cibles } from "./declarations/cibles";
import type { Questions } from "./declarations/questions";
import { FicheNegative } from "./FicheNegative";
import { texteDeLaFicheNegative } from "./texte-de-la-fiche-negative";
import { traceDuResultat } from "./trace-du-resultat";

type Props = { answers: Answers<Questions>; cibles: Cibles };

export function ResultatNegatif({ answers, cibles }: Props) {
  return (
    <AvecLeCatalogue>
      {(catalogue) => (
        <FicheNegative
          texte={texteDeLaFicheNegative(
            catalogue,
            traceDuResultat(answers, cibles),
          )}
        />
      )}
    </AvecLeCatalogue>
  );
}
