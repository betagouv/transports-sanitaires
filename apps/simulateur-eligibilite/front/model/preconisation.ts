// La préconisation : des réponses aux faits, puis des faits aux cibles, que les
// règles publicodes de l'éditeur calculent.

import Engine from "publicodes";
import type { Answers } from "../socle";
import { CIBLES, type Cibles } from "./declarations/cibles";
import { AUCUN_FAIT, type Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";
import { rules } from "./rules/regles.publicodes";

/**
 * Des réponses aux faits. Aucune question posée n'en établit encore : Q0.1 dit
 * un besoin, pas un fait.
 */
export function faits(_answers: Answers<Questions>): Faits {
  return AUCUN_FAIT;
}

/** Des faits aux cibles : ce que les règles en calculent. */
export function cibles(faits: Faits): Cibles {
  const moteur = moteurDesRegles();
  moteur.setSituation(situationDe(faits));
  return Object.fromEntries(
    CIBLES.map((cible) => [cible, moteur.evaluate(cible).nodeValue]),
  ) as Cibles;
}

// ---- implémentation ----

// Compiler les règles coûte : le moteur est créé au premier calcul, puis gardé.
let moteur: Engine | undefined;

function moteurDesRegles(): Engine {
  moteur ??= new Engine(rules);
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
