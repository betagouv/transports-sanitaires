// Lancer une action sur une app, ou sur toutes celles qui la portent.

import {
  type Action,
  type App,
  carries,
  findApp,
  listApps,
  unknownApp,
} from "./apps.ts";
import type { Command, Invocation } from "./invocation.ts";
import { print, printError } from "./output.ts";
import { runProgram } from "./run-program.ts";

/** `tsp <action> [app]` */
export function actionCommand(action: Action): Command {
  return (invocation) => {
    const [alias] = invocation.args;
    return alias === undefined
      ? onEveryApp(action, invocation)
      : onNamedApp(action, alias, invocation);
  };
}

// ---- implémentation ----

/** Les actions qui ne rendent pas la main : en lancer plusieurs à la suite n'a pas de sens. */
const LONG_RUNNING: Action[] = ["dev", "start"];

function onNamedApp(
  action: Action,
  alias: string,
  invocation: Invocation,
): number {
  const app = findApp(invocation.root, alias);
  if (!app) {
    printError(unknownApp(invocation.root, alias));
    return 1;
  }
  if (!carries(app, action)) {
    printError(`${app.name} ne porte pas l'action « ${action} ».`);
    return 1;
  }
  return runAction(action, app, invocation);
}

function onEveryApp(action: Action, invocation: Invocation): number {
  if (action === "install") {
    return runProgram("pnpm", ["install"], invocation.root);
  }
  const apps = listApps(invocation.root);
  const carriers = apps.filter((app) => carries(app, action));
  if (LONG_RUNNING.includes(action) && carriers.length > 1) {
    return askForOneApp(action, carriers);
  }
  return oneAtATime(action, apps, invocation);
}

function askForOneApp(action: Action, carriers: App[]): number {
  const names = carriers.map((app) => app.name).join(", ");
  printError(
    `Plusieurs apps portent « ${action} » : ${names}. Nomme-en une : tsp ${action} <app>.`,
  );
  return 1;
}

function oneAtATime(
  action: Action,
  apps: App[],
  invocation: Invocation,
): number {
  for (const app of apps) {
    if (!carries(app, action)) {
      print(`${app.name} : pas d'action « ${action} », sautée.`);
      continue;
    }
    print(`${app.name} : ${action}`);
    const code = runAction(action, app, invocation);
    if (code !== 0) return code;
  }
  return 0;
}

function runAction(action: Action, app: App, invocation: Invocation): number {
  const target = ["--filter", app.name];
  const args =
    action === "install"
      ? [...target, "install"]
      : [...target, "run", action, ...invocation.passthrough];
  return runProgram("pnpm", args, invocation.root);
}
