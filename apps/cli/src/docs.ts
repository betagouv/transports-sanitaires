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

type Doc = { scope: string; kind: string; title: string; file: string };

const KINDS = ["adr", "domain"];

/** Sans app : la racine et toutes les apps. Avec une app : elle seule. */
function selectScopes(root: string, alias?: string): Scope[] | undefined {
  if (alias === undefined) return scopes(root);
  const app = findApp(root, alias);
  return app ? [{ name: app.name, dir: app.dir }] : undefined;
}

function readDocs(root: string, scope: Scope): Doc[] {
  return KINDS.flatMap((kind) => {
    const dir = path.join(scope.dir, "docs/knowledge", kind);
    if (!fs.existsSync(path.join(root, dir))) return [];
    return fs
      .readdirSync(path.join(root, dir))
      .filter((name) => name.endsWith(".md"))
      .sort()
      .map((name) => readDoc(root, scope, kind, path.join(dir, name)));
  });
}

function readDoc(root: string, scope: Scope, kind: string, file: string): Doc {
  const markdown = fs.readFileSync(path.join(root, file), "utf8");
  return {
    scope: scope.name,
    kind,
    title: title(markdown) ?? path.basename(file),
    file,
  };
}

function render(docs: Doc[]): string {
  const scopeNames = [...new Set(docs.map((doc) => doc.scope))];
  if (scopeNames.length === 0) return "Aucun document.";
  return scopeNames
    .map((scope) => {
      const rows = docs
        .filter((doc) => doc.scope === scope)
        .map((doc) => [doc.kind, doc.title, doc.file]);
      return section(scope, columns(rows));
    })
    .join("\n\n");
}
