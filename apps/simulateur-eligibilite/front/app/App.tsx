// Racine de l'app : **écran-porte** d'identification devant les simulateurs.
// Tant que le prescripteur n'est pas identifié, seul l'écran d'identification
// s'affiche — impossible de simuler sans s'être identifié (voir
// docs/architecture/identification.md — ADR-1).
//
// À la validation, on convertit l'identité saisie en identité pseudonymisée via
// l'API (`pseudonymiserViaApi`), on la range en session (pour Matomo), puis on
// bascule sur le simulateur. Un échec de l'API n'empêche pas d'entrer (identité
// `null` : suivi analytics dégradé).
//
// Deux outils partagent le même moteur derrière la porte : le parcours médical
// du **prescripteur** et le parcours administratif du **secrétariat**. Le
// premier passe la main au second via la passation (situation de Partie 1). Le
// point d'entrée initial peut être forcé par `?outil=secretariat`.

import { useState } from "react";
import type { Situation } from "publicodes";
import { Identification } from "../identification/Identification";
import { Prescripteur } from "../prescripteur/Prescripteur";
import { Secretariat } from "../secretariat/Secretariat";
import { referentielHttp } from "../identification/referentiel-http";
import { pseudonymiserViaApi } from "../identite/pseudonymisation-http";
import { setIdentite } from "../identite/session";
import { effacerPassation, emettrePassation } from "../simulateur/passation";
import type { IdentitePseudonymisee } from "../../shared/identite-pseudonymisee";
import type { Referentiel } from "../../shared/referentiel";
import type { IdentiteSaisie } from "../../shared/identite-saisie";

type Outil = "prescripteur" | "secretariat";

type Props = {
  // Injectables pour les tests (défauts = production same-origin).
  referentiel?: Referentiel;
  pseudonymiser?: (saisie: IdentiteSaisie) => Promise<IdentitePseudonymisee | null>;
};

function outilInitial(): Outil {
  const p = new URLSearchParams(window.location.search).get("outil");
  return p === "secretariat" ? "secretariat" : "prescripteur";
}

export function App({
  referentiel = referentielHttp,
  pseudonymiser = pseudonymiserViaApi,
}: Props = {}) {
  const [identifie, setIdentifie] = useState(false);
  const [outil, setOutil] = useState<Outil>(outilInitial);
  // Remonté à chaque nouvelle simulation pour remonter (remount) l'outil et
  // repartir d'un parcours vierge.
  const [cle, setCle] = useState(0);

  async function handleValide(saisie: IdentiteSaisie) {
    setIdentite(await pseudonymiser(saisie));
    setIdentifie(true);
  }

  function recommencer() {
    effacerPassation();
    setCle((c) => c + 1);
    setOutil("prescripteur");
  }

  if (!identifie) {
    return <Identification referentiel={referentiel} onValide={handleValide} />;
  }

  const contenu =
    outil === "prescripteur" ? (
      <Prescripteur
        key={cle}
        onPasserAuSecretariat={(situationP1: Situation<string>) => {
          emettrePassation(situationP1);
          setOutil("secretariat");
        }}
        onNouvelleSimulation={recommencer}
      />
    ) : (
      <Secretariat key={cle} onNouvelleSimulation={recommencer} />
    );

  return (
    <main
      className="fr-container"
      style={{ paddingTop: "2rem", paddingBottom: "4rem" }}
    >
      {contenu}
    </main>
  );
}
