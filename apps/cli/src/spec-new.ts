// Créer une spec : le prochain id, un nom de fichier conforme, le gabarit du
// tracker.

import fs from "node:fs";
import path from "node:path";
import { findApp, unknownApp } from "./apps.ts";
import { git } from "./git.ts";
import type { Invocation } from "./invocation.ts";
import { print, printError } from "./output.ts";
import { etatDir, listSpecs, trackerOf } from "./trackers.ts";

/** `tsp spec new <module> <type> <titre> [--app <app>]` */
export function newCommand(invocation: Invocation): number {
  const { root, args, options } = invocation;
  const [module, type, ...words] = args;
  const titre = words.join(" ");
  if (!module || !type || titre === "") {
    printError("Usage : tsp spec new <module> <type> <titre> [--app <app>].");
    return 1;
  }
  if (!SPEC_TYPES.includes(type)) {
    printError(
      `Type inconnu : « ${type} ». Types permis : ${SPEC_TYPES.join(", ")}.`,
    );
    return 1;
  }
  const tracker = trackerFor(root, options.app);
  if (!tracker) {
    printError(unknownApp(root, options.app!));
    return 1;
  }
  const id = nextId(root);
  const name = `${id}__${module}__${slug(titre)}.${type}.md`;
  const chemin = path.join(tracker, etatDir("drafts"), name);
  fs.mkdirSync(path.dirname(path.join(root, chemin)), { recursive: true });
  fs.writeFileSync(
    path.join(root, chemin),
    content(root, tracker, { id, module, type, titre }),
  );
  print(chemin);
  return 0;
}

// ---- implémentation ----

type Header = { id: string; module: string; type: string; titre: string };

/** Les types que nomme le gabarit de spec. */
const SPEC_TYPES = ["feat", "fix", "refactor", "tech", "chore", "docs", "test"];

/** La première section du gabarit : ce qui la précède est son mode d'emploi. */
const FIRST_SECTION = "## Problem Statement";

/** La racine sans `--app`, le tracker de l'app sinon. Rien si l'app est inconnue. */
function trackerFor(root: string, alias?: string): string | undefined {
  if (alias === undefined) return trackerOf("");
  const app = findApp(root, alias);
  return app ? trackerOf(app.dir) : undefined;
}

/**
 * Un id ne resert jamais, même après la suppression de sa spec : l'historique
 * git compte autant que l'arbre de travail.
 */
function nextId(root: string): string {
  const added = git(root, [
    "log",
    "--all",
    "--diff-filter=A",
    "--name-only",
    "--format=",
    "--",
    "*docs/specs/*",
  ]);
  const past = added
    .split("\n")
    .map((file) => /^(\d{3})__/.exec(path.basename(file))?.[1])
    .filter((id) => id !== undefined);
  const present = listSpecs(root).map((spec) => spec.id);
  const highest = Math.max(0, ...[...past, ...present].map(Number));
  return String(highest + 1).padStart(3, "0");
}

function slug(titre: string): string {
  return titre
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function content(root: string, tracker: string, header: Header): string {
  return [
    `# ${header.titre}`,
    "",
    "| Champ       | Valeur |",
    "|-------------|--------|",
    `| id          | \`${header.id}\` |`,
    `| module      | ${header.module} |`,
    `| type        | ${header.type} |`,
    "| bloquée par | — |",
    "| notion      | — |",
    "",
    sections(root, tracker),
  ].join("\n");
}

function sections(root: string, tracker: string): string {
  const template = path.join(root, tracker, "TEMPLATE.md");
  if (!fs.existsSync(template)) return `${FIRST_SECTION}\n`;
  const markdown = fs.readFileSync(template, "utf8");
  const start = markdown.indexOf(FIRST_SECTION);
  return start === -1 ? `${FIRST_SECTION}\n` : markdown.slice(start);
}
