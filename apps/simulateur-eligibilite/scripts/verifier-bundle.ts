// Vérifie le découpage du bundle, après `vite build` : le chunk d'entrée ne doit
// pas contenir ce qui se charge à la demande.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const { nom, contenu } = chunkEntree();
const attendus = interdits();
const fautifs = attendus.filter(([marqueur]) => contenu.includes(marqueur));

console.log(
  `chunk d'entrée : ${nom} (${ko(statSync(join(dist(), nom)).size)})`,
);

if (fautifs.length > 0) {
  console.error(
    `\n✗ Le chunk d'entrée embarque ce qui devait rester à la demande :\n` +
      fautifs.map(([, quoi]) => `  - ${quoi}`).join("\n") +
      `\n\nVérifier qu'aucun \`import\` statique n'a remplacé un \`import()\`.`,
  );
  process.exit(1);
}

console.log(
  `✓ ${attendus.length} modules à la demande absents du chunk d'entrée.`,
);

// ---- implémentation ----

/**
 * Marqueurs cherchés dans le chunk d'entrée, et ce que chacun révèle.
 *
 * `pdf-lib` (~400 ko) ne se charge qu'à la demande, par import dynamique. Un
 * `import` statique mal placé le ferait télécharger à chaque prescripteur, sans
 * rien casser. Même chose pour l'écran des seeds, réservé au service produit,
 * et pour les modèles, qui se chargent pendant l'écran de rattachement. L'énoncé
 * d'une question n'existe que dans le modèle de démonstration, un nom de fait
 * que dans les règles du modèle de l'éditeur, et le schéma de ses textes de R2
 * que dans leur catalogue.
 */
function interdits(): Array<[marqueur: string, quoi: string]> {
  const marqueurs: Array<[string, string]> = [
    ["PDFDocument", "pdf-lib (remplissage d'un PDF)"],
    [
      "Quelle boisson souhaitez-vous",
      "le modèle de démonstration (son questionnaire)",
    ],
    ["fait_p1_complete", "le modèle de l'éditeur (ses règles et publicodes)"],
    ["resultats-html-patient/2", "le catalogue des textes de R2"],
  ];
  for (const seed of premieresSeeds())
    marqueurs.push([seed, "un catalogue de seeds (service produit)"]);
  return marqueurs;
}

/**
 * Le premier identifiant de chaque catalogue de seeds qui en a un : un par
 * modèle. Un libellé ne convient pas comme marqueur : « Seeds » est aussi le
 * texte du bouton d'`App`, présent à bon droit dans le chunk d'entrée. Un
 * identifiant de seed n'existe que dans un catalogue. Le lire ici évite de
 * pointer une seed supprimée.
 */
function premieresSeeds(): string[] {
  const modeles = resolve(dist(), "../../front/models");
  return readdirSync(modeles).flatMap((modele) => {
    const catalogue = join(modeles, modele, "seeds-catalogue.ts");
    if (!existsSync(catalogue)) return [];
    return readFileSync(catalogue, "utf-8").match(/id:\s*"([^"]+)"/)?.[1] ?? [];
  });
}

/** Le chunk d'entrée : celui que `index.html` charge, nommé `index-*.js`. */
function chunkEntree(): { nom: string; contenu: string } {
  const nom = readdirSync(dist()).find((f) => /^index-.*\.js$/.test(f));
  if (!nom) {
    throw new Error(
      `Aucun chunk d'entrée dans ${dist()} — lancer \`pnpm build\` d'abord.`,
    );
  }
  return { nom, contenu: readFileSync(join(dist(), nom), "utf-8") };
}

function dist(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../dist/assets");
}

function ko(octets: number): string {
  return `${Math.round(octets / 1024)} ko`;
}
