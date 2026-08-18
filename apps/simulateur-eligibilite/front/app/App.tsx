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
import {
  Identification,
  type AccesIdentification,
} from "../identification/Identification";
import { Labo } from "../outils-produit/labo/Labo";
import { BandeauLabo } from "../outils-produit/labo/BandeauLabo";
import { Prescripteur } from "../simulateur/prescripteur/Prescripteur";
import { Secretariat } from "../simulateur/secretariat/Secretariat";
import { referentielHttp } from "../identification/referentiel-http";
import { pseudonymiserViaApi } from "../identification/pseudonymisation-http";
import { setIdentite } from "../identification/session";
import { effacerPassation, emettrePassation } from "../simulateur/passation";
import type { IdentitePseudonymisee } from "../../shared/identite-pseudonymisee";
import type { Referentiel } from "../../shared/referentiel";
import type { IdentiteSaisie } from "../../shared/identite-saisie";
import type { OptionsGénération } from "../cerfa/cerfa";
import type { Outil } from "./outil";
import { situationDe, type Seed } from "../outils-produit/seeds/seed";

// Chargé à la demande, pour que le catalogue de seeds et son tableau restent hors
// du bundle initial : seul le service produit y accède (cf. `outilsProduit`), la
// très grande majorité des prescripteurs ne le réclamera jamais.
const GalerieSeeds = lazy(() =>
  import("../outils-produit/seeds/GalerieSeeds").then((m) => ({
    default: m.GalerieSeeds,
  })),
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
  // Galerie de seeds : catalogue des situations de référence, d'où l'on ouvre
  // directement une page de résultat.
  const [galerie, setGalerie] = useState(false);
  // Le service identifié déverrouille-t-il les outils produit (service n° 4) ?
  // Retenu à la validation pour pouvoir les reproposer au début du parcours —
  // c'est un booléen, pas une identité : l'invariant de `docs/architecture` tient.
  const [outilsProduit, setOutilsProduit] = useState(false);
  // Écran labo (mode test des règles), superposé au parcours une fois identifié.
  const [labo, setLabo] = useState(false);
  const [outil, setOutil] = useState<Outil>(outilInitial);
  // Remonté à chaque nouvelle simulation pour remonter (remount) l'outil et
  // repartir d'un parcours vierge.
  const [cle, setCle] = useState(0);
  // Situation issue d'une seed, pour ouvrir directement la page de résultat.
  const [situationDev, setSituationDev] = useState<Situation<string> | null>(
    null
  );

  async function handleValide(saisie: IdentiteSaisie, acces: AccesIdentification) {
    setIdentite(await pseudonymiser(saisie));
    setOutilsProduit(acces.outilsProduit);
    setIdentifie(true);
    // Les outils produit s'ouvrent **après** la porte : on entre identifié, quelle
    // que soit la destination.
    if (acces.destination === "galerie") setGalerie(true);
    if (acces.destination === "labo") setLabo(true);
  }

  // Galerie de seeds : ouvre la page de résultat de la seed choisie, en sautant le
  // questionnaire — résultat médical (prescripteur) ou résultat final (secrétariat)
  // selon l'écran d'atterrissage déclaré par la seed. L'identification, elle, a déjà
  // eu lieu : on n'arrive ici que par la porte.
  function ouvrirSeed(seed: Seed) {
    setSituationDev(situationDe(seed));
    setOutil(seed.outil);
    setGalerie(false);
  }

  function recommencer() {
    effacerPassation();
    setGalerie(false);
    setLabo(false);
    setSituationDev(null);
    setCle((c) => c + 1);
    setOutil("prescripteur");
  }

  // Les outils produit se superposent au parcours : on y arrive identifié, et le
  // retour redonne la main au simulateur.
  if (labo) {
    return (
      <>
        <BandeauLabo />
        <Labo onRetour={() => setLabo(false)} />
      </>
    );
  }

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
        <Identification referentiel={referentiel} onValide={handleValide} />
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
        onGalerieSeeds={outilsProduit ? () => setGalerie(true) : undefined}
      />
    ) : (
      <Secretariat
        key={cle}
        situationFinale={situationDev}
        onNouvelleSimulation={recommencer}
        outilsProduit={outilsProduit}
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
