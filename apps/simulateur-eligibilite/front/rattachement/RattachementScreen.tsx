// L'écran de rattachement, branché : le formulaire de `RattachementForm.tsx`, et ce
// que sa validation déclenche avant de rendre la main à `App`.
//
// À la validation, on range le rattachement saisi en session (pour Matomo), on
// déclare au serveur un éventuel service saisi sous « Autre », sans attendre sa
// réponse, puis on prévient `App`, qui ouvre l'écran suivant.
//
// Seul un service saisi sous « Autre » apprend quelque chose au référentiel :
// c'est le seul cas déclaré au serveur. Le rattachement dégradé
// « Autre / Autre » n'en fait pas partie, le référentiel étant alors injoignable.

import type { RattachementSaisi } from "../../shared/rattachement-saisi";
import type { Referentiel } from "../../shared/referentiel";
import { declarerViaApi } from "./declaration-http";
import { type AccesRattachement, RattachementForm } from "./RattachementForm";
import { referentielHttp } from "./referentiel-http";
import { rangerRattachement } from "./session";

type Props = {
  // Injectables pour les tests (défauts = production same-origin).
  referentiel?: Referentiel;
  declarer?: (saisie: RattachementSaisi) => void;
  onRattache: (acces: AccesRattachement) => void;
};

export function RattachementScreen({
  referentiel = referentielHttp,
  declarer = declarerViaApi,
  onRattache,
}: Props) {
  return (
    <RattachementForm
      referentiel={referentiel}
      onValide={(saisie, acces) => {
        rangerRattachement(saisie);
        if (saisie.serviceEstAutre) declarer(saisie);
        onRattache(acces);
      }}
    />
  );
}
