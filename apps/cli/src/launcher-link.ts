// Le lien qui rend `tsp` appelable de partout : `~/.local/bin/tsp`, vers le
// lanceur du clone.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export function linkPath(): string {
  return path.join(os.homedir(), ".local/bin/tsp");
}

/** Vrai si le lien existe et mène à un fichier. */
export function isLinked(): boolean {
  return fs.existsSync(linkPath());
}

/** Vrai si le dossier du lien est dans le `PATH`. */
export function isOnPath(): boolean {
  const dirs = (process.env.PATH ?? "").split(path.delimiter);
  return dirs.includes(path.dirname(linkPath()));
}

/**
 * Pose le lien vers le lanceur de `root`, s'il manque ou ne mène plus nulle
 * part. Un lien qui marche est gardé : `setup` lancé depuis un worktree ne doit
 * pas détourner le `tsp` de toute la machine vers un dossier éphémère. Rend la
 * cible du lien, ou rien si un vrai fichier occupe sa place.
 */
export function linkLauncher(root: string): string | undefined {
  const link = linkPath();
  const existing = fs.lstatSync(link, { throwIfNoEntry: false });
  if (existing && !existing.isSymbolicLink()) return undefined;
  if (existing && isLinked()) return fs.realpathSync(link);
  if (existing) fs.unlinkSync(link);
  fs.mkdirSync(path.dirname(link), { recursive: true });
  fs.symlinkSync(path.join(root, "tsp"), link);
  return path.join(root, "tsp");
}
