// Étape 3 — reconcile : pose les clés qui rendent les sources jointables et comparables.
//
// Deux responsabilités :
//  1. Dimension établissements — un finess juridique regroupe plusieurs sites ; on retient
//     l'identité du site au plus gros volume (`score`) comme libellé représentatif.
//  2. Trajets réconciliés — aligne le finess de chaque trajet sur le **référentiel**, qui
//     fait autorité : le finess juridique retenu est celui que le référentiel associe au site
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
    this.#writeTrajets({
      geoToJuridique: this.#geoToJuridique(etablissements),
      juridiqueToGht: this.#juridiqueToGht(),
      libelleToFiness: this.#libelleToFiness(),
      libelleToGht: this.#libelleToGht(),
    });
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

  // --- Trajets réconciliés (finess alignés sur le référentiel + rattachement GHT) ---

  #writeTrajets(autorites: Autorites): void {
    const trajets = this.#readTrajets().map((t) => this.#aligner(t, autorites));
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

  // Deux replis successifs pour une ligne dont la source ne donne qu'un libellé libre, tous
  // deux appuyés sur des mappings manuels commités et relus par le porteur :
  //  1. `ref/plateforme-finess-mapping.csv` — le libellé désigne un **établissement**, on lui
  //     rend son finess juridique, qui donne le GHT par ricochet ;
  //  2. `ref/plateforme-ght-mapping.csv` — le libellé désigne un **GHT**, il n'y a pas de
  //     finess à trouver. C'est un repli, plus la clé principale.
  // Le finess prime toujours : il est plus fin, et il porte le rattachement au GHT.
  #aligner(t: TrajetRow, autorites: Autorites): TrajetReconcilieRow {
    const juridique = this.#juridique(t, autorites);
    const ght_code =
      autorites.juridiqueToGht.get(juridique) ||
      this.#ghtParLibelle(t, autorites);
    return { ...t, finess_juridique: juridique, ght_code };
  }

  #juridique(t: TrajetRow, autorites: Autorites): string {
    const geo = t.finess_geographique;
    return (
      (this.#usable(geo) && autorites.geoToJuridique.get(geo)) ||
      this.#juridiqueDeclare(t.finess_juridique, autorites) ||
      this.#chercherParLibelle(t.ght_libelle, autorites.libelleToFiness)
    );
  }

  // Une source peut intervertir ses deux colonnes finess. Quand le code déclaré juridique
  // n'est en fait qu'un site du référentiel, on lui rend son entité juridique. Sans risque
  // de confusion : aucun code du référentiel n'est à la fois juridique et site d'un autre.
  #juridiqueDeclare(declare: string, autorites: Autorites): string {
    if (!this.#usable(declare)) return declare;
    return autorites.geoToJuridique.get(declare) ?? declare;
  }

  #ghtParLibelle(t: TrajetRow, autorites: Autorites): string {
    return this.#chercherParLibelle(t.ght_libelle, autorites.libelleToGht);
  }

  #chercherParLibelle(libelle: string, table: Map<string, string>): string {
    if (!libelle) return "";
    return table.get(this.#normaliserLibelle(libelle)) ?? "";
  }

  // Le libellé de la plateforme porte des notes entre parenthèses (non versionnées) ; la clé
  // de rapprochement est le libellé nettoyé, tel que stocké dans le mapping manuel.
  #normaliserLibelle(libelle: string): string {
    return libelle.split("(")[0]!.trim();
  }

  // L'alignement peut faire coïncider des lignes jusque-là distinctes : on re-somme.
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
        "reconcile ght                : différé (build/extract/ght.csv absent — lancer `pnpm extract`)",
      );
    const manuel = join(Paths.REF, "finess-ght-manuel.csv");
    if (existsSync(manuel))
      for (const r of Csv.read(manuel))
        if (r.finess_juridique && r.ght_code)
          map.set(r.finess_juridique, r.ght_code);
    return map;
  }

  // Mapping manuel « libellé libre » → finess juridique, pour les libellés qui désignent un
  // établissement et non un GHT (relu par le porteur).
  #libelleToFiness(): Map<string, string> {
    return this.#mappingManuel(
      "plateforme-finess-mapping.csv",
      "finess_juridique",
    );
  }

  // Mapping manuel « libellé libre de la plateforme au niveau GHT » → GHT (relu par le porteur).
  #libelleToGht(): Map<string, string> {
    return this.#mappingManuel("plateforme-ght-mapping.csv", "ght_code");
  }

  #mappingManuel(fichier: string, colonne: string): Map<string, string> {
    const path = join(Paths.REF, fichier);
    if (!existsSync(path)) return new Map();
    const rows = Csv.read(path).filter((r) => r.libelle && r[colonne]);
    return new Map(rows.map((r) => [r.libelle!, r[colonne]!]));
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

/** Les tables d'autorité que `reconcile` applique à chaque trajet. */
interface Autorites {
  geoToJuridique: Map<string, string>;
  juridiqueToGht: Map<string, string>;
  libelleToFiness: Map<string, string>;
  libelleToGht: Map<string, string>;
}
