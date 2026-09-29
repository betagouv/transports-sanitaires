// Racine de l'app : **écran-porte** de rattachement devant les simulateurs.
// Tant que l'établissement et le service ne sont pas renseignés, seul l'écran de
// rattachement s'affiche — impossible de simuler sans s'être rattaché (voir
// docs/knowledge/adr/identification.md — ADR-1).
//
// À la validation, on convertit le rattachement saisi en rattachement
// pseudonymisé via l'API (`pseudonymiserViaApi`), on le range en session (pour
// Matomo), puis on bascule sur le simulateur. Un échec de l'API n'empêche pas
// d'entrer (rattachement `null` : suivi analytics dégradé).
//
// Deux outils partagent le même moteur derrière la porte : le parcours médical
// du **prescripteur** et le parcours administratif du **secrétariat**. Le
// premier passe la main au second via la passation (situation de Partie 1).

import type { Situation } from "publicodes";
import { lazy, type ReactNode, Suspense } from "react";
import type { RattachementPseudonymise } from "../../shared/rattachement-pseudonymise";
import type { RattachementSaisi } from "../../shared/rattachement-saisi";
import type { Referentiel } from "../../shared/referentiel";
import { BoutonCerfa } from "../outils-produit/beta/cerfa/BoutonCerfa";
import type { OptionsGénération } from "../outils-produit/beta/cerfa/document";
import { BandeauLabo } from "../outils-produit/labo/BandeauLabo";
import { Labo } from "../outils-produit/labo/Labo";
import { BoutonOutil, OutilsProduit } from "../outils-produit/OutilsProduit";
import { pseudonymiserViaApi } from "../rattachement/pseudonymisation-http";
import { Rattachement } from "../rattachement/Rattachement";
import { referentielHttp } from "../rattachement/referentiel-http";
import { rangerRattachement } from "../rattachement/session";
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
    saisie: RattachementSaisi,
  ) => Promise<RattachementPseudonymise | null>;
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
      {navigation.ecran === "rattachement" && (
        <Porte
          referentiel={referentiel}
          pseudonymiser={pseudonymiser}
          onRattache={navigation.rattacher}
        />
      )}
      {navigation.ecran === "labo" && (
        <Labo onRetour={navigation.fermerOutil} />
      )}
      {navigation.ecran === "galerie" && <Galerie navigation={navigation} />}
      {navigation.ecran === "simulateur" && (
        <PageDuSimulateur>
          <EcranPleinePage>
            <Simulateur
              navigation={navigation}
              chargerGabarit={chargerGabarit}
            />
          </EcranPleinePage>
          <BandeauVersion />
        </PageDuSimulateur>
      )}
    </>
  );
}

// ---- implémentation ----

// La page du simulateur fait au minimum la hauteur de la fenêtre et se répartit
// en colonne : le contenu prend la place qu'il lui faut, le pied de page se pose
// au bas. Sans cela, sur un écran où le contenu est court, le bandeau de version
// flotte au milieu du vide au lieu de fermer la page.
//
// `100dvh` et non `100vh` : sur mobile, la barre d'adresse qui se rétracte
// change la hauteur utile, et `vh` laisserait le bandeau sous le pli.
function PageDuSimulateur({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
      }}
    >
      {children}
    </div>
  );
}

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

// L'écran-porte, plus la conversion du rattachement saisi en rattachement
// pseudonymisé. Un échec de l'API n'empêche pas d'entrer : `rangerRattachement`
// accepte `null`, et le suivi analytics est alors dégradé.
function Porte({
  referentiel,
  pseudonymiser,
  onRattache,
}: {
  referentiel: Referentiel;
  pseudonymiser: NonNullable<Props["pseudonymiser"]>;
  onRattache: Navigation["rattacher"];
}) {
  return (
    <Rattachement
      referentiel={referentiel}
      onValide={async (saisie, acces) => {
        rangerRattachement(await pseudonymiser(saisie));
        onRattache(acces);
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
        onRetourAuResultatMedical={navigation.revenirAuResultatMedical}
        documentTelechargeable={documentTelechargeable(
          navigation.outilsProduit,
          chargerGabarit,
        )}
        traceDebug={navigation.outilsProduit}
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
      traceDebug={navigation.outilsProduit}
    />
  );
}

// Les branchements du simulateur vers les outils produit se décident ici, et
// nulle part ailleurs : le simulateur reçoit du contenu déjà composé, il
// n'importe rien de `outils-produit/`. C'est aussi ici que se lit, d'un coup
// d'œil, tout ce que le service n° 4 déverrouille dans le parcours — le panneau
// de la galerie, le document téléchargeable, et les traces de debug (`traceDebug`,
// un booléen plutôt qu'un contenu composé : elles lisent l'état vivant du
// parcours, qu'`App` n'a pas sous la main).
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
// éprouvé. La Page Résultat 2 décide, elle, si le modèle nomme un document à
// remettre ; `BoutonCerfa` sait lequel des deux formulaires en est un, ou aucun.
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
