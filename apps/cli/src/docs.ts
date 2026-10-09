// La documentation de référence : les ADR et les connaissances métier, à la
// racine et dans chaque app.

import fs from "node:fs";
import path from "node:path";
import { findApp, type Scope, scopes, unknownApp } from "./apps.ts";
import type { Invocation } from "./invocation.ts";
import { title } from "./markdown.ts";
import { columns, emit, printError, section } from "./output.ts";

/** `tsp docs [app]` */
export function docsCommand(invocation: Invocation): number {
  const { root, args, options } = invocation;
  const selected = selectScopes(root, args[0]);
  if (!selected) {
    printError(unknownApp(root, args[0]!));
    return 1;
  }
  const docs = selected.flatMap((scope) => readDocs(root, scope));
  emit(options.json, docs, render);
  return 0;
}

// ---- implémentation ----

type Doc = { portee: string; genre: string; titre: string; chemin: string };

const GENRES = ["adr", "domain"];

/** Sans app : la racine et toutes les apps. Avec une app : elle seule. */
function selectScopes(root: string, alias?: string): Scope[] | undefined {
  if (alias === undefined) return scopes(root);
  const app = findApp(root, alias);
  return app ? [{ name: app.name, dir: app.dir }] : undefined;
}

function readDocs(root: string, scope: Scope): Doc[] {
  return GENRES.flatMap((genre) => {
    const dir = path.join(scope.dir, "docs/knowledge", genre);
    if (!fs.existsSync(path.join(root, dir))) return [];
    return fs
      .readdirSync(path.join(root, dir))
      .filter((name) => name.endsWith(".md"))
      .sort()
      .map((name) => readDoc(root, scope, genre, path.join(dir, name)));
  });
}

function readDoc(
  root: string,
  scope: Scope,
  genre: string,
  chemin: string,
): Doc {
  const markdown = fs.readFileSync(path.join(root, chemin), "utf8");
  return {
    portee: scope.name,
    genre,
    titre: title(markdown) ?? path.basename(chemin),
    chemin,
  };
}

function render(docs: Doc[]): string {
  const portees = [...new Set(docs.map((doc) => doc.portee))];
  if (portees.length === 0) return "Aucun document.";
  return portees
    .map((portee) => {
      const rows = docs
        .filter((doc) => doc.portee === portee)
        .map((doc) => [doc.genre, doc.titre, doc.chemin]);
      return section(portee, columns(rows));
    })
    .join("\n\n");
}
