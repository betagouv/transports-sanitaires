// Les règles de contribution : les recueils, l'index d'un recueil, le texte
// d'une règle.

import fs from "node:fs";
import path from "node:path";
import type { Invocation } from "./invocation.ts";
import { firstTable } from "./markdown.ts";
import { columns, emit, printError } from "./output.ts";

/** `tsp rules`, `tsp rules <recueil>`, `tsp rules <id>` */
export function rulesCommand(invocation: Invocation): number {
  const [target] = invocation.args;
  if (target === undefined) return showRecueils(invocation);
  if (REGLE_ID.test(target)) return showRegle(invocation, target.toUpperCase());
  return showRecueil(invocation, target);
}

// ---- implémentation ----

type Regle = { id: string; title: string; garde: string };

type Recueil = { name: string; file: string; regles: Regle[] };

const DIR = "docs/knowledge/contributing";

/** `regles-git.md` donne `git`, `regles-de-code.md` donne `code`. */
const RECUEIL_FILE = /^regles-(?:de-)?(.+)\.md$/;

const REGLE_ID = /^[a-z]+-\d{3}$/i;

/** En JSON, chaque recueil vient avec ses règles : un agent les charge en un appel. */
function showRecueils(invocation: Invocation): number {
  emit(invocation.options.json, readRecueils(invocation.root), (recueils) =>
    columns(
      recueils.map((each) => [
        each.name,
        `${each.regles.length} règles`,
        each.file,
      ]),
    ),
  );
  return 0;
}

function showRecueil(invocation: Invocation, name: string): number {
  const recueils = readRecueils(invocation.root);
  const recueil = recueils.find((each) => each.name === name);
  if (!recueil) {
    const names = recueils.map((each) => each.name).join(", ");
    printError(`Recueil inconnu : « ${name} ». Recueils du dépôt : ${names}.`);
    return 1;
  }
  emit(invocation.options.json, recueil.regles, (regles) =>
    columns(regles.map((regle) => [regle.id, regle.title, regle.garde])),
  );
  return 0;
}

function showRegle(invocation: Invocation, id: string): number {
  for (const recueil of readRecueils(invocation.root)) {
    const text = regleText(invocation.root, recueil, id);
    if (text === undefined) continue;
    emit(
      invocation.options.json,
      { id, recueil: recueil.name, text },
      () => text,
    );
    return 0;
  }
  printError(`Règle inconnue : « ${id} ».`);
  return 1;
}

function readRecueils(root: string): Recueil[] {
  return fs
    .readdirSync(path.join(root, DIR))
    .sort()
    .flatMap((entry) => {
      const name = RECUEIL_FILE.exec(entry)?.[1];
      return name ? [readRecueil(root, name, path.join(DIR, entry))] : [];
    });
}

/** L'index d'un recueil est son premier tableau. Une règle retirée y reste, barrée. */
function readRecueil(root: string, name: string, file: string): Recueil {
  const markdown = fs.readFileSync(path.join(root, file), "utf8");
  const regles = firstTable(markdown)
    .filter((row) => !row[0]?.startsWith("~~"))
    .map((row) => ({
      id: row[0] ?? "",
      title: row[1] ?? "",
      garde: row[2] ?? "",
    }));
  return { name, file, regles };
}

/** Le texte d'une règle va de son titre au séparateur ou au titre suivant. */
function regleText(
  root: string,
  recueil: Recueil,
  id: string,
): string | undefined {
  const markdown = fs.readFileSync(path.join(root, recueil.file), "utf8");
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => line.startsWith(`### ${id} `));
  if (start === -1) return undefined;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(
    (line) => line.trim() === "---" || line.startsWith("### "),
  );
  const body = rest.slice(0, end === -1 ? undefined : end);
  return [lines[start], ...body].join("\n").trim();
}
