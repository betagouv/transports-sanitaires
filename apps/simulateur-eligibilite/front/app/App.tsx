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
// premier passe la main au second via la passation (situation de Partie 1).

import type { Situation } from "publicodes";
import { lazy, Suspense } from "react";
import type { IdentitePseudonymisee } from "../../shared/identite-pseudonymisee";
import type { IdentiteSaisie } from "../../shared/identite-saisie";
import type { Referentiel } from "../../shared/referentiel";
import { Identification } from "../identification/Identification";
import { pseudonymiserViaApi } from "../identification/pseudonymisation-http";
import { referentielHttp } from "../identification/referentiel-http";
import { rangerIdentite } from "../identification/session";
import { BoutonCerfa } from "../outils-produit/beta/cerfa/BoutonCerfa";
import type { OptionsGénération } from "../outils-produit/beta/cerfa/cerfa";
import { BandeauLabo } from "../outils-produit/labo/BandeauLabo";
import { Labo } from "../outils-produit/labo/Labo";
import { BoutonOutil, OutilsProduit } from "../outils-produit/OutilsProduit";
import { moteur } from "../simulateur/moteur";
import { emettrePassation } from "../simulateur/passation";
import { Prescripteur } from "../simulateur/prescripteur/Prescripteur";
import { Secretariat } from "../simulateur/secretariat/Secretariat";
import { BandeauVersion } from "./BandeauVersion";
import { EcranPleinePage } from "./EcranPleinePage";
import type { Navigation } from "./navigation";
import { outilDeLUrl, useNavigation } from "./navigation";

type Props = {
  // Injectables pour les tests (défauts = production same-origin).
  referentiel?: Referentiel;
  pseudonymiser?: (
    saisie: IdentiteSaisie,
  ) => Promise<IdentitePseudonymisee | null>;
  /** Gabarit CERFA (défaut = asset servi par l'application, chargé au clic). */
  chargerGabarit?: OptionsGénération["chargerGabarit"];
};

export function App({
  referentiel = referentielHttp,
  pseudonymiser = pseudonymiserViaApi,
  chargerGabarit,
}: Props = {}) {
  const navigation = useNavigation(outilDeLUrl);

  return (
    <>
      <BandeauLabo />
      {navigation.ecran === "identification" && (
        <Porte
          referentiel={referentiel}
          pseudonymiser={pseudonymiser}
          onIdentifie={navigation.identifier}
        />
      )}
      {navigation.ecran === "labo" && (
        <Labo onRetour={navigation.fermerOutil} />
      )}
      {navigation.ecran === "galerie" && <Galerie navigation={navigation} />}
      {navigation.ecran === "simulateur" && (
        <>
          <EcranPleinePage>
            <Simulateur
              navigation={navigation}
              chargerGabarit={chargerGabarit}
            />
          </EcranPleinePage>
          <BandeauVersion />
        </>
      )}
    </>
  );
}

// ---- implémentation ----

function Galerie({ navigation }: { navigation: Navigation }) {
  return (
    <Suspense fallback={null}>
      <GalerieSeeds
        onOuvrir={navigation.ouvrirSeed}
        onRetour={navigation.fermerOutil}
      />
    </Suspense>
  );
}

// L'écran-porte, plus la conversion de l'identité saisie en identité
// pseudonymisée. Un échec de l'API n'empêche pas d'entrer : `rangerIdentite`
// accepte `null`, et le suivi analytics est alors dégradé.
function Porte({
  referentiel,
  pseudonymiser,
  onIdentifie,
}: {
  referentiel: Referentiel;
  pseudonymiser: NonNullable<Props["pseudonymiser"]>;
  onIdentifie: Navigation["identifier"];
}) {
  return (
    <Identification
      referentiel={referentiel}
      onValide={async (saisie, acces) => {
        rangerIdentite(await pseudonymiser(saisie));
        onIdentifie(acces);
      }}
    />
  );
}

// Chargé à la demande, pour que le catalogue de seeds et son tableau restent hors
// du bundle initial : seul le service produit y accède (cf. `outilsProduit`), la
// très grande majorité des prescripteurs ne le réclamera jamais.
const GalerieSeeds = lazy(() =>
  import("../outils-produit/seeds/GalerieSeeds").then((m) => ({
    default: m.GalerieSeeds,
  })),
);

type SimulateurProps = {
  navigation: Navigation;
  chargerGabarit?: OptionsGénération["chargerGabarit"];
};

function Simulateur({ navigation, chargerGabarit }: SimulateurProps) {
  if (navigation.outil === "secretariat") {
    return (
      <Secretariat
        key={navigation.cle}
        situationFinale={navigation.situationDev}
        onNouvelleSimulation={navigation.recommencer}
        documentTelechargeable={documentTelechargeable(
          navigation.outilsProduit,
          chargerGabarit,
        )}
      />
    );
  }
  return (
    <Prescripteur
      key={navigation.cle}
      situationInitiale={navigation.situationDev}
      onPasserAuSecretariat={(situationP1: Situation<string>) => {
        emettrePassation(situationP1);
        navigation.passerAuSecretariat();
      }}
      onNouvelleSimulation={navigation.recommencer}
      panneauOutilsProduit={panneauOutilsProduit(navigation)}
    />
  );
}

// Les deux branchements du simulateur vers les outils produit se décident ici,
// et nulle part ailleurs : le simulateur reçoit du contenu déjà composé, il
// n'importe rien de `outils-produit/`. C'est aussi ici que se lit, d'un coup
// d'œil, tout ce que le service n° 4 déverrouille dans le parcours.
//
// Galerie de seeds depuis le début du parcours : mêmes situations qu'à
// l'écran-porte, sans avoir à ressortir du simulateur. Le mode test des règles,
// lui, reste à la porte — il recharge l'application, et perdrait le parcours.
function panneauOutilsProduit(navigation: Navigation) {
  if (!navigation.outilsProduit) return undefined;
  return (
    <OutilsProduit>
      <BoutonOutil onClick={navigation.ouvrirGalerie}>
        Galerie de seeds
      </BoutonOutil>
    </OutilsProduit>
  );
}

// Le pré-remplissage du CERFA reste réservé au service n° 4, le temps d'être
// éprouvé. La Page Résultat 2 décide, elle, si le cas final ouvre un document.
function documentTelechargeable(
  outilsProduit: boolean,
  chargerGabarit: OptionsGénération["chargerGabarit"] | undefined,
) {
  if (!outilsProduit) return undefined;
  return (situation: Situation<string>) => (
    <BoutonCerfa
      moteur={moteur}
      situation={situation}
      chargerGabarit={chargerGabarit}
    />
  );
}
