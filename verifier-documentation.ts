// La section « Communication » d'AGENTS.md, rendue exécutable sur la
// documentation du dépôt.
//
// Elle était de la prose, et la doc écrite avant elle ne la suivait pas : 69
// paragraphes de quatre lignes ou plus, 84 tirets cadratins, des énumérations
// de trois éléments écrites en phrase. Une convention de style que rien ne
// vérifie se dégrade à la vitesse où elle s'écrit.
//
// La garde vit à la racine, et pas dans le `verifier` d'une app, pour la même
// raison que `pnpm audit` : `AGENTS.md`, les `README.md` et `docs/` débordent
// des apps. Comme dans les tests des apps, chaque règle porte son *pourquoi*
// dans son message d'échec.
//
// Lancer : `pnpm verifier-documentation`.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import { relative } from "node:path";
import test from "node:test";

/** Un écart relevé : le fichier, la ligne, et le texte fautif. */
export type Ecart = {
  fichier: string;
  ligne: number;
  extrait: string;
};

/**
 * Un bloc de texte du fichier. Un `item` de liste se juge à la phrase, pas au
 * paragraphe : c'est déjà la forme rangée qu'on demande.
 */
type Bloc = { ligne: number; texte: string; type: "prose" | "item" };

const MOTS_PAR_PHRASE = 25;
const PHRASES_PAR_PARAGRAPHE = 4;

// Le contenu rédactionnel de référence des pages de résultat : ces fichiers
// sont recopiés dans l'interface, mot pour mot. Les reformuler changerait le
// produit, pas la documentation.
const REDACTIONNEL = [
  "docs/specs/page-resultat-medical.md",
  "docs/specs/page-resultat-administratif.md",
];

// Les deux recueils de règles numérotées, dont l'index doit rester complet.
const RECUEILS = [
  "docs/contributing/regles-de-code.md",
  "docs/contributing/regles-git.md",
];

// Écrits avant la section « Communication », pas encore repris. Retirer une
// ligne d'ici est le geste qui clôt la reprise d'un fichier. La liste doit
// finir vide.
const A_REPRENDRE = [
  "apps/simulateur-eligibilite/README.md",
  "apps/data-analyzer/README.md",
  "docs/architecture/identification.md",
  "docs/architecture/analytics.md",
  "docs/specs/etl-part-plateformes.md",
  "docs/specs/enrichissement-referentiel-saisies-libres.md",
  "docs/specs/formalisation-mosaique-choix-multiple.md",
  ".claude/skills/livrer-une-version/SKILL.md",
  ".claude/skills/regle-publicodes/SKILL.md",
  ".claude/skills/situation-de-reference/SKILL.md",
];

test("pas de tiret cadratin", async () => {
  const ecarts = (await documents()).flatMap(tiretsCadratins);
  assert.deepEqual(
    ecarts,
    [],
    formuler(
      ecarts,
      "Le cadratin suspend la phrase et repousse son sens à l'incise suivante. " +
        "Deux points quand ce qui suit explique, parenthèses quand c'est un " +
        "aparté, point quand c'est une deuxième phrase. Un titre qui nomme son " +
        "identifiant prend un trait d'union : `QUAL-001 - Nom de la règle`.",
    ),
  );
});

test("une phrase tient en 25 mots", async () => {
  const ecarts = (await documents()).flatMap(phrasesLongues);
  assert.deepEqual(
    ecarts,
    [],
    formuler(
      ecarts,
      `Passé ${MOTS_PAR_PHRASE} mots, une phrase porte deux idées et un lecteur ` +
        "en perd une. Coupe-la. Si la phrase énumère trois éléments ou plus, " +
        "c'est une liste à puces qui s'écrivait.",
    ),
  );
});

test("un paragraphe tient en 4 phrases", async () => {
  const ecarts = (await documents()).flatMap(paragraphesFleuves);
  assert.deepEqual(
    ecarts,
    [],
    formuler(
      ecarts,
      `Passé ${PHRASES_PAR_PARAGRAPHE} phrases, un paragraphe couvre plusieurs ` +
        "sujets : il se coupe au changement de sujet, ou il devient une liste " +
        "ou un tableau. Le fond reste argumenté, c'est la forme qui se range.",
    ),
  );
});

test("les listes d'exemption nomment des fichiers qui existent", () => {
  const disparus = [...REDACTIONNEL, ...A_REPRENDRE].filter(
    (fichier) => !existsSync(fichier),
  );
  assert.deepEqual(
    disparus,
    [],
    formuler(
      disparus.map((fichier) => ({
        fichier,
        ligne: 0,
        extrait: "introuvable",
      })),
      "Un fichier renommé ou supprimé laisserait son exemption derrière lui, " +
        "et l'exemption suivante s'appliquerait à un fichier qui n'existe pas. " +
        "Retire la ligne, ou corrige le chemin.",
    ),
  );
});

