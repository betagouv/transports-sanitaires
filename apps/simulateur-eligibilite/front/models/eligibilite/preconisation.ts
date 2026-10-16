// Des réponses aux faits : ce que les règles de l'éditeur reçoivent.
//
// Q0.1 dit un besoin, pas un fait. P1 établit ses faits, et P2 ceux de la
// prestation, des situations particulières, du trajet, du transfert, des
// exceptions de l'article 80 et de la permission. L'exclusion du transport se constate sans
// question. Les autres faits de P2 restent absents, et P2 n'est jamais tenue
// pour complète tant qu'elle n'est pas posée en entier.

import type { Answers } from "../../socle";
import { areAnswered, type Validated } from "../../socle";
import { faitsDesContextes } from "./contextes";
import { AUCUN_FAIT, type Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";
import { EXCLUSION_DU_TRANSPORT } from "./exclusion-du-transport";
import { faitsDuMode } from "./mode-de-transport";
import { faitsDeLaPermission } from "./permission";
import { faitsDeLaPrestation } from "./prestation";
import { P1 } from "./questionnaire";
import { faitsDuTrajet } from "./trajet";
import { faitsDuTransfert } from "./transfert";

export function faits(
  answers: Answers<Questions>,
  validated: Validated<Questions>,
): Faits {
  const complete = areAnswered(P1.pages, answers);
  return {
    ...AUCUN_FAIT,
    ...faitsDuMode(validated),
    ...faitsDuTrajet(validated),
    ...faitsDeLaPrestation(validated),
    ...faitsDesContextes(validated),
    // Après les contextes : un positif de Q2.5 ou Q2.6 l'emporte sur le « non » de Q2.2.1.
    ...faitsDuTransfert(validated),
    ...faitsDeLaPermission(validated),
    fait_exclusion_transport_prouvee: EXCLUSION_DU_TRANSPORT,
    fait_p1_complete: complete
      ? {
          value: true,
          provenance: "Toutes les questions de P1 ont leur réponse.",
        }
      : { value: false, provenance: "Une question de P1 attend sa réponse." },
  };
}
