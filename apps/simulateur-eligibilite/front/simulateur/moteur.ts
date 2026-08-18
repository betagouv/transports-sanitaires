// Le moteur publicodes de l'app, et les deux seules façons d'en lire une règle.

import yaml from "js-yaml";
import type { RawPublicodes } from "publicodes";
import Engine from "publicodes";
import { desactiverLabo, reglesLaboActives } from "../outils-produit/labo/labo";
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

// ---- implémentation ----
//
// `texte` et `vrai` suffisent à tout le produit. Elles passent par `CleDeRegle`,
// donc une clé absente du contrat ne compile pas — c'est leur seule raison d'être,
// la brièveté n'est qu'un bonus.

// Choisit les règles à charger : celles du **mode labo** (test de règles par le
// produit, cf. `outils-produit/labo/labo.ts`) si présentes et valides, sinon les
// règles officielles embarquées dans le build.
// Auto-réparation : des règles labo qui ne compilent pas sont désactivées et on
// retombe sur les officielles plutôt que de bloquer toute l'app.
function chargerMoteur(): {
  moteur: Engine;
  reglesBrutes: RawPublicodes<string>;
} {
  const laboYaml = reglesLaboActives();
  if (laboYaml) {
    try {
      const regles = yaml.load(laboYaml) as RawPublicodes<string>;
      return {
        moteur: new Engine(regles, optionsMoteur()),
        reglesBrutes: regles,
      };
    } catch (err) {
      console.error(
        "[labo] Règles de test invalides — retour aux règles officielles.",
        err,
      );
      desactiverLabo();
    }
  }
  const regles = reglesOfficielles();
  return { moteur: new Engine(regles, optionsMoteur()), reglesBrutes: regles };
}

// Règles **officielles**, embarquées dans le build depuis `regles/*.publicodes`.
// Assemblées à la demande : le mode labo n'en paie pas le coût.
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
