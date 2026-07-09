// Racine de l'app : **écran-porte** d'identification devant le simulateur. Tant
// que le prescripteur n'est pas identifié, seul l'écran d'identification s'affiche
// — impossible de simuler sans s'être identifié (voir
// docs/architecture/identification.md — ADR-1).
//
// À la validation, on convertit l'identité saisie en identité pseudonymisée via
// l'API (`pseudonymiserViaApi`), on la range en session (pour Matomo), puis on
// bascule sur le simulateur. Un échec de l'API n'empêche pas d'entrer (identité
// `null` : suivi analytics dégradé).

import { useState } from "react";
import { Identification } from "../identification/Identification";
import { Simulateur } from "../simulateur/Simulateur";
import { referentielHttp } from "../identification/referentiel-http";
import { pseudonymiserViaApi } from "../identite/pseudonymisation-http";
import { setIdentite } from "../identite/session";
import type { IdentitePseudonymisee } from "../../shared/identite-pseudonymisee";
import type { Referentiel } from "../../shared/referentiel";
import type { IdentiteSaisie } from "../../shared/identite-saisie";

type Props = {
  // Injectables pour les tests (défauts = production same-origin).
  referentiel?: Referentiel;
  pseudonymiser?: (saisie: IdentiteSaisie) => Promise<IdentitePseudonymisee | null>;
};

export function App({
  referentiel = referentielHttp,
  pseudonymiser = pseudonymiserViaApi,
}: Props = {}) {
  const [identifie, setIdentifie] = useState(false);

  async function handleValide(saisie: IdentiteSaisie) {
    setIdentite(await pseudonymiser(saisie));
    setIdentifie(true);
  }

  if (!identifie) {
    return <Identification referentiel={referentiel} onValide={handleValide} />;
  }
  return <Simulateur />;
}
