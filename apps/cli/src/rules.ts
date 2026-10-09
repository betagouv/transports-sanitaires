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
  if (RULE_ID.test(target)) return showRule(invocation, target.toUpperCase());
  return showRecueil(invocation, target);
}

// ---- implémentation ----

type Regle = { id: string; titre: string; garde: string };

type Recueil = { nom: string; fichier: string; regles: Regle[] };

const DIR = "docs/knowledge/contributing";

/** `regles-git.md` donne `git`, `regles-de-code.md` donne `code`. */
const RECUEIL_FILE = /^regles-(?:de-)?(.+)\.md$/;

const RULE_ID = /^[a-z]+-\d{3}$/i;

function showRecueils(invocation: Invocation): number {
  const recueils = readRecueils(invocation.root);
  emit(invocation.options.json, recueils.map(summary), (list) =>
    columns(
      list.map((each) => [each.nom, `${each.regles} règles`, each.fichier]),
    ),
  );
  return 0;
}

function showRecueil(invocation: Invocation, nom: string): number {
  const recueils = readRecueils(invocation.root);
  const recueil = recueils.find((each) => each.nom === nom);
  if (!recueil) {
    const noms = recueils.map((each) => each.nom).join(", ");
    printError(`Recueil inconnu : « ${nom} ». Recueils du dépôt : ${noms}.`);
    return 1;
  }
  emit(invocation.options.json, recueil.regles, (regles) =>
    columns(regles.map((regle) => [regle.id, regle.titre, regle.garde])),
  );
  return 0;
}

function showRule(invocation: Invocation, id: string): number {
  for (const recueil of readRecueils(invocation.root)) {
    const texte = ruleText(invocation.root, recueil, id);
    if (texte === undefined) continue;
    emit(
      invocation.options.json,
      { id, recueil: recueil.nom, texte },
      () => texte,
    );
    return 0;
  }
  printError(`Règle inconnue : « ${id} ».`);
  return 1;
}

function summary(recueil: Recueil) {
  return {
    nom: recueil.nom,
    fichier: recueil.fichier,
    regles: recueil.regles.length,
  };
}

function readRecueils(root: string): Recueil[] {
  return fs
    .readdirSync(path.join(root, DIR))
    .sort()
    .flatMap((name) => {
      const nom = RECUEIL_FILE.exec(name)?.[1];
      return nom ? [readRecueil(root, nom, path.join(DIR, name))] : [];
    });
}

/** L'index d'un recueil est son premier tableau. Une règle retirée y reste, barrée. */
function readRecueil(root: string, nom: string, fichier: string): Recueil {
  const markdown = fs.readFileSync(path.join(root, fichier), "utf8");
  const regles = firstTable(markdown)
    .filter((row) => !row[0]?.startsWith("~~"))
    .map((row) => ({
      id: row[0] ?? "",
      titre: row[1] ?? "",
      garde: row[2] ?? "",
    }));
  return { nom, fichier, regles };
}

/** Le texte d'une règle va de son titre au séparateur ou au titre suivant. */
function ruleText(
  root: string,
  recueil: Recueil,
  id: string,
): string | undefined {
  const markdown = fs.readFileSync(path.join(root, recueil.fichier), "utf8");
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