test("le décompte annoncé par un recueil est le bon", () => {
  const faux = RECUEILS.flatMap(decompteFaux);
  assert.deepEqual(
    faux,
    [],
    formuler(
      faux,
      "Le recueil annonce en tête combien de règles il porte, et c'est ce que " +
        "lit qui ne le déroule pas. Le chiffre se met à jour avec la règle " +
        "qu'on ajoute ou qu'on retire, pas plus tard.",
    ),
  );
});

test("chaque règle numérotée est dans l'index de son recueil", () => {
  const absentes = RECUEILS.flatMap(reglesHorsIndex);
  assert.deepEqual(
    absentes,
    [],
    formuler(
      absentes,
      "Le tableau en tête du recueil est ce qu'on lit pour savoir quelles " +
        "règles existent. Une règle qui n'y figure pas est invisible à qui ne " +
        "déroule pas tout le fichier. Ajoute-lui sa ligne : identifiant, titre, " +
        "garde.",
    ),
  );
});

// ---- implémentation ----

/**
 * Le recueil dont l'en-tête annonce un autre nombre de règles qu'il n'en porte.
 * Le décompte est écrit en chiffres, et non en toutes lettres, pour être lu ici.
 */
function decompteFaux(fichier: string): Ecart[] {
  const texte = readFileSync(fichier, "utf8");
  const regles = (texte.match(/^### [A-Z]+-\d+ - /gm) ?? []).length;
  const annonce = /\*\*(\d+) règles?\*\*/.exec(texte);
  if (annonce && Number(annonce[1]) === regles) return [];
  const dit = annonce ? annonce[1] : "rien";
  return [
    {
      fichier,
      ligne: 1,
      extrait: `annonce ${dit}, porte ${regles} règles`,
    },
  ];
}

/**
 * Les règles dont le titre `### ID - Titre` n'a pas de ligne `| ID |` dans le
 * tableau d'index. L'inverse, une ligne d'index sans règle, se voit à la
 * lecture ; une règle sans ligne d'index, non.
 */
function reglesHorsIndex(fichier: string): Ecart[] {
  const lignes = readFileSync(fichier, "utf8").split("\n");
  const indexes = new Set(
    lignes
      .filter((ligne) => ligne.startsWith("|"))
      .map((ligne) => /^\|\s*([A-Z]+-\d+)\s*\|/.exec(ligne)?.[1])
      .filter((identifiant) => identifiant !== undefined),
  );
  return lignes.flatMap((ligne, index) => {
    const titre = /^### ([A-Z]+-\d+) - /.exec(ligne);
    if (!titre || indexes.has(titre[1])) return [];
    return [ecart(fichier, index + 1, ligne)];
  });
}

/**
 * Toute la documentation du dépôt. Les deux motifs ne font pas double emploi :
 * `**` ne descend pas dans un dossier caché, donc `.claude/skills/` a besoin du
 * sien. Sans lui, les modes d'emploi passaient sous le radar sans que rien ne
 * le dise.
 */
async function documents(): Promise<string[]> {
  const exclus = new Set([...REDACTIONNEL, ...A_REPRENDRE]);
  const trouves: string[] = [];
  for await (const chemin of glob(["**/*.md", ".claude/skills/**/*.md"], {
    exclude: (nom) => nom === "node_modules" || nom === "tmp" || nom === ".git",
  })) {
    const relatif = relative(".", chemin).replaceAll("\\", "/");
    if (!exclus.has(relatif) && !relatif.endsWith("CHANGELOG.md")) {
      trouves.push(relatif);
    }
  }
  return trouves.sort();
}

/**
 * Le cadratin se cherche sur les lignes brutes, et pas sur les blocs de prose :
 * il s'en glisse aussi dans un titre et dans une cellule de tableau, que le
 * découpage en blocs écarte. Seuls les blocs de code sont hors jeu, un exemple
 * pouvant légitimement en porter un.
 */
function tiretsCadratins(fichier: string): Ecart[] {
  const ecarts: Ecart[] = [];
  const cloture = suiviDeCloture();
  corpsDe(fichier).forEach((brute, index) => {
    if (cloture.basculeSur(brute)) return;
    // Un cadratin entre backticks est un caractère dont on parle, pas une
    // typographie qu'on emploie : c'est ainsi que la garde se décrit
    // elle-même dans le skill `regle-de-contribution`.
    if (
      !cloture.dansDuCode() &&
      brute.replaceAll(/`[^`]*`/g, "").includes("—")
    ) {
      ecarts.push(ecart(fichier, index + 1, brute));
    }
  });
  return ecarts;
}

/**
 * Le suivi des blocs de code. Markdown clôture par backticks ou par tildes, et
 * seule la marque qui a ouvert peut refermer : c'est ce qui permet d'imbriquer
 * un bloc dans l'autre, comme le fait le squelette de règle du skill
 * `regle-de-contribution`. Ne pas distinguer les deux ferait lire l'intérieur
 * du bloc extérieur comme de la prose.
 */
function suiviDeCloture() {
  let ouverte: string | undefined;
  return {
    dansDuCode: () => ouverte !== undefined,
    basculeSur(brute: string): boolean {
      const marque = /^(```+|~~~+)/.exec(brute.trim())?.[1];
      if (!marque) return false;
      if (ouverte === undefined) ouverte = marque[0];
      else if (marque[0] === ouverte) ouverte = undefined;
      return true;
    },
  };
}

function phrasesLongues(fichier: string): Ecart[] {
  return blocs(fichier).flatMap((bloc) =>
    phrasesDe(bloc.texte)
      .filter((phrase) => compterMots(phrase) > MOTS_PAR_PHRASE)
      .map((phrase) => ecart(fichier, bloc.ligne, phrase)),
  );
}

function paragraphesFleuves(fichier: string): Ecart[] {
  return blocs(fichier)
    .filter((bloc) => bloc.type === "prose")
    .filter((bloc) => phrasesDe(bloc.texte).length > PHRASES_PAR_PARAGRAPHE)
    .map((bloc) => ecart(fichier, bloc.ligne, bloc.texte));
}

/**
 * Les blocs de texte du fichier, avec leur première ligne. Un item de liste
 * ouvre son propre bloc et emporte ses lignes de continuation. On écarte ce qui
 * n'est pas de la phrase : titres, tableaux et blocs de code.
 *
 * Une citation compte, elle : c'est là que vivent les `> Raison :` des règles
 * d'AGENTS.md, et rien ne justifie qu'une raison échappe à la règle de forme
 * qu'elle motive.
 */
function blocs(fichier: string): Bloc[] {
  const lignes = corpsDe(fichier);
  const trouves: Bloc[] = [];
  let courant: string[] = [];
  let debut = 0;
  let type: Bloc["type"] = "prose";
  const cloture = suiviDeCloture();

  const fermer = () => {
    if (courant.length > 0) {
      trouves.push({ ligne: debut, texte: courant.join(" "), type });
    }
    courant = [];
  };

  lignes.forEach((brute, index) => {
    const ligne = brute.trim().replace(/^>\s?/, "");
    if (cloture.basculeSur(ligne)) {
      fermer();
      return;
    }
    if (cloture.dansDuCode() || ligne === "" || estStructure(ligne)) {
      fermer();
      return;
    }
    if (estItem(ligne)) {
      fermer();
      type = "item";
    } else if (courant.length === 0) {
      type = "prose";
    }
    if (courant.length === 0) debut = index + 1;
    courant.push(ligne);
  });
  fermer();
  return trouves;
}

/**
 * Les lignes du fichier, frontmatter YAML retiré. Un `description:` de skill
 * est de la métadonnée lue par l'outillage, pas une phrase écrite pour un
 * lecteur : la juger sur sa longueur n'aurait aucun sens. Les numéros de ligne
 * restent ceux du fichier.
 */
function corpsDe(fichier: string): string[] {
  const lignes = readFileSync(fichier, "utf8").split("\n");
  if (lignes[0]?.trim() !== "---") return lignes;
  const fin = lignes.findIndex(
    (ligne, index) => index > 0 && ligne.trim() === "---",
  );
  if (fin === -1) return lignes;
  return lignes.map((ligne, index) => (index <= fin ? "" : ligne));
}

function estItem(ligne: string): boolean {
  return /^([-*]|\d+\.)\s/.test(ligne);
}

function estStructure(ligne: string): boolean {
  return (
    ligne.startsWith("#") || ligne.startsWith("|") || ligne.startsWith("---")
  );
}

/**
 * Découpe en phrases. Le code inline part d'abord : il porte des points
 * (`server.ts`, `1.2.0`) qui n'en terminent aucune. Les abréviations courantes
 * du dépôt sont protégées pour la même raison.
 */
function phrasesDe(texte: string): string[] {
  const propre = texte
    .replaceAll(/`[^`]*`/g, "·")
    .replaceAll(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replaceAll(/\*+/g, "")
    .replaceAll(/(cf|ex|réf|art|n°|p|vs|etc)\.\s/gi, "$1· ");
  return propre
    .split(/(?<=[.!?…])\s+(?=[«"A-ZÀÂÉÈÊËÎÏÔÙÛÜÇ])/)
    .map((phrase) => phrase.trim())
    .filter((phrase) => compterMots(phrase) > 2);
}

function compterMots(phrase: string): number {
  return phrase.split(/\s+/).filter((mot) => /[a-zà-ÿ]/i.test(mot)).length;
}

function ecart(fichier: string, ligne: number, texte: string): Ecart {
  const plat = texte.replaceAll(/\s+/g, " ").trim();
  return {
    fichier,
    ligne,
    extrait: plat.length > 110 ? `${plat.slice(0, 110)}…` : plat,
  };
}

function formuler(ecarts: Ecart[], pourquoi: string): string {
  const liste = ecarts
    .map(({ fichier, ligne, extrait }) => `  ${fichier}:${ligne}  ${extrait}`)
    .join("\n");
  return `${pourquoi}\n\n${liste}`;
}
