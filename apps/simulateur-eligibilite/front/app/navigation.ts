// Où l'on se trouve dans l'application, et comment on en change : la porte
// de rattachement, la galerie de seeds qui s'y superpose, et le simulateur
// affiché derrière.
//
// Le rattachement, lui, ne transite pas par ici : la porte le range en session,
// et `rattacher` ne retient que le booléen d'accès aux outils produit.

import { useState } from "react";
import type { AccesRattachement } from "../rattachement/Rattachement";
import type { Seed } from "../seeds/seed";
import type { Reponses } from "../simulateur/questionnaire/question";

type Ecran = "rattachement" | "galerie" | "simulateur";

export type Navigation = {
  ecran: Ecran;
  // Le service choisi déverrouille-t-il les outils produit (service n° 4) ?
  // Retenu à la validation pour pouvoir les reproposer au début du parcours.
  // C'est un booléen, pas une identité : l'invariant de `docs/knowledge` tient.
  outilsProduit: boolean;
  // Les réponses de la seed ouverte, qui pré-remplissent le simulateur.
  reponsesDeSeed: Reponses | null;
  // Remontée à chaque nouvelle simulation pour remonter (remount) le simulateur
  // et repartir d'un parcours vierge.
  cle: number;
  // Les outils produit s'ouvrent **après** la porte : on entre rattaché,
  // quelle que soit la destination.
  rattacher: (acces: AccesRattachement) => void;
  // Ouvre la seed choisie : son résultat si elle est complète, sinon la
  // première page qu'elle laisse sans réponse.
  ouvrirSeed: (seed: Seed) => void;
  ouvrirGalerie: () => void;
  fermerOutil: () => void;
  recommencer: () => void;
};

export function useNavigation(): Navigation {
  const [etat, changer] = useState<Etat>({
    ecran: "rattachement",
    outilsProduit: false,
    reponsesDeSeed: null,
    cle: 0,
  });
  const modifier = (partiel: Partial<Etat>) =>
    changer((actuel) => ({ ...actuel, ...partiel }));

  return { ...etat, ...actions(etat, modifier) };
}

// ---- implémentation ----

type Etat = Pick<
  Navigation,
  "ecran" | "outilsProduit" | "reponsesDeSeed" | "cle"
>;

function actions(
  etat: Etat,
  modifier: (partiel: Partial<Etat>) => void,
): Omit<Navigation, keyof Etat> {
  return {
    rattacher: (acces) =>
      modifier({
        ecran: acces.destination,
        outilsProduit: acces.outilsProduit,
      }),
    // La clé remonte pour repartir d'un parcours vierge, la seed pouvant être
    // rouverte.
    ouvrirSeed: (seed) =>
      modifier({
        ecran: "simulateur",
        reponsesDeSeed: seed.reponses,
        cle: etat.cle + 1,
      }),
    ouvrirGalerie: () => modifier({ ecran: "galerie" }),
    fermerOutil: () => modifier({ ecran: "simulateur" }),
    recommencer: () =>
      modifier({
        ecran: "simulateur",
        reponsesDeSeed: null,
        cle: etat.cle + 1,
      }),
  };
}
