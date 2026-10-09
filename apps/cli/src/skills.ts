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

type Skill = { nom: string; description: string; fichier: string };

const DIR = ".claude/skills";

function listSkills(invocation: Invocation): number {
  emit(invocation.options.json, readSkills(invocation.root), (skills) =>
    columns(skills.map((skill) => [skill.nom, skill.description])),
  );
  return 0;
}

function showSkill(invocation: Invocation, name: string): number {
  const skills = readSkills(invocation.root);
  const skill = skills.find((each) => each.nom === name);
  if (!skill) {
    const noms = skills.map((each) => each.nom).join(", ");
    printError(`Skill inconnu : « ${name} ». Skills du dépôt : ${noms}.`);
    return 1;
  }
  const texte = fs.readFileSync(
    path.join(invocation.root, skill.fichier),
    "utf8",
  );
  emit(invocation.options.json, { ...skill, texte }, () => texte.trimEnd());
  return 0;
}

function readSkills(root: string): Skill[] {
  const base = path.join(root, DIR);
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base)
    .sort()
    .map((name) => path.join(DIR, name, "SKILL.md"))
    .filter((fichier) => fs.existsSync(path.join(root, fichier)))
    .map((fichier) => readSkill(root, fichier));
}

function readSkill(root: string, fichier: string): Skill {
  const meta = frontmatter(fs.readFileSync(path.join(root, fichier), "utf8"));
  return {
    nom: meta.name ?? path.basename(path.dirname(fichier)),
    description: meta.description ?? "",
    fichier,
  };
}
