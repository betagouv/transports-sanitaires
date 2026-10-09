// Les features d'une app, telles que son `docs/knowledge/features.md` les
// décrit.

import fs from "node:fs";
import path from "node:path";
import { type App, appsFor, unknownApp } from "./apps.ts";
import type { Invocation } from "./invocation.ts";
import { firstTable } from "./markdown.ts";
import { columns, emit, printError, section } from "./output.ts";

/** `tsp features [app]` */
export function featuresCommand(invocation: Invocation): number {
  const { root, args, options } = invocation;
  const apps = appsFor(root, args[0]);
  if (!apps) {
    printError(unknownApp(root, args[0]!));
    return 1;
  }
  const described = apps.map((app) => ({
    app: app.name,
    file: featuresFile(app),
    features: readFeatures(root, app),
  }));
  emit(options.json, described, (list) => list.map(render).join("\n\n"));
  return 0;
}

// ---- implémentation ----

type Feature = { feature: string; description: string };

type Described = { app: string; file: string; features: Feature[] };

function featuresFile(app: App): string {
  return path.join(app.dir, "docs/knowledge/features.md");
}

function readFeatures(root: string, app: App): Feature[] {
  const file = path.join(root, featuresFile(app));
  if (!fs.existsSync(file)) return [];
  return firstTable(fs.readFileSync(file, "utf8")).map((row) => ({
    feature: row[0] ?? "",
    description: row[1] ?? "",
  }));
}

function render(described: Described): string {
  if (described.features.length === 0) {
    return section(described.app, `aucune feature décrite (${described.file})`);
  }
  const rows = described.features.map((each) => [
    each.feature,
    each.description,
  ]);
  return section(described.app, columns(rows));
}
