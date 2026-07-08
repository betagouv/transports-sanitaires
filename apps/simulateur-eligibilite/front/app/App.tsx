// Racine de l'app : **écran-porte** d'identification devant le simulateur. Tant
// que le prescripteur n'est pas identifié, seul l'écran d'identification s'affiche
// — impossible de simuler sans s'être identifié (voir
// docs/architecture/identification.md — ADR-1).
//
// À la validation, on convertit la sélection en contexte pseudonymisé via l'API
// (`fetchContexte`), on le range en session (pour Matomo), puis on bascule sur le
// simulateur. Un échec de l'API n'empêche pas d'entrer (contexte `null` : suivi
// analytics dégradé).

import { useState } from "react";
import { Identification } from "../identification/Identification";
import { Simulateur } from "../simulateur/Simulateur";
import { referentielHttp } from "../identification/referentiel-http";
import { fetchContexte } from "../contexte/contexte-http";
import { setSessionContexte } from "../contexte/session";
import type { Contexte } from "../../shared/contexte";
import type { Referentiel } from "../../shared/referentiel";
import type { Selection } from "../../shared/selection";

type Props = {
  // Injectables pour les tests (défauts = production same-origin).
  referentiel?: Referentiel;
  resoudreContexte?: (sel: Selection) => Promise<Contexte | null>;
};

export function App({
  referentiel = referentielHttp,
  resoudreContexte = fetchContexte,
}: Props = {}) {
  const [identifie, setIdentifie] = useState(false);

  async function handleValide(sel: Selection) {
    setSessionContexte(await resoudreContexte(sel));
    setIdentifie(true);
  }

  if (!identifie) {
    return <Identification referentiel={referentiel} onValide={handleValide} />;
  }
  return <Simulateur />;
}
