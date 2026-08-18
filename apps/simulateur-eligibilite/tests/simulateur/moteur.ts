import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import type { RawPublicodes, Situation } from "publicodes";
import Engine from "publicodes";

const dossierRegles = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../regles",
);

function chargerRegles(): RawPublicodes<string> {
  const fichiers = readdirSync(dossierRegles).filter((f) =>
    f.endsWith(".publicodes"),
  );
  return Object.assign(
    {},
    ...fichiers.map(
      (fichier) =>
        yaml.load(
          readFileSync(join(dossierRegles, fichier), "utf-8"),
        ) as RawPublicodes<string>,
    ),
  );
}

export function moteurDeTest(situation: Situation<string> = {}) {
  return new Engine(chargerRegles(), {
    flag: { filterNotApplicablePossibilities: true },
  }).setSituation(situation);
}
