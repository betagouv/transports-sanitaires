// Préparer la machine, une fois Node disponible : dépendances, hooks, `.env`,
// lien vers le lanceur, puis le diagnostic. `mise` et le toolchain sont posés
// avant, en shell, par `amorce.sh`.

import fs from "node:fs";
import path from "node:path";
import { doctorCommand } from "./doctor.ts";
import type { Invocation } from "./invocation.ts";
import { isOnPath, linkLauncher, linkPath } from "./launcher-link.ts";
import { print } from "./output.ts";
import { runProgram } from "./run-program.ts";
import { missingEnvFiles } from "./settings.ts";

/** `tsp setup`. Rejouable : chaque étape ne fait que ce qui manque. */
export function setupCommand(invocation: Invocation): number {
  const { root } = invocation;
  for (const step of [installDependencies, plugHooks]) {
    const code = step(root);
    if (code !== 0) return code;
  }
  createEnvFiles(root);
  link(root);
  print("");
  return doctorCommand(invocation);
}

// ---- implémentation ----

function installDependencies(root: string): number {
  print("Dépendances : pnpm install");
  return runProgram("pnpm", ["install"], root);
}

/** Le `prepare` de la racine le fait déjà. Le redire ici le rend visible. */
function plugHooks(root: string): number {
  print("Hooks git : core.hooksPath = .githooks");
  return runProgram("git", ["config", "core.hooksPath", ".githooks"], root);
}

function createEnvFiles(root: string): void {
  for (const file of missingEnvFiles(root)) {
    fs.copyFileSync(path.join(root, `${file}.example`), path.join(root, file));
    print(`.env : ${file} créé depuis son gabarit, à compléter`);
  }
}

function link(root: string): void {
  if (!linkLauncher(root)) {
    print(`Lien : ${linkPath()} est un fichier, laissé en place`);
    return;
  }
  print(`Lien : ${linkPath()} → ${path.join(root, "tsp")}`);
  if (!isOnPath()) {
    print(`Lien : ajoute ${path.dirname(linkPath())} à ton PATH`);
  }
}
