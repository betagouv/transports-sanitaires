// Les skills du dépôt : leur liste, et le mode d'emploi de l'un d'eux.

import fs from "node:fs";
import path from "node:path";
import type { Invocation } from "./invocation.ts";
import { frontmatter } from "./markdown.ts";
import { columns, emit, printError } from "./output.ts";

/** `tsp skills`, `tsp skills <skill>` */
export function skillsCommand(invocation: Invocation): number {
  const [name] = invocation.args;
  return name === undefined
    ? listSkills(invocation)
    : showSkill(invocation, name);
}

// ---- implémentation ----

type Skill = { name: string; description: string; file: string };

const DIR = ".claude/skills";

function listSkills(invocation: Invocation): number {
  emit(invocation.options.json, readSkills(invocation.root), (skills) =>
    columns(skills.map((skill) => [skill.name, skill.description])),
  );
  return 0;
}

function showSkill(invocation: Invocation, name: string): number {
  const skills = readSkills(invocation.root);
  const skill = skills.find((each) => each.name === name);
  if (!skill) {
    const names = skills.map((each) => each.name).join(", ");
    printError(`Skill inconnu : « ${name} ». Skills du dépôt : ${names}.`);
    return 1;
  }
  const text = fs.readFileSync(path.join(invocation.root, skill.file), "utf8");
  emit(invocation.options.json, { ...skill, text }, () => text.trimEnd());
  return 0;
}

function readSkills(root: string): Skill[] {
  const base = path.join(root, DIR);
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base)
    .sort()
    .map((name) => path.join(DIR, name, "SKILL.md"))
    .filter((file) => fs.existsSync(path.join(root, file)))
    .map((file) => readSkill(root, file));
}

function readSkill(root: string, file: string): Skill {
  const meta = frontmatter(fs.readFileSync(path.join(root, file), "utf8"));
  return {
    name: meta.name ?? path.basename(path.dirname(file)),
    description: meta.description ?? "",
    file,
  };
}
