// Les faits que les pages de P2 avant la branche établissent : le mode, le
// trajet, la prestation, les contextes, le transfert, la permission et la
// convocation. La page de branche (Q2.12 à Q2.14) les lit pour savoir si l'une
// de ses questions est utile.

import type { Validated } from "../../socle";
import { faitsDesContextes } from "./contextes";
import { faitsDeLaConvocation } from "./convocation";
import { AUCUN_FAIT, type Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";
import { EXCLUSION_DU_TRANSPORT } from "./exclusion-du-transport";
import { faitsDuMode } from "./mode-de-transport";
import { faitsDeLaPermission } from "./permission";
import { faitsDeLaPrestation } from "./prestation";
import { faitsDuTrajet } from "./trajet";
import { faitsDuTransfert } from "./transfert";

export function faitsAvantLaBranche(validated: Validated<Questions>): Faits {
  return {
    ...AUCUN_FAIT,
    ...faitsDuMode(validated),
    ...faitsDuTrajet(validated),
    ...faitsDeLaPrestation(validated),
    ...faitsDesContextes(validated),
    // Après les contextes : un positif de Q2.5 ou Q2.6 l'emporte sur le « non » de Q2.2.1.
    ...faitsDuTransfert(validated),
    ...faitsDeLaPermission(validated),
    // Après les contextes : la branche de la convocation l'emporte sur le « À qualifier » de Q2.2.1.b.
    ...faitsDeLaConvocation(validated),
    fait_exclusion_transport_prouvee: EXCLUSION_DU_TRANSPORT,
  };
}
