// Le moteur de décision : des faits aux cibles, par les règles publicodes d'un
// modèle.
//
// Le socle ne connaît ni les règles ni leurs noms : le modèle les lui donne.
// Ce fichier est le seul du socle à importer publicodes. Le modèle le prend
// ici, hors du point d'entrée du socle, pour que publicodes reste hors du
// chunk d'entrée.

import Engine, { type RawPublicodes } from "publicodes";

/** Ce que des règles calculent pour des faits. */
export type DecisionEngine<Faits, Cibles> = {
  /** Toutes les cibles de ces faits : la préconisation. */
  cibles(faits: Faits): Cibles;
  /** Une seule cible de ces faits, quand le questionnaire en a besoin en route. */
  cible<Nom extends keyof Cibles>(faits: Faits, nom: Nom): Cibles[Nom];
};

/** Le moteur de ces règles, qui rend ces cibles. */
export function publicodesEngine<
  Faits extends Readonly<Record<string, unknown>>,
  Cibles extends Readonly<Record<string, unknown>>,
>(
  rules: RawPublicodes<string>,
  cibles: readonly (keyof Cibles & string)[],
): DecisionEngine<Faits, Cibles> {
  // Compiler les règles coûte : le moteur est créé au premier calcul, puis gardé.
  let engine: Engine | undefined;
  const on = (faits: Faits) => {
    engine ??= new Engine(rules);
    engine.setSituation(situationOf(faits));
    return engine;
  };
  return {
    cibles: (faits) => {
      const evaluated = on(faits);
      return Object.fromEntries(
        cibles.map((cible) => [cible, evaluated.evaluate(cible).nodeValue]),
      ) as Cibles;
    },
    cible: (faits, nom) =>
      on(faits).evaluate(nom as string).nodeValue as Cibles[typeof nom],
  };
}

// ---- implémentation ----

// Les règles lisent un booléen comme « oui » ou « non ».
function situationOf(faits: Readonly<Record<string, unknown>>) {
  return Object.fromEntries(
    Object.entries(faits).map(([fait, valeur]) => [
      fait,
      typeof valeur === "boolean" ? (valeur ? "oui" : "non") : valeur,
    ]),
  ) as Record<string, string | number>;
}
