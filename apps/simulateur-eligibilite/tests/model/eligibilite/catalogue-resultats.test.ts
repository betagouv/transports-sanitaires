// Le catalogue des textes de R2 va avec les règles qu'il décrit : l'éditeur y
// écrit la version et l'empreinte du modèle (`packageVersion`, `modelSha256`).
// Un catalogue recopié sans ses règles, ou l'inverse, échoue ici.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { catalogueResultats } from "../../../front/models/eligibilite/catalogue-resultats";
import { CIBLES_ENUMEREES } from "../../../front/models/eligibilite/declarations/cibles";

const rules = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../front/models/eligibilite/rules",
);
const lire = (fichier: string) => readFileSync(join(rules, fichier));

describe("le catalogue des textes de R2", () => {
  it("porte la version des règles", async () => {
    const { packageVersion } = await catalogueResultats();
    expect(packageVersion).toBe(lire("VERSION").toString().trim());
  });

  it("porte l'empreinte des règles recopiées", async () => {
    const { modelSha256 } = await catalogueResultats();
    expect(modelSha256).toBe(
      createHash("sha256").update(lire("regles.publicodes")).digest("hex"),
    );
  });

  it("a des textes pour chaque issue du modèle", async () => {
    const { issues } = await catalogueResultats();
    expect(Object.keys(issues).sort()).toEqual(
      [...CIBLES_ENUMEREES.cible_issue_id].sort(),
    );
  });
});
