// Les commandes de tsp : trouver celle qu'on tape, et l'aide qui les liste.

import { actionCommand } from "./actions.ts";
import { appsCommand } from "./apps.ts";
import { branchCommand } from "./branches.ts";
import { docsCommand } from "./docs.ts";
import { doctorCommand } from "./doctor.ts";
import { featuresCommand } from "./features.ts";
import type { Command } from "./invocation.ts";
import { nextCommand } from "./next.ts";
import { columns, section } from "./output.ts";
import { prCommand } from "./pull-requests.ts";
import { rulesCommand } from "./rules.ts";
import { setupCommand } from "./setup.ts";
import { skillsCommand } from "./skills.ts";
import { specCommand } from "./spec.ts";
import { wipCommand } from "./wip.ts";

export function findCommand(name: string): Command | undefined {
  return [...BY_APP, ...ACROSS].find((entry) => entry.name === name)?.run;
}

export function helpText(): string {
  return [
    "tsp, le point d'entrée du dépôt transports sanitaires.",
    section(
      "Par app (sans app : toutes celles qui portent l'action)",
      usages(BY_APP),
    ),
    section("Transverses", usages(ACROSS)),
    section("Options", columns(OPTIONS)),
  ].join("\n\n");
}

// ---- implémentation ----

type Entry = { name: string; usage: string; summary: string; run: Command };

const BY_APP: Entry[] = [
  {
    name: "install",
    usage: "install [app]",
    summary: "installe les dépendances",
    run: actionCommand("install"),
  },
  {
    name: "build",
    usage: "build [app]",
    summary: "construit l'app",
    run: actionCommand("build"),
  },
  {
    name: "start",
    usage: "start [app]",
    summary: "lance la version de production",
    run: actionCommand("start"),
  },
  {
    name: "test",
    usage: "test [app]",
    summary: "lance les tests",
    run: actionCommand("test"),
  },
  {
    name: "dev",
    usage: "dev [app]",
    summary: "lance le serveur de développement local",
    run: actionCommand("dev"),
  },
  {
    name: "verifier",
    usage: "verifier [app]",
    summary: "passe la porte : lint, typecheck, knip, tests, build",
    run: actionCommand("verifier"),
  },
  {
    name: "features",
    usage: "features [app]",
    summary: "liste les features de l'app",
    run: featuresCommand,
  },
];

const ACROSS: Entry[] = [
  {
    name: "setup",
    usage: "setup",
    summary: "prépare la machine : mise, toolchain, dépendances, hooks, .env",
    run: setupCommand,
  },
  {
    name: "doctor",
    usage: "doctor",
    summary: "dit ce qui manque, et la commande qui le répare",
    run: doctorCommand,
  },
  {
    name: "apps",
    usage: "apps",
    summary: "liste les apps, leur version, leurs actions",
    run: appsCommand,
  },
  {
    name: "rules",
    usage: "rules [recueil|id]",
    summary:
      "liste les recueils, les règles d'un recueil, ou affiche une règle",
    run: rulesCommand,
  },
  {
    name: "skills",
    usage: "skills [skill]",
    summary: "liste les skills du dépôt, ou en affiche un",
    run: skillsCommand,
  },
  {
    name: "docs",
    usage: "docs [app]",
    summary: "liste les ADR et les connaissances métier",
    run: docsCommand,
  },
  {
    name: "wip",
    usage: "wip",
    summary: "montre le travail en cours",
    run: wipCommand,
  },
  {
    name: "next",
    usage: "next",
    summary: "montre le travail à prendre",
    run: nextCommand,
  },
  {
    name: "spec",
    usage: "spec new|move|sync …",
    summary: "crée une spec, la change d'état, synchronise son ticket Notion",
    run: specCommand,
  },
  {
    name: "branch",
    usage: "branch <type>/<sujet>",
    summary: "tire une branche de staging",
    run: branchCommand,
  },
  {
    name: "pr",
    usage: "pr [status]",
    summary: "ouvre la PR vers staging, ou montre son état et sa CI",
    run: prCommand,
  },
];

const OPTIONS = [
  ["--json", "sortie JSON, sur les commandes de lecture"],
  ["--yes", "répond oui aux confirmations"],
  ["--app <app>", "le tracker d'une app, pour spec new"],
  ["--title <titre>", "le titre de la PR, pour pr"],
  ["--body-file <fichier>", "le corps de la PR, pour pr"],
  ["-- …", "transmis tel quel au script de l'app"],
];

function usages(entries: Entry[]): string {
  return columns(entries.map((entry) => [`tsp ${entry.usage}`, entry.summary]));
}
