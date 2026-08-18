import yaml from "js-yaml";
import type { RawPublicodes } from "publicodes";
import Engine from "publicodes";
import { desactiverLabo, reglesLaboActives } from "../outils-produit/labo/labo";

const OPTIONS = { flag: { filterNotApplicablePossibilities: true } } as const;

// Règles **officielles**, embarquées dans le build depuis `regles/*.publicodes`.
const modules = import.meta.glob("../../regles/*.publicodes", {
  query: "?raw",
  import: "default",
  eager: true,
});

const reglesOfficielles: RawPublicodes<string> = Object.assign(
  {},
  ...Object.values(modules).map(
    (contenu) => yaml.load(contenu as string) as RawPublicodes<string>,
  ),
);

// Choisit les règles à charger : celles du **mode labo** (test de règles par le
// produit, cf. `front/outils-produit/labo/labo.ts`) si présentes et valides, sinon
// les officielles.
// Auto-réparation : des règles labo qui ne compilent pas sont désactivées et on
// retombe sur les officielles plutôt que de bloquer toute l'app.
function initMoteur(): { rules: RawPublicodes<string>; engine: Engine } {
  const laboYaml = reglesLaboActives();
  if (laboYaml) {
    try {
      const rules = yaml.load(laboYaml) as RawPublicodes<string>;
      return { rules, engine: new Engine(rules, OPTIONS) };
    } catch (err) {
      console.error(
        "[labo] Règles de test invalides — retour aux règles officielles.",
        err,
      );
      desactiverLabo();
    }
  }
  return {
    rules: reglesOfficielles,
    engine: new Engine(reglesOfficielles, OPTIONS),
  };
}

const moteur = initMoteur();

export const engine = moteur.engine;

// Règles brutes (nœuds YAML) pour lire les métadonnées custom non interprétées
// par le moteur — notamment la clé `mosaique` (cf. `mosaique.ts`).
export const reglesBrutes = moteur.rules;
