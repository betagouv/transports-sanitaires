// Tenir les specs : en créer une, la changer d'état, synchroniser son ticket.

import type { Command, Invocation } from "./invocation.ts";
import { printError } from "./output.ts";
import { moveCommand } from "./spec-move.ts";
import { newCommand } from "./spec-new.ts";
import { syncCommand } from "./spec-sync.ts";

/** `tsp spec new`, `tsp spec move`, `tsp spec sync` */
export function specCommand(invocation: Invocation): number | Promise<number> {
  const [verb, ...args] = invocation.args;
  const command = verb === undefined ? undefined : VERBS[verb];
  if (!command) {
    printError(`Usage : tsp spec <${Object.keys(VERBS).join("|")}> …`);
    return 1;
  }
  return command({ ...invocation, args });
}

// ---- implémentation ----

const VERBS: Record<string, Command> = {
  new: newCommand,
  move: moveCommand,
  sync: syncCommand,
};
