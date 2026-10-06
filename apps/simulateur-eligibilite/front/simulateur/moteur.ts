// Le moteur publicodes de l'app, et les deux seules façons d'en lire une règle.

import yaml from "js-yaml";
import type { RawPublicodes } from "publicodes";
import Engine from "publicodes";
import type { CleDeRegle } from "./contrat-regles-publicodes";

/**
 * Moteur amorcé une fois pour toute l'app, et règles brutes (nœuds YAML) qui
 * l'accompagnent — celles-ci portent les métadonnées custom non interprétées par le
 * moteur, notamment la clé `mosaique` (cf. `questionnaire/mosaique.ts`).
 */
export const { moteur, reglesBrutes } = chargerMoteur();

/**
 * La valeur d'une règle, en texte. Vide plutôt que `null` : le modèle laisse des
 * sorties indéterminées tant que le parcours n'a pas tranché.
 *
 * Le moteur est passé en argument : les pages de résultat font un unique
 * `setSituation` puis lisent plusieurs cibles sur le moteur ainsi positionné.
 */
export function texte(moteurPositionne: Engine, cle: CleDeRegle): string {
  return String(moteurPositionne.evaluate(cle).nodeValue ?? "");
}

/** Une règle booléenne. Faux tant qu'elle n'est pas explicitement vraie. */
export function vrai(moteurPositionne: Engine, cle: CleDeRegle): boolean {
  return moteurPositionne.evaluate(cle).nodeValue === true;
}

/**
 * Une règle booléenne **explicitement fausse**. Ce n'est pas la négation de
 * `vrai` : une sortie que le parcours n'a pas tranchée n'est ni l'une ni l'autre.
 *
 * Les Cerfa en font la différence, et le contrat de rendu de la v9.7 la demande
 * mot pour mot — « case Non uniquement si la cible source est explicitement
 * false ». Cocher « Non » sur une question sans réponse serait une déclaration
 * que personne n'a faite.
 */
export function faux(moteurPositionne: Engine, cle: CleDeRegle): boolean {
  return moteurPositionne.evaluate(cle).nodeValue === false;
}

/**
 * Une règle explicitement **non applicable** : son `applicable si` a tranché
 * non, pas seulement une dépendance encore sans réponse (auquel cas
 * publicodes rendrait `null`, ni applicable ni inapplicable).
 */
export function inapplicable(
  moteurPositionne: Engine,
  cle: CleDeRegle,
): boolean {
  return (
    moteurPositionne.evaluate({ "est applicable": cle }).nodeValue === false
  );
}

// ---- implémentation ----
//
// `texte`, `vrai`, `faux` et `inapplicable` suffisent à tout le produit. Elles
// passent par `CleDeRegle`, donc une clé absente du contrat ne compile pas —
// c'est leur seule raison d'être, la brièveté n'est qu'un bonus.

function chargerMoteur(): {
  moteur: Engine;
  reglesBrutes: RawPublicodes<string>;
} {
  const regles = reglesOfficielles();
  return { moteur: new Engine(regles, optionsMoteur()), reglesBrutes: regles };
}

// Règles **officielles**, embarquées dans le build depuis `regles/*.publicodes`.
function reglesOfficielles(): RawPublicodes<string> {
  const modules = import.meta.glob("../../regles/*.publicodes", {
    query: "?raw",
    import: "default",
    eager: true,
  });
  return Object.assign(
    {},
    ...Object.values(modules).map(
      (contenu) => yaml.load(contenu as string) as RawPublicodes<string>,
    ),
  );
}

// Hoistée, et non un `const` : le point d'entrée du fichier s'exécute au
// chargement, donc une constante déclarée ici serait lue en TDZ.
function optionsMoteur() {
  return { flag: { filterNotApplicablePossibilities: true } } as const;
}
