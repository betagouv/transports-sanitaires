// Racine de l'app. Elle choisit l'écran à afficher et branche les developer
// tools sur le simulateur.
//
// L'écran de rattachement passe en premier : on ne simule pas sans s'être
// rattaché. Voir docs/knowledge/adr/identification.md, ADR-1.

import type { ComponentProps } from "react";
import { DebugTrace } from "../developerTools/DebugTrace";
import { DeveloperTools, ToolButton } from "../developerTools/DeveloperTools";
import type { Model } from "../model";
import { RattachementScreen } from "../rattachement/RattachementScreen";
import { SeedsScreen } from "../seeds/SeedsScreen";
import { SimulateurScreen } from "../simulateur/SimulateurScreen";
import type { Navigation } from "./navigation";
import { useNavigation } from "./navigation";

// `referentiel` et `declarer` sont injectables pour les tests.
type Props = Pick<
  ComponentProps<typeof RattachementScreen>,
  "referentiel" | "declarer"
> & {
  /** La version du modèle que l'app déroule. `Main` la fournit. */
  model: Model;
};

export function App({ model, referentiel, declarer }: Props) {
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
          model={model}
          onOpen={navigation.openSeed}
          onBack={navigation.closeTool}
        />
      )}
      {navigation.screen === "simulateur" && (
        <SimulateurScreen
          key={navigation.simulationNumber}
          model={model}
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

// Le branchement des developer tools sur le simulateur se décide ici. Le
// simulateur reçoit du contenu déjà composé et n'importe rien de
// `developerTools/`. Le service n° 4 déverrouille deux choses : le bouton vers
// l'écran des seeds et la trace de debug.
function developerToolsPanel(navigation: Navigation) {
  if (!navigation.developerTools) return undefined;
  return (
    <DeveloperTools>
      <ToolButton onClick={navigation.openSeeds}>Seeds</ToolButton>
    </DeveloperTools>
  );
}
