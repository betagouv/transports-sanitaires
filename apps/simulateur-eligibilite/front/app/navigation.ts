// Où l'on se trouve dans l'application, et comment on en change : la porte
// de rattachement, les deux écrans d'outils produit qui s'y superposent, et
// l'outil du simulateur affiché derrière.
//
// Le rattachement, lui, ne transite pas par ici : la porte le range en session,
// et `rattacher` ne retient que le booléen d'accès aux outils produit.

import type { Situation } from "publicodes";
import { useState } from "react";
import {
  ouvreLeQuestionnaire,
  type Seed,
  situationDe,
} from "../outils-produit/seeds/seed";
import type { AccesRattachement } from "../rattachement/Rattachement";
import { effacerPassation, emettrePassation } from "../simulateur/passation";
import type { Outil } from "./outil";

type Ecran = "rattachement" | "galerie" | "labo" | "simulateur";

export type Navigation = {
  ecran: Ecran;
  outil: Outil;
  // Le service choisi déverrouille-t-il les outils produit (service n° 4) ?
  // Retenu à la validation pour pouvoir les reproposer au début du parcours —
  // c'est un booléen, pas une identité : l'invariant de `docs/knowledge` tient.
  outilsProduit: boolean;
  // Situation qui ouvre directement une page de résultat : celle d'une seed, ou
  // celle du retour au résultat médical depuis le document.
  situationDev: Situation<string> | null;
  // Remontée à chaque nouvelle simulation pour remonter (remount) l'outil et
  // repartir d'un parcours vierge.
  cle: number;
  // Les outils produit s'ouvrent **après** la porte : on entre rattaché,
  // quelle que soit la destination.
  rattacher: (acces: AccesRattachement) => void;
  // Ouvre la seed choisie sur l'écran qu'elle déclare : sa page de résultat en
  // sautant le questionnaire, ou le questionnaire lui-même là où elle s'arrête.
  // Le rattachement, lui, a déjà eu lieu : on n'arrive ici que par la porte.
  ouvrirSeed: (seed: Seed) => void;
  ouvrirGalerie: () => void;
  fermerOutil: () => void;
  passerAuSecretariat: () => void;
  // Retour du document au résultat médical, quand la Partie 2 n'a rien eu à
  // poser : l'écran d'avant, c'est celui-là. Le parcours médical est rouvert sur
  // sa situation, donc sur son résultat (cf. `questionnaire/rejeu.ts`).
  revenirAuResultatMedical: (situationP1: Situation<string>) => void;
  recommencer: () => void;
};

// `outilInitial` est une fonction : elle n'est appelée qu'au premier rendu
// (initialiseur paresseux de `useState`), pas à chaque passage.
export function useNavigation(outilInitial: () => Outil): Navigation {
  const [etat, setEtat] = useState<Etat>(() => ({
    ecran: "rattachement",
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
    rattacher: (acces) =>
      modifier({ ecran: ecranDe(acces), outilsProduit: acces.outilsProduit }),
    ouvrirSeed: (seed) => ouvrirLaSeed(seed, etat, modifier),
    ouvrirGalerie: () => modifier({ ecran: "galerie" }),
    fermerOutil: () => modifier({ ecran: "simulateur" }),
    // La situation de seed est déposée en passant : le secrétariat qualifie ce
    // que la passation lui porte, il n'ouvre pas un résultat tout fait.
    passerAuSecretariat: () =>
      modifier({ outil: "secretariat", situationDev: null }),
    revenirAuResultatMedical: (situationP1) =>
      modifier({
        ecran: "simulateur",
        outil: "prescripteur",
        situationDev: situationP1,
        cle: etat.cle + 1,
      }),
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

// Une seed de résultat entre par `situationDev`, qui court-circuite le
// questionnaire. Une seed de questionnaire prend au contraire le chemin normal :
// elle se **passe** au secrétariat comme le ferait un prescripteur, et le
// parcours s'ouvre sur la première question qu'elle laisse sans réponse. La clé
// remonte pour repartir d'un parcours vierge, la seed pouvant être rouverte.
function ouvrirLaSeed(
  seed: Seed,
  etat: Etat,
  modifier: (partiel: Partial<Etat>) => void,
) {
  const situation = situationDe(seed);
  if (!ouvreLeQuestionnaire(seed))
    return modifier({
      ecran: "simulateur",
      outil: seed.outil,
      situationDev: situation,
    });
  emettrePassation(situation);
  modifier({
    ecran: "simulateur",
    outil: seed.outil,
    situationDev: null,
    cle: etat.cle + 1,
  });
}

function ecranDe(acces: AccesRattachement): Ecran {
  if (acces.destination === "galerie") return "galerie";
  if (acces.destination === "labo") return "labo";
  return "simulateur";
}
