// Des faits aux cibles : ce que les règles publicodes de l'éditeur en calculent.

import Engine from "publicodes";
import { CIBLES, type Cibles } from "./declarations/cibles";
import type { Faits } from "./declarations/faits";
import { rules } from "./rules/regles.publicodes";

/** Toutes les cibles de ces faits : la préconisation. */
export function cibles(faits: Faits): Cibles {
  const moteur = moteurSur(faits);
  return Object.fromEntries(
    CIBLES.map((cible) => [cible, moteur.evaluate(cible).nodeValue]),
  ) as Cibles;
}

/** Une seule cible de ces faits, quand le questionnaire en a besoin en route. */
export function cible<Nom extends keyof Cibles>(
  faits: Faits,
  nom: Nom,
): Cibles[Nom] {
  return moteurSur(faits).evaluate(nom).nodeValue as Cibles[Nom];
}

// ---- implémentation ----

// Compiler les règles coûte : le moteur est créé au premier calcul, puis gardé.
let moteur: Engine | undefined;

function moteurSur(faits: Faits): Engine {
  moteur ??= new Engine(rules);
  moteur.setSituation(situationDe(faits));
  return moteur;
}

// Les règles lisent un booléen comme « oui » ou « non ».
function situationDe(faits: Faits) {
  return Object.fromEntries(
    Object.entries(faits).map(([fait, valeur]) => [
      fait,
      typeof valeur === "boolean" ? (valeur ? "oui" : "non") : valeur,
    ]),
  );
}
