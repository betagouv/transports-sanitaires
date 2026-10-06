// Racine de l'app : **écran-porte** de rattachement devant le simulateur.
// Tant que l'établissement et le service ne sont pas renseignés, seul l'écran de
// rattachement s'affiche : impossible de simuler sans s'être rattaché (voir
// docs/knowledge/adr/identification.md, ADR-1).
//
// À la validation, on range le rattachement saisi en session (pour Matomo), on
// déclare au serveur un éventuel service saisi sous « Autre », sans attendre sa
// réponse, puis on bascule sur le simulateur.

import { lazy, type ReactNode, Suspense } from "react";
import type { RattachementSaisi } from "../../shared/rattachement-saisi";
import type { Referentiel } from "../../shared/referentiel";
import { BoutonOutil, OutilsProduit } from "../outils-produit/OutilsProduit";
import { declarerViaApi } from "../rattachement/declaration-http";
import { Rattachement } from "../rattachement/Rattachement";
import { referentielHttp } from "../rattachement/referentiel-http";
import { rangerRattachement } from "../rattachement/session";
import type { Seed } from "../seeds/seed";
import { Simulateur } from "../simulateur/Simulateur";
import { BandeauVersion } from "./BandeauVersion";
import { EcranPleinePage } from "./EcranPleinePage";
import type { Navigation } from "./navigation";
import { useNavigation } from "./navigation";

type Props = {
  // Injectables pour les tests (défauts = production same-origin).
  referentiel?: Referentiel;
  declarer?: (saisie: RattachementSaisi) => void;
  /** Seeds de la galerie (défaut = le catalogue, chargé à la demande). */
  seeds?: readonly Seed[];
};

export function App({
  referentiel = referentielHttp,
  declarer = declarerViaApi,
  seeds,
}: Props = {}) {
  const navigation = useNavigation();

  return (
    <>
      {navigation.ecran === "rattachement" && (
        <Porte
          referentiel={referentiel}
          declarer={declarer}
          onRattache={navigation.rattacher}
        />
      )}
      {navigation.ecran === "galerie" && (
        <Galerie navigation={navigation} seeds={seeds} />
      )}
      {navigation.ecran === "simulateur" && (
        <PageDuSimulateur>
          <EcranPleinePage>
            <Simulateur
              key={navigation.cle}
              reponsesDeSeed={navigation.reponsesDeSeed}
              onNouvelleSimulation={navigation.recommencer}
              panneauOutilsProduit={panneauOutilsProduit(navigation)}
              traceDebug={navigation.outilsProduit}
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

function Galerie({
  navigation,
  seeds,
}: {
  navigation: Navigation;
  seeds?: readonly Seed[];
}) {
  return (
    <Suspense fallback={null}>
      <GalerieSeeds
        seeds={seeds}
        onOuvrir={navigation.ouvrirSeed}
        onRetour={navigation.fermerOutil}
      />
    </Suspense>
  );
}

// L'écran-porte. Seul un service saisi sous « Autre » apprend quelque chose au
// référentiel : c'est le seul cas déclaré au serveur. Le rattachement dégradé
// « Autre / Autre » n'en fait pas partie, le référentiel étant alors injoignable.
function Porte({
  referentiel,
  declarer,
  onRattache,
}: {
  referentiel: Referentiel;
  declarer: NonNullable<Props["declarer"]>;
  onRattache: Navigation["rattacher"];
}) {
  return (
    <Rattachement
      referentiel={referentiel}
      onValide={(saisie, acces) => {
        rangerRattachement(saisie);
        if (saisie.serviceEstAutre) declarer(saisie);
        onRattache(acces);
      }}
    />
  );
}

// Chargé à la demande, pour que le catalogue de seeds et son tableau restent hors
// du bundle initial : seul le service produit y accède (cf. `outilsProduit`), la
// très grande majorité des prescripteurs ne le réclamera jamais.
const GalerieSeeds = lazy(() =>
  import("../seeds/GalerieSeeds").then((m) => ({
    default: m.GalerieSeeds,
  })),
);

// Les branchements du simulateur vers les outils produit se décident ici, et
// nulle part ailleurs : le simulateur reçoit du contenu déjà composé, il
// n'importe rien de `outils-produit/`. C'est aussi ici que se lit, d'un coup
// d'œil, tout ce que le service n° 4 déverrouille dans le parcours : le panneau
// de la galerie et les traces de debug (`traceDebug`, un booléen plutôt qu'un
// contenu composé : elles lisent l'état vivant du parcours, qu'`App` n'a pas
// sous la main).
//
// Galerie de seeds depuis le début du parcours : mêmes situations qu'à
// l'écran-porte, sans avoir à ressortir du simulateur.
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
