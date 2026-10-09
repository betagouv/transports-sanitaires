// Changer une spec d'état : la déplacer, tenir « bloquée par » à jour, puis
// son ticket Notion.

import fs from "node:fs";
import path from "node:path";
import { gitSucceeds } from "./git.ts";
import type { Invocation } from "./invocation.ts";
import { notionAccess } from "./notion.ts";
import { print, printError } from "./output.ts";
import { runProgram } from "./run-program.ts";
import { withoutBlocker } from "./spec-header.ts";
import { syncSpec } from "./spec-sync.ts";
import {
  ETATS,
  type Etat,
  etatDir,
  findSpec,
  listSpecs,
  parseEtat,
  type Spec,
  specName,
} from "./trackers.ts";

/** `tsp spec move <id> <état>` */
export async function moveCommand(invocation: Invocation): Promise<number> {
  const { root, args } = invocation;
  const spec = args[0] === undefined ? undefined : findSpec(root, args[0]);
  const etat = args[1] === undefined ? undefined : parseEtat(args[1]);
  if (!spec || !etat) {
    printError(`Usage : tsp spec move <id> <${ETATS.join("|")}>.`);
    return 1;
  }
  if (etat === "doing" && spec.bloqueePar.length > 0) {
    printError(
      `${spec.id} reste bloquée par : ${spec.bloqueePar.join(", ")}. Finis-les d'abord.`,
    );
    return 1;
  }
  const moved = move(root, spec, etat);
  if (!moved) return 1;
  if (etat === "done") unblock(root, spec);
  print(`${spec.id} : ${spec.etat} → ${etat} (${moved.file})`);
  print(await syncAfterMove(root, moved));
  return 0;
}

// ---- implémentation ----

/** `git mv` pour un fichier suivi, un simple déplacement sinon. */
function move(root: string, spec: Spec, etat: Etat): Spec | undefined {
  const file = path.join(spec.tracker, etatDir(etat), path.basename(spec.file));
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  const tracked = gitSucceeds(root, ["ls-files", "--error-unmatch", spec.file]);
  if (!tracked) {
    fs.renameSync(path.join(root, spec.file), path.join(root, file));
  } else if (runProgram("git", ["mv", spec.file, file], root) !== 0) {
    return undefined;
  }
  return { ...spec, etat, file };
}

/** Une spec finie disparaît du champ « bloquée par » de celles qu'elle bloquait. */
function unblock(root: string, done: Spec): void {
  const name = specName(done);
  for (const spec of listSpecs(root)) {
    if (!spec.bloqueePar.includes(name)) continue;
    const file = path.join(root, spec.file);
    const markdown = fs.readFileSync(file, "utf8");
    fs.writeFileSync(file, withoutBlocker(markdown, name));
    print(`${spec.id} : n'est plus bloquée par ${name}`);
  }
}

/** Le déplacement est fait : un ticket qui ne suit pas se signale, sans échouer. */
async function syncAfterMove(root: string, spec: Spec): Promise<string> {
  const notion = notionAccess(root);
  if (typeof notion === "string") {
    return `Notion : ${notion}, ticket non mis à jour.`;
  }
  try {
    return `Notion : ${await syncSpec(root, notion, spec)}`;
  } catch (error) {
    return `Notion : ${(error as Error).message}`;
  }
}
