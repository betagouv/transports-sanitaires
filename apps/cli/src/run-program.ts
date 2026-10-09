// Lancer un autre programme : en lui laissant le terminal, ou en lisant sa
// sortie.

import { spawnSync } from "node:child_process";
import { printError } from "./output.ts";

export type Captured = { code: number; stdout: string; stderr: string };

/** Lance le programme dans le terminal courant et rend son code de sortie. */
export function runProgram(
  program: string,
  args: string[],
  cwd: string,
): number {
  const result = spawnSync(program, args, { cwd, stdio: "inherit" });
  if (result.error) {
    printError(`${program} : ${result.error.message}`);
    return 1;
  }
  return result.status ?? INTERRUPTED;
}

/** Lance le programme sans rien afficher et rend ce qu'il a écrit. */
export function captureProgram(
  program: string,
  args: string[],
  cwd: string,
): Captured {
  const result = spawnSync(program, args, { cwd, encoding: "utf8" });
  if (result.error) {
    return { code: 1, stdout: "", stderr: result.error.message };
  }
  return {
    code: result.status ?? INTERRUPTED,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

// ---- implémentation ----

/** Le code qu'un shell rend pour un programme arrêté par Ctrl-C. */
const INTERRUPTED = 130;
