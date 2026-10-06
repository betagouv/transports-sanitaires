// Racine de l'app. Elle choisit l'écran à afficher et branche les developer
// tools sur le simulateur.
//
// L'écran de rattachement passe en premier : on ne simule pas sans s'être
// rattaché. Voir docs/knowledge/adr/identification.md, ADR-1.

import type { ComponentProps } from "react";
import { DebugTrace } from "../developerTools/DebugTrace";
import { DeveloperTools, ToolButton } from "../developerTools/DeveloperTools";
import { RattachementScreen } from "../rattachement/RattachementScreen";
import { SeedsScreen } from "../seeds/SeedsScreen";
import type { Seed } from "../seeds/seed";
import { SimulateurScreen } from "../simulateur/SimulateurScreen";
import type { Navigation } from "./navigation";
import { useNavigation } from "./navigation";

// `referentiel` et `declarer` sont injectables pour les tests (défauts =
// production same-origin).
type Props = Pick<
  ComponentProps<typeof RattachementScreen>,
  "referentiel" | "declarer"
> & {
  /** Seeds de l'écran des seeds (défaut = le catalogue, chargé à la demande). */
  seeds?: readonly Seed[];
};

export function App({ referentiel, declarer, seeds }: Props = {}) {
  const navigation = useNavigation();

  return (
    <>
      {navigation.screen === "rattachement" && (
        <RattachementScreen
          referentiel={referentiel}
          declarer={declarer}
          onRattache={navigation.rattacher}
        />
      )}
      {navigation.screen === "seeds" && (
        <SeedsScreen
          seeds={seeds}
          onOuvrir={navigation.openSeed}
          onRetour={navigation.closeTool}
        />
      )}
      {navigation.screen === "simulateur" && (
        <SimulateurScreen
          key={navigation.simulationNumber}
          seedAnswers={navigation.seedAnswers}
          onNewSimulation={navigation.restart}
          developerToolsPanel={developerToolsPanel(navigation)}
          DebugTrace={navigation.developerTools ? DebugTrace : undefined}
        />
      )}
    </>
  );
}

// ---- implémentation ----

// Les branchements du simulateur vers les developer tools se décident ici, et
// nulle part ailleurs : le simulateur reçoit du contenu déjà composé, il
// n'importe rien de `developerTools/`. C'est aussi ici que se lit, d'un coup
// d'œil, tout ce que le service n° 4 déverrouille dans le parcours : le panneau
// de l'écran des seeds et la trace de debug.
//
// Écran des seeds depuis le début du parcours : mêmes situations qu'à
// l'écran de rattachement, sans avoir à ressortir du simulateur.
function developerToolsPanel(navigation: Navigation) {
  if (!navigation.developerTools) return undefined;
  return (
    <DeveloperTools>
      <ToolButton onClick={navigation.openSeeds}>Seeds</ToolButton>
    </DeveloperTools>
  );
}
