// Les tâches de `docs/tasks`, à la racine et dans chaque app.

import fs from "node:fs";
import path from "node:path";
import { scopes } from "./apps.ts";
import { title } from "./markdown.ts";
import { columns } from "./output.ts";

export type Tache = { titre: string; chemin: string };

export function listTasks(root: string): Tache[] {
  return scopes(root).flatMap((scope) => {
    const dir = path.join(scope.dir, "docs/tasks");
    if (!fs.existsSync(path.join(root, dir))) return [];
    return fs
      .readdirSync(path.join(root, dir))
      .filter((name) => name.endsWith(".md") && name !== TEMPLATE)
      .sort()
      .map((name) => readTask(root, path.join(dir, name)));
  });
}

export function renderTasks(taches: Tache[]): string {
  return columns(taches.map((tache) => [tache.titre, tache.chemin]));
}

// ---- implémentation ----

const TEMPLATE = "TEMPLATE.md";

function readTask(root: string, chemin: string): Tache {
  const markdown = fs.readFileSync(path.join(root, chemin), "utf8");
  return { titre: title(markdown) ?? path.basename(chemin), chemin };
}
