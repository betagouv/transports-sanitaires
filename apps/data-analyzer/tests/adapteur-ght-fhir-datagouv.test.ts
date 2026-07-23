// Tests de l'adaptateur référentiel GHT (sans mock) : lit un dossier de bundles FHIR JSON
// écrits en temp et vérifie la dimension finess juridique → GHT produite.

import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AdapterGhtFhirDatagouv } from "../src/01-extract/adapteurs/adapteur-ght-fhir-datagouv.ts";
import type { MappingEntry } from "../src/types.ts";

const dirs: string[] = [];
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), "data-analyzer-ght-"));
  dirs.push(d);
  return d;
}
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

// Fabrique un bundle FHIR minimal : une Organization GHT + une par entité juridique.
function bundle(ghtCode: string, ghtLibelle: string, ej: { finess: string; nom: string }[]): unknown {
  const org = (system: string, value: string, name: string) => ({
    resource: { resourceType: "Organization", name, identifier: [{ system, value }] },
  });
  return {
    resourceType: "Bundle",
    entry: [
      org("urn:fr-gouv-sante:ght", ghtCode, ghtLibelle),
      ...ej.map((e) => org("urn:fr-gouv-sante-finess:ej", e.finess, e.nom)),
      { resource: { resourceType: "Location", name: "site ignoré" } },
    ],
  };
}

function run(dir: string) {
  return new AdapterGhtFhirDatagouv(dir, {} as MappingEntry).execute();
}

describe("AdapterGhtFhirDatagouv", () => {
  it("rattache chaque finess juridique à son GHT (code, libellé, région)", () => {
    const dir = tmp();
    writeFileSync(
      join(dir, "ara-01.json"),
      JSON.stringify(bundle("ght-ARA-01", "GHT Territoire d'auvergne", [{ finess: "630781003", nom: "CH ISSOIRE" }])),
    );
    const { trajets, ght } = run(dir);
    expect(trajets).toEqual([]); // un référentiel GHT n'émet aucun trajet
    expect(ght).toEqual([
      {
        finess_juridique: "630781003",
        ght_code: "ght-ARA-01",
        ght_libelle: "GHT Territoire d'auvergne",
        region: "ARA",
        raison_sociale: "CH ISSOIRE",
      },
    ]);
  });

  it("accepte les FINESS corses (2A/2B) et écarte les identifiants cassés", () => {
    const dir = tmp();
    writeFileSync(
      join(dir, "cor-01.json"),
      JSON.stringify(
        bundle("ght-COR-01", "GHT Corse", [
          { finess: "2B0000020", nom: "CH BASTIA" },
          { finess: "nan", nom: "ETABLISSEMENT SANS FINESS" },
        ]),
      ),
    );
    const { ght } = run(dir);
    expect(ght?.map((r) => r.finess_juridique)).toEqual(["2B0000020"]);
  });

  it("déduplique un finess juridique vu dans plusieurs bundles (premier gagnant)", () => {
    const dir = tmp();
    writeFileSync(join(dir, "a.json"), JSON.stringify(bundle("ght-ARA-01", "A", [{ finess: "010000001", nom: "PREMIER" }])));
    writeFileSync(join(dir, "b.json"), JSON.stringify(bundle("ght-BFC-02", "B", [{ finess: "010000001", nom: "DOUBLON" }])));
    const { ght } = run(dir);
    expect(ght).toHaveLength(1);
    expect(ght![0]!.raison_sociale).toBe("PREMIER");
  });

  it("ignore un bundle sans Organization GHT", () => {
    const dir = tmp();
    const sansGht = { resourceType: "Bundle", entry: [{ resource: { resourceType: "Location", name: "x" } }] };
    writeFileSync(join(dir, "vide.json"), JSON.stringify(sansGht));
    expect(run(dir).ght).toEqual([]);
  });
});
