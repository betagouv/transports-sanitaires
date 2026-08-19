// Étape 3 — reconcile : pose les clés qui rendent les sources jointables et comparables.
//
// Deux responsabilités :
//  1. Dimension établissements — un finess juridique regroupe plusieurs sites ; on retient
//     l'identité du site au plus gros volume (`score`) comme libellé représentatif.
//  2. Trajets réconciliés — ré-clé chaque trajet sur l'**autorité du référentiel** : le
//     finess juridique retenu est celui que le référentiel national associe au site
//     géographique (et non celui déclaré par la source, qui peut diverger — cf. Points
//     d'attention métier du README). On rattache aussi chaque trajet à son GHT.
//
// Le référentiel finess → GHT vient de `build/extract/ght.csv` (source `referentiel-ght`,
// open data data.gouv `etablissements-de-sante-par-ght`, bundles versionnés dans `ref/ght/`).

import { existsSync } from "node:fs";
import { join } from "node:path";
import type {
  EtablissementDimensionRow,
  EtablissementRow,
  GhtRattachementRow,
  TrajetReconcilieRow,
  TrajetRow,
} from "../contrats.ts";
import { Csv } from "../csv.ts";
import { Paths } from "../paths.ts";

export class Reconcile {
  execute(): void {
    const etablissements = this.#readEtablissements();
    this.#writeDimension(etablissements);
    this.#writeTrajets(
      this.#geoToJuridique(etablissements),
      this.#juridiqueToGht(),
      this.#libelleToGht(),
    );
  }

  // --- Dimension établissements (un libellé représentatif par finess juridique) ---

  #writeDimension(etablissements: EtablissementRow[]): void {
    const representatifs = this.#representatifs(etablissements);
    Csv.write(
      join(Paths.RECONCILE, "etablissements.csv"),
      representatifs as unknown as Row[],
    );
    console.log(
      `reconcile etablissements     : ${representatifs.length} établissements`,
    );
  }

  #representatifs(rows: EtablissementRow[]): EtablissementDimensionRow[] {
    const parJuridique = new Map<string, EtablissementRow>();
    for (const row of rows) this.#garderMeilleur(parJuridique, row);
    return [...parJuridique.values()].map((e) => this.#toDimension(e));
  }

  #garderMeilleur(
    parJuridique: Map<string, EtablissementRow>,
    row: EtablissementRow,
  ): void {
    const courant = parJuridique.get(row.finess_juridique);
    if (!courant || row.score > courant.score)
      parJuridique.set(row.finess_juridique, row);
  }

  #toDimension(e: EtablissementRow): EtablissementDimensionRow {
    return {
      finess_juridique: e.finess_juridique,
      nom: e.nom,
      ville: e.ville,
      departement: e.departement,
      categorie: e.categorie,
    };
  }

  // --- Trajets réconciliés (ré-clé sur l'autorité du référentiel + rattachement GHT) ---

  #writeTrajets(
    geoToJuridique: Map<string, string>,
    juridiqueToGht: Map<string, string>,
    libelleToGht: Map<string, string>,
  ): void {
    const trajets = this.#readTrajets().map((t) =>
      this.#recle(t, geoToJuridique, juridiqueToGht, libelleToGht),
    );
    const reagreges = this.#reagreger(trajets);
    Csv.write(
      join(Paths.RECONCILE, "trajets.csv"),
      reagreges as unknown as Row[],
    );
    const rattaches = reagreges.filter((t) => t.ght_code).length;
    console.log(
      `reconcile trajets            : ${reagreges.length} lignes (${rattaches} rattachées à un GHT)`,
    );
  }

  // Rattachement au GHT : par finess (référentiel) ; à défaut, par libellé libre (plateforme
  // au niveau GHT, sans finess) via le mapping manuel commité `ref/plateforme-ght-mapping.csv`.
  #recle(
    t: TrajetRow,
    geoToJuridique: Map<string, string>,
    juridiqueToGht: Map<string, string>,
    libelleToGht: Map<string, string>,
  ): TrajetReconcilieRow {
    const geo = t.finess_geographique;
    const juridique =
      (this.#usable(geo) && geoToJuridique.get(geo)) || t.finess_juridique;
    const ghtParFiness = juridiqueToGht.get(juridique) ?? "";
    const ght_code =
      ghtParFiness ||
      (t.ght_libelle
        ? (libelleToGht.get(this.#normaliserLibelle(t.ght_libelle)) ?? "")
        : "");
    return { ...t, finess_juridique: juridique, ght_code };
  }

  // Le libellé de la plateforme porte des notes entre parenthèses (non versionnées) ; la clé
  // de rapprochement est le libellé nettoyé, tel que stocké dans le mapping manuel.
  #normaliserLibelle(libelle: string): string {
    return libelle.split("(")[0]!.trim();
  }

  // La ré-clé peut faire coïncider des lignes jusque-là distinctes : on re-somme.
  #reagreger(rows: TrajetReconcilieRow[]): TrajetReconcilieRow[] {
    const parCle = new Map<string, TrajetReconcilieRow>();
    for (const row of rows) {
      const existante = parCle.get(this.#cle(row));
      if (existante) existante.nb_trajets += row.nb_trajets;
      else parCle.set(this.#cle(row), row);
    }
    return [...parCle.values()];
  }

  #cle(t: TrajetReconcilieRow): string {
    return [
      t.role,
      t.source,
      t.finess_juridique,
      t.finess_geographique,
      t.ght_code,
      t.ght_libelle,
      t.enveloppe,
      t.annee,
      t.vehicule_canonique,
    ].join("|");
  }

  // --- Tables d'autorité ---

  #geoToJuridique(rows: EtablissementRow[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const r of rows)
      if (this.#usable(r.finess_geographique))
        map.set(r.finess_geographique, r.finess_juridique);
    return map;
  }

  // finess juridique → GHT : l'open data (build/extract/ght.csv) complété par des overrides
  // manuels (ref/finess-ght-manuel.csv) pour les entités hors référentiel — ex. l'AP-HP,
  // absente des 135 GHT mais dont le référentiel porte les trajets sous un finess juridique.
  #juridiqueToGht(): Map<string, string> {
    const map = new Map<string, string>();
    const openData = join(Paths.EXTRACT, "ght.csv");
    if (existsSync(openData))
      for (const r of Csv.read(openData) as unknown as GhtRattachementRow[])
        map.set(r.finess_juridique, r.ght_code);
    else
      console.log(
        "reconcile ght                : différé (build/extract/ght.csv absent — lancer `npm run extract`)",
      );
    const manuel = join(Paths.REF, "finess-ght-manuel.csv");
    if (existsSync(manuel))
      for (const r of Csv.read(manuel))
        if (r.finess_juridique && r.ght_code)
          map.set(r.finess_juridique, r.ght_code);
    return map;
  }

  // Mapping manuel « libellé libre de la plateforme au niveau GHT » → GHT (relu par le porteur).
  #libelleToGht(): Map<string, string> {
    const path = join(Paths.REF, "plateforme-ght-mapping.csv");
    if (!existsSync(path)) return new Map();
    const rows = Csv.read(path);
    return new Map(
      rows.filter((r) => r.ght_code).map((r) => [r.libelle!, r.ght_code!]),
    );
  }

  // --- Lecture ---

  #readEtablissements(): EtablissementRow[] {
    const path = join(Paths.EXTRACT, "etablissements.csv");
    return Csv.read(path).map(
      (raw) =>
        ({ ...raw, score: Number(raw.score) }) as unknown as EtablissementRow,
    );
  }

  #readTrajets(): TrajetRow[] {
    const path = join(Paths.STAGING, "trajets.csv");
    return Csv.read(path).map(
      (raw) =>
        ({
          ...raw,
          nb_trajets: Number(raw.nb_trajets),
        }) as unknown as TrajetRow,
    );
  }

  #usable(finess: string): boolean {
    return Boolean(finess) && finess !== "0";
  }
}

if (import.meta.url === `file://${process.argv[1]}`) new Reconcile().execute();

// ---- implémentation ----

type Row = Record<string, string | number>;
