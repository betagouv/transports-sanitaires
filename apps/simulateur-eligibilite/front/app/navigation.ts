// Où l'on se trouve dans l'application, et comment on en change : la porte
// d'identification, les deux écrans d'outils produit qui s'y superposent, et
// l'outil du simulateur affiché derrière.
//
// L'identité pseudonymisée, elle, ne transite pas par ici : `identifier` la
// range en session et ne retient que le booléen d'accès aux outils produit.

import type { Situation } from "publicodes";
import { useState } from "react";
import type { AccesIdentification } from "../identification/Identification";
import { type Seed, situationDe } from "../outils-produit/seeds/seed";
import { effacerPassation } from "../simulateur/passation";
import type { Outil } from "./outil";

export type Ecran = "identification" | "galerie" | "labo" | "simulateur";

export type Navigation = {
  ecran: Ecran;
  outil: Outil;
  // Le service identifié déverrouille-t-il les outils produit (service n° 4) ?
  // Retenu à la validation pour pouvoir les reproposer au début du parcours —
  // c'est un booléen, pas une identité : l'invariant de `docs/architecture` tient.
  outilsProduit: boolean;
  // Situation issue d'une seed, pour ouvrir directement la page de résultat.
  situationDev: Situation<string> | null;
  // Remontée à chaque nouvelle simulation pour remonter (remount) l'outil et
  // repartir d'un parcours vierge.
  cle: number;
  // Les outils produit s'ouvrent **après** la porte : on entre identifié,
  // quelle que soit la destination.
  identifier: (acces: AccesIdentification) => void;
  // Ouvre la page de résultat de la seed choisie, en sautant le questionnaire —
  // résultat médical (prescripteur) ou résultat final (secrétariat) selon
  // l'écran d'atterrissage déclaré par la seed. L'identification, elle, a déjà
  // eu lieu : on n'arrive ici que par la porte.
  ouvrirSeed: (seed: Seed) => void;
  ouvrirGalerie: () => void;
  fermerOutil: () => void;
  passerAuSecretariat: () => void;
  recommencer: () => void;
};

// `outilInitial` est une fonction : elle n'est appelée qu'au premier rendu
// (initialiseur paresseux de `useState`), pas à chaque passage.
export function useNavigation(outilInitial: () => Outil): Navigation {
  const [etat, setEtat] = useState<Etat>(() => ({
    ecran: "identification",
    outil: outilInitial(),
    outilsProduit: false,
    situationDev: null,
    cle: 0,
  }));
  const modifier = (partiel: Partial<Etat>) =>
    setEtat((actuel) => ({ ...actuel, ...partiel }));

  return { ...etat, ...actions(etat, modifier) };
}

// Outil du simulateur au démarrage : le point d'entrée initial peut être forcé
// par `?outil=secretariat`.
export function outilDeLUrl(): Outil {
  const demande = new URLSearchParams(window.location.search).get("outil");
  return demande === "secretariat" ? "secretariat" : "prescripteur";
}

// ---- implémentation ----

type Etat = Pick<
  Navigation,
  "ecran" | "outil" | "outilsProduit" | "situationDev" | "cle"
>;

type Actions = Omit<Navigation, keyof Etat>;

function actions(
  etat: Etat,
  modifier: (partiel: Partial<Etat>) => void,
): Actions {
  return {
    identifier: (acces) =>
      modifier({ ecran: ecranDe(acces), outilsProduit: acces.outilsProduit }),
    ouvrirSeed: (seed) =>
      modifier({
        ecran: "simulateur",
        outil: seed.outil,
        situationDev: situationDe(seed),
      }),
    ouvrirGalerie: () => modifier({ ecran: "galerie" }),
    fermerOutil: () => modifier({ ecran: "simulateur" }),
    passerAuSecretariat: () => modifier({ outil: "secretariat" }),
    recommencer: () => {
      effacerPassation();
      modifier({
        ecran: "simulateur",
        outil: "prescripteur",
        situationDev: null,
        cle: etat.cle + 1,
      });
    },
  };
}

function ecranDe(acces: AccesIdentification): Ecran {
  if (acces.destination === "galerie") return "galerie";
  if (acces.destination === "labo") return "labo";
  return "simulateur";
}
