// Les branches du dépôt : en tirer une de `staging`, lister celles qui
// attendent encore d'y être fusionnées.

import { COMMIT_TYPES } from "./conventional-commits.ts";
import { git, stagingRef } from "./git.ts";
import type { Invocation } from "./invocation.ts";
import { printError } from "./output.ts";
import { runProgram } from "./run-program.ts";

/** `tsp branch <type>/<sujet>` */
export function branchCommand(invocation: Invocation): number {
  const { root, args } = invocation;
  const [name] = args;
  if (!name || !BRANCH_NAME.test(name)) {
    printError(
      `Usage : tsp branch <type>/<sujet>, ex. fix/libelle-article-80.`,
    );
    return 1;
  }
  const type = name.split("/")[0]!;
  if (!COMMIT_TYPES.includes(type)) {
    printError(
      `Type inconnu : « ${type} ». Types permis : ${COMMIT_TYPES.join(", ")}.`,
    );
    return 1;
  }
  const fetched = runProgram("git", ["fetch", "origin", "staging"], root);
  if (fetched !== 0) return fetched;
  const from = ["switch", "--create", name, "--no-track", "origin/staging"];
  return runProgram("git", from, root);
}

/**
 * Les branches locales et distantes non fusionnées dans `staging`, une fois
 * chacune, sans celles de `withPullRequest`. Une PR fusionnée par squash laisse
 * sa branche « non fusionnée » aux yeux de git : c'est la PR qui la retire.
 */
export function unmergedBranches(
  root: string,
  withPullRequest: Set<string>,
): string[] {
  const refs = git(root, [
    "for-each-ref",
    `--no-merged=${stagingRef(root)}`,
    "--format=%(refname:short)",
    "refs/heads",
    "refs/remotes/origin",
  ]);
  const names = refs
    .split("\n")
    .map((ref) => ref.replace(/^origin\//, ""))
    .filter((name) => name !== "" && !PERMANENT.includes(name))
    .filter((name) => !withPullRequest.has(name));
  return [...new Set(names)].sort();
}

// ---- implémentation ----

const BRANCH_NAME = /^[a-z]+\/[a-z0-9][a-z0-9.-]*$/;

/** Ce qui n'est pas un travail en cours : les branches pérennes et le pointeur du distant. */
const PERMANENT = ["main", "staging", "HEAD", "origin"];
