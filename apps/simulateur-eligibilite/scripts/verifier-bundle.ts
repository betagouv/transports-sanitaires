// Vérifie le découpage du bundle, après `vite build` : le chunk d'entrée ne doit
// pas contenir ce qui se charge à la demande.

import { readdirSync, readFileSync, statSync } from "node:fs";
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
 * rien casser. Même chose pour l'écran des seeds, réservé au service produit.
 */
function interdits(): Array<[marqueur: string, quoi: string]> {
  const marqueurs: Array<[string, string]> = [
    ["PDFDocument", "pdf-lib (remplissage d'un PDF)"],
  ];
  const seed = premiereSeed();
  if (seed) marqueurs.push([seed, "le catalogue de seeds (service produit)"]);
  return marqueurs;
}

/**
 * Le premier identifiant du catalogue de seeds, s'il y en a un. Un libellé ne
 * convient pas comme marqueur : « Seeds » est aussi le texte du bouton d'`App`,
 * présent à bon droit dans le chunk d'entrée. Un identifiant de seed n'existe
 * que dans le catalogue. Le lire ici évite de pointer une seed supprimée.
 */
function premiereSeed(): string | undefined {
  const catalogue = readFileSync(
    resolve(dist(), "../../front/seeds/catalogue.ts"),
    "utf-8",
  );
  return catalogue.match(/id:\s*"([^"]+)"/)?.[1];
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
