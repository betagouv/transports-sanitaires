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
import { Container } from "./Container";
import { type ModelSource, useModelLoading } from "./model-loading";
import type { Navigation } from "./navigation";
import { useNavigation } from "./navigation";

// `referentiel` et `declarer` sont injectables pour les tests.
type Props = Pick<
  ComponentProps<typeof RattachementScreen>,
  "referentiel" | "declarer"
> & {
  /**
   * La version du modèle que l'app déroule, ou sa promesse quand elle se charge
   * à la demande. `Main` la fournit.
   */
  model: ModelSource;
};

// Le rattachement n'attend pas le modèle : il se charge pendant que
// l'utilisateur se rattache.
export function App({ model: source, referentiel, declarer }: Props) {
  const navigation = useNavigation();
  const { model, failed } = useModelLoading(source);

  if (navigation.screen === "rattachement")
    return (
      <RattachementScreen
        referentiel={referentiel}
        declarer={declarer}
        onRattache={navigation.rattacher}
      />
    );
  if (!model) return <ModelPending failed={failed} />;
  return <AfterRattachement model={model} navigation={navigation} />;
}

// ---- implémentation ----

function ModelPending({ failed }: { failed: boolean }) {
  return (
    <Container>
      {failed ? (
        <div className="fr-alert fr-alert--error" role="alert">
          <p>Le simulateur n’a pas pu se charger. Rechargez la page.</p>
        </div>
      ) : (
        <p role="status">Chargement du simulateur…</p>
      )}
    </Container>
  );
}

// Ce qui suit le rattachement : l'écran des seeds, ou le simulateur.
function AfterRattachement({
  model,
  navigation,
}: {
  model: Model;
  navigation: Navigation;
}) {
  if (navigation.screen === "seeds")
    return (
      <SeedsScreen
        model={model}
        onOpen={navigation.openSeed}
        onBack={navigation.closeTool}
      />
    );
  return (
    <SimulateurScreen
      key={navigation.simulationNumber}
      model={model}
      seedAnswers={navigation.seedAnswers}
      onNewSimulation={navigation.restart}
      developerToolsPanel={developerToolsPanel(navigation)}
      DebugTrace={navigation.developerTools ? DebugTrace : undefined}
    />
  );
}

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
