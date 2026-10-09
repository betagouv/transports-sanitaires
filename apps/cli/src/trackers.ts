// Les trackers de specs, à la racine et dans chaque app : leurs états et les
// specs qu'ils rangent.

import fs from "node:fs";
import path from "node:path";
import { scopes } from "./apps.ts";
import { title } from "./markdown.ts";
import { columns } from "./output.ts";
import { blockers, field } from "./spec-header.ts";

export const ETATS = ["drafts", "backlog", "todo", "doing", "done"] as const;

export type Etat = (typeof ETATS)[number];

export type Spec = {
  id: string;
  module: string;
  type: string;
  title: string;
  etat: Etat;
  /** Le fichier, relatif à la racine. */
  file: string;
  /** Le tracker qui la range, relatif à la racine. */
  tracker: string;
  /** Les specs à finir d'abord, par leur nom de fichier sans extension. */
  bloqueePar: string[];
  /** L'adresse de son ticket Notion, si elle en a un. */
  notion?: string;
};

/** Le tracker d'un endroit du dépôt : la racine si `dir` est vide. */
export function trackerOf(dir: string): string {
  return path.join(dir, "docs/specs");
}

/** Le dossier d'un état : `1. backlog`, `3. doing`. */
export function etatDir(etat: Etat): string {
  return `${ETATS.indexOf(etat)}. ${etat}`;
}

/** Lit un état tel qu'on le tape : `doing`, `3`, `3. doing`. Rien d'approchant. */
export function parseEtat(text: string): Etat | undefined {
  return ETATS.find(
    (etat) =>
      text === etat ||
      text === String(ETATS.indexOf(etat)) ||
      text === etatDir(etat),
  );
}

export function listSpecs(root: string): Spec[] {
  return scopes(root).flatMap((scope) => {
    const tracker = trackerOf(scope.dir);
    return ETATS.flatMap((etat) => specsIn(root, tracker, etat));
  });
}

export function findSpec(root: string, id: string): Spec | undefined {
  return listSpecs(root).find((spec) => spec.id === id.padStart(3, "0"));
}

/** Le nom par lequel une autre spec la cite dans « bloquée par ». */
export function specName(spec: Spec): string {
  return path.basename(spec.file, ".md");
}

export function renderSpecs(specs: Spec[]): string {
  return columns(
    specs.map((spec) => [spec.id, spec.etat, spec.type, spec.title, spec.file]),
  );
}

// ---- implémentation ----

/** `004__cli__point-d-entree-tsp.feat.md` */
const SPEC_FILE = /^(\d{3})__(.+?)__.+\.([a-z]+)\.md$/;

function specsIn(root: string, tracker: string, etat: Etat): Spec[] {
  const dir = path.join(tracker, etatDir(etat));
  if (!fs.existsSync(path.join(root, dir))) return [];
  return fs
    .readdirSync(path.join(root, dir))
    .sort()
    .flatMap((name) => {
      const match = SPEC_FILE.exec(name);
      if (!match) return [];
      return [readSpec(root, tracker, etat, path.join(dir, name), match)];
    });
}

function readSpec(
  root: string,
  tracker: string,
  etat: Etat,
  file: string,
  match: RegExpExecArray,
): Spec {
  const markdown = fs.readFileSync(path.join(root, file), "utf8");
  const notion = field(markdown, "notion");
  return {
    id: match[1]!,
    module: match[2]!,
    type: match[3]!,
    title: title(markdown) ?? path.basename(file),
    etat,
    file,
    tracker,
    bloqueePar: blockers(markdown),
    notion: notion?.startsWith("http") ? notion : undefined,
  };
}
