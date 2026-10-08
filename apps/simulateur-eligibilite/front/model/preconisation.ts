// Des réponses aux faits : ce que les règles de l'éditeur reçoivent.
//
// Seule P1 établit des faits aujourd'hui. Q0.1 dit un besoin, pas un fait, et
// P2 n'est pas encore posée : `fait_p2_complete` reste à « non ».

import { type Answers, areAnswered } from "../socle";
import { AUCUN_FAIT, type Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";
import { faitsDuMode } from "./mode-de-transport";
import { P1 } from "./questionnaire";

export function faits(answers: Answers<Questions>): Faits {
  return {
    ...AUCUN_FAIT,
    ...faitsDuMode(answers),
    fait_p1_complete: areAnswered(P1.pages, answers),
  };
}
