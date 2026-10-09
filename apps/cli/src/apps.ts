// Les apps du dépôt et les actions que chacune porte.

import fs from "node:fs";
import path from "node:path";
import type { Invocation } from "./invocation.ts";
import { columns, emit } from "./output.ts";

const ACTIONS = [
  "install",
  "build",
  "start",
  "test",
  "dev",
  "verifier",
] as const;

export type Action = (typeof ACTIONS)[number];

export type App = {
  name: string;
  /** Son dossier, relatif à la racine. */
  dir: string;
  version: string;
  scripts: Record<string, string>;
};

/** Un endroit du dépôt qui tient sa propre documentation : la racine ou une app. */
export type Scope = { name: string; dir: string };

export function listApps(root: string): App[] {
  return fs
    .readdirSync(path.join(root, "apps"))
    .sort()
    .map((name) => path.join("apps", name))
    .filter((dir) => fs.existsSync(path.join(root, dir, "package.json")))
    .map((dir) => readApp(root, dir));
}

/** Trouve une app par son nom ou par un début de nom sans ambiguïté. */
export function findApp(root: string, alias: string): App | undefined {
  const apps = listApps(root);
  const exact = apps.find((app) => app.name === alias);
  if (exact) return exact;
  const close = apps.filter((app) => app.name.startsWith(alias));
  return close.length === 1 ? close[0] : undefined;
}

/** Toutes les apps sans alias, celle de l'alias sinon. Rien si l'alias est inconnu. */
export function appsFor(root: string, alias?: string): App[] | undefined {
  if (alias === undefined) return listApps(root);
  const app = findApp(root, alias);
  return app ? [app] : undefined;
}

export function unknownApp(root: string, alias: string): string {
  const names = listApps(root)
    .map((app) => app.name)
    .join(", ");
  return `App inconnue : « ${alias} ». Apps du dépôt : ${names}.`;
}

/** `install` vaut pour toute app. Les autres actions sont un script du même nom. */
export function carries(app: App, action: Action): boolean {
  return action === "install" || action in app.scripts;
}

/** La racine, puis chaque app. */
export function scopes(root: string): Scope[] {
  const apps = listApps(root).map((app) => ({ name: app.name, dir: app.dir }));
  return [{ name: "racine", dir: "" }, ...apps];
}

/** `tsp apps` */
export function appsCommand(invocation: Invocation): number {
  const apps = listApps(invocation.root).map((app) => ({
    name: app.name,
    version: app.version,
    dir: app.dir,
    actions: ACTIONS.filter((action) => carries(app, action)),
  }));
  emit(invocation.options.json, apps, (list) =>
    columns(list.map((app) => [app.name, app.version, app.actions.join(" ")])),
  );
  return 0;
}

// ---- implémentation ----

type Manifest = {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
};

function readApp(root: string, dir: string): App {
  const file = path.join(root, dir, "package.json");
  const manifest = JSON.parse(fs.readFileSync(file, "utf8")) as Manifest;
  return {
    name: manifest.name ?? path.basename(dir),
    dir,
    version: manifest.version ?? "0.0.0",
    scripts: manifest.scripts ?? {},
  };
}
