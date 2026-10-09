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
 * Pose le lien vers le lanceur de `root`. Un ancien lien est remplacé. Un vrai
 * fichier du même nom est laissé en place : rend alors `false`.
 */
export function linkLauncher(root: string): boolean {
  const link = linkPath();
  const existing = fs.lstatSync(link, { throwIfNoEntry: false });
  if (existing && !existing.isSymbolicLink()) return false;
  if (existing) fs.unlinkSync(link);
  fs.mkdirSync(path.dirname(link), { recursive: true });
  fs.symlinkSync(path.join(root, "tsp"), link);
  return true;
}
