// Racine de l'app : l'écran de rattachement devant le simulateur.
// Tant que l'établissement et le service ne sont pas renseignés, seul l'écran de
// rattachement s'affiche : impossible de simuler sans s'être rattaché (voir
// docs/knowledge/adr/identification.md, ADR-1).
//
// Chaque écran vit dans son module. Ici on choisit lequel s'affiche, et on
// branche les developer tools sur le simulateur.

import type { ComponentProps } from "react";
import { BoutonOutil, DeveloperTools } from "../developerTools/DeveloperTools";
import { EcranDeRattachement } from "../rattachement/EcranDeRattachement";
import { EcranDesSeeds } from "../seeds/EcranDesSeeds";
import type { Seed } from "../seeds/seed";
import { EcranDuSimulateur } from "../simulateur/EcranDuSimulateur";
import type { Navigation } from "./navigation";
import { useNavigation } from "./navigation";

// `referentiel` et `declarer` sont injectables pour les tests (défauts =
// production same-origin).
type Props = Pick<
  ComponentProps<typeof EcranDeRattachement>,
  "referentiel" | "declarer"
> & {
  /** Seeds de l'écran des seeds (défaut = le catalogue, chargé à la demande). */
  seeds?: readonly Seed[];
};

export function App({ referentiel, declarer, seeds }: Props = {}) {
  const navigation = useNavigation();

  return (
    <>
      {navigation.ecran === "rattachement" && (
        <EcranDeRattachement
          referentiel={referentiel}
          declarer={declarer}
          onRattache={navigation.rattacher}
        />
      )}
      {navigation.ecran === "seeds" && (
        <EcranDesSeeds
          seeds={seeds}
          onOuvrir={navigation.ouvrirSeed}
          onRetour={navigation.fermerOutil}
        />
      )}
      {navigation.ecran === "simulateur" && (
        <EcranDuSimulateur
          key={navigation.numeroDeSimulation}
          reponsesDeSeed={navigation.reponsesDeSeed}
          onNouvelleSimulation={navigation.recommencer}
          panneauDeveloperTools={panneauDeveloperTools(navigation)}
          traceDebug={navigation.developerTools}
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
// de l'écran des seeds et les traces de debug (`traceDebug`, un booléen plutôt qu'un
// contenu composé : elles lisent l'état vivant du parcours, qu'`App` n'a pas
// sous la main).
//
// Écran des seeds depuis le début du parcours : mêmes situations qu'à
// l'écran de rattachement, sans avoir à ressortir du simulateur.
function panneauDeveloperTools(navigation: Navigation) {
  if (!navigation.developerTools) return undefined;
  return (
    <DeveloperTools>
      <BoutonOutil onClick={navigation.ouvrirSeeds}>Seeds</BoutonOutil>
    </DeveloperTools>
  );
}
