// Tests du calcul des marts (sans mock, sans I/O) : on appelle `calculer()` sur des trajets
// réconciliés synthétiques et on vérifie les règles (ratio, part>1, NULL, grain, Article 80).

import { describe, it, expect } from "vitest";
import { MartRatio } from "../src/04-marts/mart-ratio.ts";
import { MartArticle80 } from "../src/04-marts/mart-article80.ts";
import { MartGht2024 } from "../src/04-marts/mart-ght-2024.ts";
import type { TrajetReconcilieRow } from "../src/contrats.ts";
import type { Enveloppe, Role, VehiculeCanonique } from "../src/types.ts";

function trajet(p: Partial<TrajetReconcilieRow>): TrajetReconcilieRow {
  return {
    role: "plateforme" as Role,
    source: "src",
    finess_juridique: "",
    finess_geographique: "",
    ght_code: "",
    ght_libelle: "",
    enveloppe: "Hors Article 80" as Enveloppe,
    annee: "2024",
    vehicule_canonique: "Ambulance" as VehiculeCanonique,
    nb_trajets: 0,
    ...p,
  };
}

describe("MartRatio.calculer", () => {
  const mart = new MartRatio({
    fichier: "x.csv",
    log: "x",
    grain: (t) => t.finess_juridique,
    identite: (cle) => ({ finess_juridique: cle }),
  });

  it("calcule part = plateforme / référentiel et signale part > 1", () => {
    const rows = mart.calculer([
      trajet({ role: "referentiel-national", finess_juridique: "J1", nb_trajets: 100 }),
      trajet({ role: "plateforme", finess_juridique: "J1", nb_trajets: 40 }),
      trajet({ role: "referentiel-national", finess_juridique: "J2", nb_trajets: 5 }),
      trajet({ role: "plateforme", finess_juridique: "J2", nb_trajets: 10 }),
    ]);
    expect(rows).toEqual([
      { finess_juridique: "J1", annee: "2024", vehicule: "Ambulance", nb_plateforme: 40, nb_reference: 100, part: 0.4, alerte_qualite: "" },
      { finess_juridique: "J2", annee: "2024", vehicule: "Ambulance", nb_plateforme: 10, nb_reference: 5, part: 2, alerte_qualite: "part>1" },
    ]);
  });

  it("laisse part vide (NULL) sans dénominateur, et ignore grain vide + Article 80", () => {
    const rows = mart.calculer([
      trajet({ role: "plateforme", finess_juridique: "J3", nb_trajets: 7 }), // pas de référentiel
      trajet({ role: "plateforme", finess_juridique: "", nb_trajets: 999 }), // grain vide → ignoré
      trajet({ role: "plateforme", finess_juridique: "J3", enveloppe: "Article 80", nb_trajets: 500 }), // art80 → ignoré
    ]);
    expect(rows).toEqual([
      { finess_juridique: "J3", annee: "2024", vehicule: "Ambulance", nb_plateforme: 7, nb_reference: 0, part: "", alerte_qualite: "" },
    ]);
  });
});

describe("MartArticle80.calculer", () => {
  it("répartit la part entre plateformes (part_plateforme = source / Σ), aux deux grains", () => {
    const rows = new MartArticle80(
      () => "CH Test",
      () => "GHT Test",
    ).calculer([
      trajet({ enveloppe: "Article 80", source: "a", finess_juridique: "J1", ght_code: "G1", nb_trajets: 30 }),
      trajet({ enveloppe: "Article 80", source: "b", finess_juridique: "J1", ght_code: "G1", nb_trajets: 10 }),
      trajet({ enveloppe: "Hors Article 80", source: "a", finess_juridique: "J1", ght_code: "G1", nb_trajets: 999 }), // ignoré
    ]);
    const jur = rows.filter((r) => r.grain === "juridique");
    expect(jur).toEqual([
      { grain: "juridique", cle: "J1", libelle: "CH Test", annee: "2024", vehicule: "Ambulance", plateforme: "a", nb: 30, part_plateforme: 0.75 },
      { grain: "juridique", cle: "J1", libelle: "CH Test", annee: "2024", vehicule: "Ambulance", plateforme: "b", nb: 10, part_plateforme: 0.25 },
    ]);
    expect(rows.filter((r) => r.grain === "ght").map((r) => r.part_plateforme)).toEqual([0.75, 0.25]);
  });
});

describe("MartGht2024.calculer", () => {
  // Lignes au format du mart GHT (build/marts/mart_ght.csv) : valeurs en chaînes.
  function ghtRow(p: Record<string, string>): Record<string, string> {
    return { ght_code: "", region: "", ght_libelle: "", annee: "2024", vehicule: "Ambulance", nb_plateforme: "0", nb_reference: "0", part: "", alerte_qualite: "", ...p };
  }

  it("somme les véhicules par GHT pour 2024, ignore les autres années, et calcule ratio = plateforme / cnam", () => {
    const rows = new MartGht2024().calculer([
      ghtRow({ ght_code: "G1", region: "ARA", ght_libelle: "GHT Un", vehicule: "Ambulance", nb_plateforme: "30", nb_reference: "100" }),
      ghtRow({ ght_code: "G1", region: "ARA", ght_libelle: "GHT Un", vehicule: "Assis", nb_plateforme: "20", nb_reference: "50" }),
      ghtRow({ ght_code: "G1", region: "ARA", ght_libelle: "GHT Un", annee: "2023", vehicule: "Ambulance", nb_plateforme: "999", nb_reference: "0" }), // autre année → ignorée
      ghtRow({ ght_code: "G2", region: "BFC", ght_libelle: "GHT Deux", vehicule: "Ambulance", nb_plateforme: "7", nb_reference: "0" }), // pas de dénominateur → ratio NULL
    ]);
    expect(rows).toEqual([
      { ght_code: "G1", region: "ARA", ght_libelle: "GHT Un", annee: "2024", nb_plateforme: 50, nb_cnam: 150, ratio: 0.3333 },
      { ght_code: "G2", region: "BFC", ght_libelle: "GHT Deux", annee: "2024", nb_plateforme: 7, nb_cnam: 0, ratio: "" },
    ]);
  });
});
