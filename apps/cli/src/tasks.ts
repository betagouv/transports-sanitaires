// Les tâches de `docs/tasks`, à la racine et dans chaque app.

import fs from "node:fs";
import path from "node:path";
import { scopes } from "./apps.ts";
import { title } from "./markdown.ts";
import { columns } from "./output.ts";

export type Tache = { title: string; file: string };

export function listTaches(root: string): Tache[] {
  return scopes(root).flatMap((scope) => {
    const dir = path.join(scope.dir, "docs/tasks");
    if (!fs.existsSync(path.join(root, dir))) return [];
    return fs
      .readdirSync(path.join(root, dir))
      .filter((name) => name.endsWith(".md") && name !== TEMPLATE)
      .sort()
      .map((name) => readTache(root, path.join(dir, name)));
  });
}

export function renderTaches(taches: Tache[]): string {
  return columns(taches.map((tache) => [tache.title, tache.file]));
}

// ---- implémentation ----

const TEMPLATE = "TEMPLATE.md";

function readTache(root: string, file: string): Tache {
  const markdown = fs.readFileSync(path.join(root, file), "utf8");
  return { title: title(markdown) ?? path.basename(file), file };
}
