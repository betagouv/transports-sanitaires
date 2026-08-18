import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import type { RawPublicodes, Situation } from "publicodes";
import Engine from "publicodes";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../../regles");

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
