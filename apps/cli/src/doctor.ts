// Dire ce qui manque à la machine pour travailler dans le dépôt, et la
// commande qui le répare.

import fs from "node:fs";
import path from "node:path";
import type { Invocation } from "./invocation.ts";
import { isLinked, isOnPath, linkPath } from "./launcher-link.ts";
import { notionAccess } from "./notion.ts";
import { columns, emit } from "./output.ts";
import { captureProgram } from "./run-program.ts";
import { missingEnvFiles } from "./settings.ts";

/** `tsp doctor`. Échoue seulement sur un manque qui empêche de travailler. */
export function doctorCommand(invocation: Invocation): number {
  const checks = runChecks(invocation.root);
  emit(invocation.options.json, checks, render);
  return checks.some((check) => check.required && !check.ok) ? 1 : 0;
}

// ---- implémentation ----

type Check = {
  name: string;
  ok: boolean;
  /** Faux pour ce dont l'absence dégrade une commande sans l'empêcher. */
  required: boolean;
  detail: string;
  fix: string;
};

function runChecks(root: string): Check[] {
  return [
    ...["node", "pnpm", "gh"].map((tool) => toolVersion(root, tool)),
    dependencies(root),
    hooks(root),
    envFiles(root),
    launcher(),
    githubAuth(root),
    notion(root),
  ];
}

/** L'outil répond à la version qu'épingle `mise.toml`. */
function toolVersion(root: string, tool: string): Check {
  const pinned = pinnedVersion(root, tool);
  const output = captureProgram(tool, ["--version"], root).stdout;
  const actual = /\d+\.\d+\.\d+/.exec(output)?.[0];
  return {
    name: tool,
    ok: actual !== undefined && actual === pinned,
    required: true,
    detail: `${actual ?? "absent"}, attendu ${pinned ?? "?"}`,
    fix: "tsp setup",
  };
}

function pinnedVersion(root: string, tool: string): string | undefined {
  const mise = fs.readFileSync(path.join(root, "mise.toml"), "utf8");
  return new RegExp(`^${tool} = "(.+)"`, "m").exec(mise)?.[1];
}

function dependencies(root: string): Check {
  const ok = fs.existsSync(path.join(root, "node_modules/.modules.yaml"));
  return {
    name: "dépendances",
    ok,
    required: true,
    detail: ok ? "installées" : "node_modules absent",
    fix: "tsp install",
  };
}

function hooks(root: string): Check {
  const args = ["config", "--get", "core.hooksPath"];
  const hooksPath = captureProgram("git", args, root).stdout;
  return {
    name: "hooks git",
    ok: hooksPath === ".githooks",
    required: true,
    detail: hooksPath === "" ? "non branchés" : hooksPath,
    fix: "tsp setup",
  };
}

function envFiles(root: string): Check {
  const missing = missingEnvFiles(root);
  return {
    name: ".env",
    ok: missing.length === 0,
    required: true,
    detail:
      missing.length === 0 ? "présents" : `absents : ${missing.join(", ")}`,
    fix: "tsp setup",
  };
}

function launcher(): Check {
  const ok = isLinked() && isOnPath();
  const gap = isLinked() ? "son dossier n'est pas dans le PATH" : "absent";
  return {
    name: "lien tsp",
    ok,
    required: false,
    detail: `${linkPath()}${ok ? "" : `, ${gap}`}`,
    fix: isLinked()
      ? `ajoute ${path.dirname(linkPath())} au PATH`
      : "./tsp setup",
  };
}

function githubAuth(root: string): Check {
  const ok = captureProgram("gh", ["auth", "status"], root).code === 0;
  return {
    name: "GitHub",
    ok,
    required: false,
    detail: ok ? "gh authentifié" : "gh non authentifié : wip et pr dégradés",
    fix: "gh auth login",
  };
}

function notion(root: string): Check {
  const access = notionAccess(root);
  const ok = typeof access !== "string";
  return {
    name: "Notion",
    ok,
    required: false,
    detail: ok
      ? "jeton et base présents"
      : `${access} : wip, next et sync dégradés`,
    fix: "renseigne NOTION_TOKEN et NOTION_DATABASE_ID dans .env",
  };
}

function render(checks: Check[]): string {
  return columns(
    checks.map((check) => [
      check.ok ? "✓" : check.required ? "✗" : "!",
      check.name,
      check.detail,
      check.ok ? "" : `→ ${check.fix}`,
    ]),
  );
}
