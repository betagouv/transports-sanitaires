// Des réponses aux faits : ce que les règles de l'éditeur reçoivent.
//
// Q0.1 dit un besoin, pas un fait. P1 établit ses faits, et P2 ceux de la
// prestation, des situations particulières, du trajet, du transfert, des
// exceptions de l'article 80, de la permission, de la convocation et de sa
// branche. L'exclusion du transport se constate sans question. P1 et P2 sont
// complètes quand toutes leurs questions posées ont leur réponse (D-110).

import type { Answers } from "../../socle";
import { areAnswered, type Validated } from "../../socle";
import { faitsDeLaBranche } from "./branche";
import type { Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";
import { faitsAvantLaBranche } from "./faits-avant-la-branche";
import { P2 } from "./partie-2";
import { P1 } from "./questionnaire";

export function faits(
  answers: Answers<Questions>,
  validated: Validated<Questions>,
): Faits {
  const complete = areAnswered(P1.pages, answers);
  return {
    ...faitsAvantLaBranche(validated),
    // Après les contextes : la branche l'emporte sur le « À qualifier » de Q2.2.1.b.
    ...faitsDeLaBranche(validated),
    fait_p1_complete: complete
      ? {
          value: true,
          provenance: "Toutes les questions de P1 ont leur réponse.",
        }
      : { value: false, provenance: "Une question de P1 attend sa réponse." },
    // Jamais « non » : une P2 incomplète ne dit pas que la décision est fausse.
    ...(areAnswered([...P1.pages, ...P2.pages], answers) && {
      fait_p2_complete: {
        value: true,
        provenance: "Toutes les questions de P1 et de P2 ont leur réponse.",
      },
    }),
  };
}
