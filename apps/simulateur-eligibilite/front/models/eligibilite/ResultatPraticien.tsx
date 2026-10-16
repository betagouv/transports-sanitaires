// Le résultat des cinq issues sans fiche patient (D-112). Il charge les textes
// de l'éditeur à la demande, calcule la trace des réponses, puis montre la
// page du praticien.

import type { Answers } from "../../socle";
import { AvecLeCatalogue } from "./AvecLeCatalogue";
import type { Cibles } from "./declarations/cibles";
import type { Questions } from "./declarations/questions";
import { PageDuPraticien } from "./PageDuPraticien";
import { type IssueSansFiche, texteDuPraticien } from "./texte-du-praticien";
import { traceDuResultat } from "./trace-du-resultat";

type Props = {
  answers: Answers<Questions>;
  cibles: Cibles;
  issue: IssueSansFiche;
};

export function ResultatPraticien({ answers, cibles, issue }: Props) {
  return (
    <AvecLeCatalogue>
      {(catalogue) => (
        <PageDuPraticien
          texte={texteDuPraticien(
            catalogue,
            issue,
            traceDuResultat(answers, cibles),
          )}
        />
      )}
    </AvecLeCatalogue>
  );
}
