import yaml from "js-yaml";
import type { RawPublicodes } from "publicodes";
import Engine from "publicodes";
import { desactiverLabo, reglesLaboActives } from "../outils-produit/labo/labo";
import type { CleDeRegle } from "./contrat-regles-publicodes";

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
function initMoteur(): { regles: RawPublicodes<string>; moteur: Engine } {
  const laboYaml = reglesLaboActives();
  if (laboYaml) {
    try {
      const regles = yaml.load(laboYaml) as RawPublicodes<string>;
      return { regles, moteur: new Engine(regles, OPTIONS) };
    } catch (err) {
      console.error(
        "[labo] Règles de test invalides — retour aux règles officielles.",
        err,
      );
      desactiverLabo();
    }
  }
  return {
    regles: reglesOfficielles,
    moteur: new Engine(reglesOfficielles, OPTIONS),
  };
}

const charge = initMoteur();

export const moteur = charge.moteur;

// Règles brutes (nœuds YAML) pour lire les métadonnées custom non interprétées
// par le moteur — notamment la clé `mosaique` (cf. `mosaique.ts`).
export const reglesBrutes = charge.regles;

// ---- Lecture d'une règle -----------------------------------------------------
//
// Deux formes suffisent à tout le produit : une valeur affichable et un booléen.
// Elles passent par `CleDeRegle`, donc une clé absente du contrat ne compile pas —
// c'est la seule raison d'être de ces helpers, la brièveté n'est qu'un bonus.
// Le moteur est passé en argument : les pages de résultat font un unique
// `setSituation` puis lisent plusieurs cibles sur le moteur ainsi positionné.

/** La valeur d'une règle, en texte. Vide plutôt que `null` : le modèle laisse des
 *  sorties indéterminées tant que le parcours n'a pas tranché. */
export function texte(moteurPositionne: Engine, cle: CleDeRegle): string {
  return String(moteurPositionne.evaluate(cle).nodeValue ?? "");
}

/** Une règle booléenne. Faux tant qu'elle n'est pas explicitement vraie. */
export function vrai(moteurPositionne: Engine, cle: CleDeRegle): boolean {
  return moteurPositionne.evaluate(cle).nodeValue === true;
}
