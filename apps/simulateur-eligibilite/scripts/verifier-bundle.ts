// Garde-fou de découpage du bundle, à passer **après** `vite build`.
//
// Le CERFA porte des données de santé nominatives : il est généré dans le
// navigateur, et `pdf-lib` comme le gabarit (767 ko) ne sont chargés qu'au clic,
// par import dynamique. C'est une intention d'architecture, pas un effet de bord :
// un `import` statique mal placé la casserait sans que rien n'échoue — le
// simulateur continuerait de marcher, simplement en faisant télécharger 1,2 Mo à
// chaque prescripteur, dont beaucoup ne verront jamais de CERFA.
//
// Même chose pour la galerie de seeds, réservée au service produit.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../dist/assets");

/**
 * Premier identifiant du catalogue de seeds. Marqueur préféré à un libellé
 * d'interface : « Galerie de seeds » est aussi le texte du bouton que rend
 * `App.tsx`, donc légitimement présent dans le chunk d'entrée. Un identifiant de
 * seed, lui, n'existe que dans le catalogue — et le lire ici plutôt que le recopier
 * évite que ce garde-fou ne pointe un jour vers une seed supprimée.
 */
function premiereSeed(): string {
  const catalogue = readFileSync(
    resolve(dist, "../../front/outils-produit/seeds/catalogue.ts"),
    "utf-8",
  );
  const id = catalogue.match(/id:\s*"([^"]+)"/)?.[1];
  if (!id) throw new Error("Aucun `id:` trouvé dans le catalogue de seeds.");
  return id;
}

/** Marqueurs cherchés dans le chunk d'entrée, avec ce qu'ils trahissent. */
const INTERDITS: ReadonlyArray<[marqueur: string, quoi: string]> = [
  ["PDFDocument", "pdf-lib (génération du CERFA)"],
  [premiereSeed(), "le catalogue de seeds (service produit)"],
];

/** Le chunk d'entrée : celui que `index.html` charge, nommé `index-*.js`. */
function chunkEntree(): { nom: string; contenu: string } {
  const nom = readdirSync(dist).find((f) => /^index-.*\.js$/.test(f));
  if (!nom) {
    throw new Error(
      `Aucun chunk d'entrée dans ${dist} — lancer \`npm run build\` d'abord.`,
    );
  }
  return { nom, contenu: readFileSync(join(dist, nom), "utf-8") };
}

const { nom, contenu } = chunkEntree();
const fautifs = INTERDITS.filter(([marqueur]) => contenu.includes(marqueur));

const ko = (o: number) => `${Math.round(o / 1024)} ko`;
console.log(`chunk d'entrée : ${nom} (${ko(statSync(join(dist, nom)).size)})`);

if (fautifs.length > 0) {
  console.error(
    `\n✗ Le chunk d'entrée embarque ce qui devait rester à la demande :\n` +
      fautifs.map(([, quoi]) => `  - ${quoi}`).join("\n") +
      `\n\nVérifier qu'aucun \`import\` statique n'a remplacé un \`import()\`.`,
  );
  process.exit(1);
}

console.log(
  `✓ ${INTERDITS.length} modules à la demande absents du chunk d'entrée.`,
);
