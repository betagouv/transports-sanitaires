// Les questions que tsp pose à git.

import { captureProgram } from "./run-program.ts";

/** Ce que git répond. Lève une erreur s'il échoue. */
export function git(root: string, args: string[]): string {
  const result = captureProgram("git", args, root);
  if (result.code !== 0) {
    throw new Error(`git ${args.join(" ")} : ${result.stderr}`);
  }
  return result.stdout;
}

/** Vrai si git réussit : une référence existe, un fichier est suivi. */
export function gitSucceeds(root: string, args: string[]): boolean {
  return captureProgram("git", args, root).code === 0;
}

/** La branche vers laquelle tout travail est fusionné, telle que le distant la connaît. */
export function stagingRef(root: string): string {
  const remote = "origin/staging";
  return gitSucceeds(root, ["rev-parse", "--verify", "--quiet", remote])
    ? remote
    : "staging";
}
