// Tests du rollup annuel (sans mock, sans I/O) : on appelle `calculer()` sur des lignes de
// mart de ratio synthétiques et on vérifie les règles (somme des véhicules, année filtrée,
// ratio, entités écartées, ratio>1) ainsi que les deux configurations livrées, GHT et
// établissement.

import { describe, expect, it } from "vitest";
import { MartRollup2024 } from "../src/04-marts/mart-rollup-2024.ts";

describe("MartRollup2024.calculer", () => {
  // Lignes au format d'un mart de ratio relu depuis son CSV : valeurs en chaînes.
  function ghtRow(p: Record<string, string>): Record<string, string> {
    return {
      ght_code: "",
      region: "",
      ght_libelle: "",
      annee: "2024",
      vehicule: "Ambulance",
      nb_plateforme: "0",
      nb_reference: "0",
      part: "",
      alerte_qualite: "",
      ...p,
    };
  }

  // La configuration qui produit mart_ght_2024 : elle sert de témoin de non-régression.
  const parGht = new MartRollup2024({
    source: "mart_ght.csv",
    fichier: "mart_ght_2024.csv",
    log: "ght_2024",
    cle: (r) => r.ght_code ?? "",
    identite: (r) => ({
      ght_code: r.ght_code ?? "",
      region: r.region ?? "",
      ght_libelle: r.ght_libelle ?? "",
    }),
  });

  it("somme les véhicules par clé pour 2024, ignore les autres années, et calcule ratio = plateforme / cnam", () => {
    const rows = parGht.calculer([
      ghtRow({
        ght_code: "G1",
        region: "ARA",
        ght_libelle: "GHT Un",
        vehicule: "Ambulance",
        nb_plateforme: "30",
        nb_reference: "100",
      }),
      ghtRow({
        ght_code: "G1",
        region: "ARA",
        ght_libelle: "GHT Un",
        vehicule: "Assis",
        nb_plateforme: "20",
        nb_reference: "50",
      }),
      ghtRow({
        ght_code: "G1",
        region: "ARA",
        ght_libelle: "GHT Un",
        annee: "2023",
        vehicule: "Ambulance",
        nb_plateforme: "999",
        nb_reference: "0",
      }), // autre année → ignorée
      ghtRow({ vehicule: "Assis", nb_plateforme: "999" }), // clé vide → ignorée
    ]);
    expect(rows).toEqual([
      {
        ght_code: "G1",
        region: "ARA",
        ght_libelle: "GHT Un",
        annee: "2024",
        nb_plateforme: 50,
        nb_cnam: 150,
        ratio: 0.3333,
        alerte_qualite: "",
      },
    ]);
  });

  it("écarte les entités sans trajet plateforme et celles sans trajet remboursé", () => {
    const rows = parGht.calculer([
      ghtRow({
        ght_code: "SANS_PLATEFORME",
        vehicule: "Ambulance",
        nb_plateforme: "0",
        nb_reference: "100",
      }),
      ghtRow({
        ght_code: "SANS_REMBOURSEMENT",
        vehicule: "Ambulance",
        nb_plateforme: "7",
        nb_reference: "0",
      }),
      ghtRow({
        ght_code: "GARDE",
        vehicule: "Ambulance",
        nb_plateforme: "1",
        nb_reference: "100",
      }),
    ]);
    expect(rows.map((r) => r.ght_code)).toEqual(["GARDE"]);
  });

  it("garde une entité dont un seul véhicule porte les deux membres du ratio", () => {
    const rows = parGht.calculer([
      ghtRow({
        ght_code: "G1",
        vehicule: "Ambulance",
        nb_plateforme: "0",
        nb_reference: "100",
      }),
      ghtRow({
        ght_code: "G1",
        vehicule: "Assis",
        nb_plateforme: "5",
        nb_reference: "0",
      }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ nb_plateforme: 5, nb_cnam: 100 });
  });


  it("signale ratio > 1 sans jamais le plafonner", () => {
    const rows = parGht.calculer([
      ghtRow({
        ght_code: "G1",
        vehicule: "Ambulance",
        nb_plateforme: "120",
        nb_reference: "100",
      }),
    ]);
    expect(rows[0]).toMatchObject({ ratio: 1.2, alerte_qualite: "ratio>1" });
  });

  it("habille les lignes avec les colonnes d'identité de la configuration, ici au grain établissement", () => {
    const parEtablissement = new MartRollup2024({
      source: "mart_juridique.csv",
      fichier: "mart_juridique_2024.csv",
      log: "juridique_2024",
      cle: (r) => r.finess_juridique ?? "",
      identite: (r) => ({
        finess_juridique: r.finess_juridique ?? "",
        nom: r.nom ?? "",
        ville: r.ville ?? "",
        departement: r.departement ?? "",
      }),
    });
    const juridiqueRow = (p: Record<string, string>) => ({
      finess_juridique: "",
      nom: "",
      ville: "",
      departement: "",
      annee: "2024",
      vehicule: "Ambulance",
      nb_plateforme: "0",
      nb_reference: "0",
      part: "",
      alerte_qualite: "",
      ...p,
    });
    const rows = parEtablissement.calculer([
      juridiqueRow({
        finess_juridique: "J1",
        nom: "CH Test",
        ville: "Ville",
        departement: "01000",
        vehicule: "Ambulance",
        nb_plateforme: "10",
        nb_reference: "40",
      }),
      // L'identité vient de la première ligne rencontrée, pas des suivantes.
      juridiqueRow({
        finess_juridique: "J1",
        nom: "AUTRE LIBELLE",
        vehicule: "Assis",
        nb_plateforme: "10",
        nb_reference: "60",
      }),
    ]);
    expect(rows).toEqual([
      {
        finess_juridique: "J1",
        nom: "CH Test",
        ville: "Ville",
        departement: "01000",
        annee: "2024",
        nb_plateforme: 20,
        nb_cnam: 100,
        ratio: 0.2,
        alerte_qualite: "",
      },
    ]);
  });
});
