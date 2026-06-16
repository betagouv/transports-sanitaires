import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Engine from "publicodes";
import type { RawPublicodes, Situation } from "publicodes";
import yaml from "js-yaml";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../regles");

function loadRules(): RawPublicodes<string> {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".publicodes"))
    .reduce<RawPublicodes<string>>((acc, file) => {
      const content = readFileSync(join(dir, file), "utf-8");
      return { ...acc, ...(yaml.load(content) as RawPublicodes<string>) };
    }, {});
}

export function makeEngine(situation: Situation<string> = {}) {
  return new Engine(loadRules(), {
    flag: { filterNotApplicablePossibilities: true },
  }).setSituation(situation);
}
