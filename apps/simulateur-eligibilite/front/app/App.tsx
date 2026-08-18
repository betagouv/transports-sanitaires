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

import { lazy, Suspense, useState } from "react";
import type { Situation } from "publicodes";
import { Identification } from "../identification/Identification";
import { Labo } from "../labo/Labo";
import { BandeauLabo } from "../labo/BandeauLabo";
import { Prescripteur } from "../prescripteur/Prescripteur";
import { Secretariat } from "../secretariat/Secretariat";
import { referentielHttp } from "../identification/referentiel-http";
import { pseudonymiserViaApi } from "../identite/pseudonymisation-http";
import { setIdentite } from "../identite/session";
import { effacerPassation, emettrePassation } from "../simulateur/passation";
import type { IdentitePseudonymisee } from "../../shared/identite-pseudonymisee";
import type { Referentiel } from "../../shared/referentiel";
import type { IdentiteSaisie } from "../../shared/identite-saisie";
import type { OptionsGénération } from "../cerfa/cerfa";
import type { Outil } from "./outil";
import { situationDe, type Seed } from "../../seeds/seed";

// Écran dev : chargé à la demande, pour que le catalogue de seeds et son tableau
// restent hors du bundle initial — en production, personne ne cliquera jamais le
// bouton qui les réclame (cf. `import.meta.env.DEV` plus bas).
const GalerieSeeds = lazy(() =>
  import("../seeds/GalerieSeeds").then((m) => ({ default: m.GalerieSeeds })),
);

type Props = {
  // Injectables pour les tests (défauts = production same-origin).
  referentiel?: Referentiel;
  pseudonymiser?: (saisie: IdentiteSaisie) => Promise<IdentitePseudonymisee | null>;
  /** Gabarit CERFA (défaut = asset servi par l'application, chargé au clic). */
  chargerGabarit?: OptionsGénération["chargerGabarit"];
};

function outilInitial(): Outil {
  const p = new URLSearchParams(window.location.search).get("outil");
  return p === "secretariat" ? "secretariat" : "prescripteur";
}

export function App({
  referentiel = referentielHttp,
  pseudonymiser = pseudonymiserViaApi,
  chargerGabarit,
}: Props = {}) {
  const [identifie, setIdentifie] = useState(false);
  // Galerie de seeds (dev) : catalogue des situations de référence, d'où l'on
  // ouvre directement une page de résultat.
  const [galerie, setGalerie] = useState(false);
  // Écran labo (mode test des règles) affiché à la place de l'identification.
  const [labo, setLabo] = useState(false);
  const [outil, setOutil] = useState<Outil>(outilInitial);
  // Remonté à chaque nouvelle simulation pour remonter (remount) l'outil et
  // repartir d'un parcours vierge.
  const [cle, setCle] = useState(0);
  // Raccourci dev : situation pré-remplie pour ouvrir directement le résultat.
  const [situationDev, setSituationDev] = useState<Situation<string> | null>(
    null
  );

  async function handleValide(saisie: IdentiteSaisie) {
    setIdentite(await pseudonymiser(saisie));
    setIdentifie(true);
  }

  // Galerie de seeds : ouvre la page de résultat de la seed choisie. Court-circuite
  // l'identification (identité non pseudonymisée, suivi analytics dégradé) et le
  // questionnaire — résultat médical (prescripteur) ou résultat final (secrétariat)
  // selon l'écran d'atterrissage déclaré par la seed.
  function ouvrirSeed(seed: Seed) {
    setSituationDev(situationDe(seed));
    setOutil(seed.outil);
    setGalerie(false);
    setIdentifie(true);
  }

  function recommencer() {
    effacerPassation();
    setGalerie(false);
    setSituationDev(null);
    setCle((c) => c + 1);
    setOutil("prescripteur");
  }

  // La galerie est accessible des deux côtés de l'écran-porte (avant
  // identification, et depuis le début du parcours) : elle passe donc devant.
  if (galerie) {
    return (
      <>
        <BandeauLabo />
        <Suspense fallback={null}>
          <GalerieSeeds onOuvrir={ouvrirSeed} onRetour={() => setGalerie(false)} />
        </Suspense>
      </>
    );
  }

  if (!identifie) {
    return (
      <>
        <BandeauLabo />
        {labo ? (
          <Labo onRetour={() => setLabo(false)} />
        ) : (
          <Identification
            referentiel={referentiel}
            onValide={handleValide}
            onAccesLabo={() => setLabo(true)}
            onGalerieSeeds={
              import.meta.env.DEV ? () => setGalerie(true) : undefined
            }
          />
        )}
      </>
    );
  }

  const contenu =
    outil === "prescripteur" ? (
      <Prescripteur
        key={cle}
        situationInitiale={situationDev}
        onPasserAuSecretariat={(situationP1: Situation<string>) => {
          emettrePassation(situationP1);
          setOutil("secretariat");
        }}
        onNouvelleSimulation={recommencer}
        // Galerie de seeds depuis le début du parcours : mêmes situations qu'à
        // l'écran-porte, sans avoir à ressortir du simulateur.
        onGalerieSeeds={import.meta.env.DEV ? () => setGalerie(true) : undefined}
      />
    ) : (
      <Secretariat
        key={cle}
        situationFinale={situationDev}
        onNouvelleSimulation={recommencer}
        chargerGabarit={chargerGabarit}
      />
    );

  return (
    <>
      <BandeauLabo />
      <main
        className="fr-container"
        style={{ paddingTop: "2rem", paddingBottom: "4rem" }}
      >
        {contenu}
      </main>
    </>
  );
}
