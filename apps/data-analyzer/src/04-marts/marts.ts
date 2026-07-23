// Étape 4 — marts : applique les règles de calcul et produit les livrables. Le calcul ne
// connaît que des rôles ; chaque mart n'est qu'un choix de **grain** sur les trajets
// réconciliés (build/reconcile/trajets.csv), habillé par une dimension d'identité.
//
// Cinq livrables (cf. « Points d'attention métier » du README pour les spécificités) :
//   - mart_geographique — grain finess géographique (le plus fin ; beaucoup de part NULL) ;
//   - mart_juridique    — grain finess juridique (autorité référentiel) ;
//   - mart_ght          — grain GHT (le plus propre ; établissements publics only) ;
//   - mart_hors_ght     — grain finess juridique, restreint aux établissements sans GHT ;
//   - mart_article80    — volumes + part par plateforme (pas de dénominateur national).

import { existsSync } from "node:fs";
import { join } from "node:path";
import { Csv } from "../csv.ts";
import { Paths } from "../paths.ts";
import { MartRatio } from "./mart-ratio.ts";
import { MartArticle80 } from "./mart-article80.ts";
import type {
  EtablissementDimensionRow,
  EtablissementRow,
  GhtRattachementRow,
  TrajetReconcilieRow,
} from "../contrats.ts";

type Row = Record<string, string | number>;

export class Marts {
  #juridique = new Map<string, EtablissementDimensionRow>();
  #geo = new Map<string, EtablissementRow>();
  #ght = new Map<string, GhtRattachementRow>();

  execute(): void {
    this.#loadDimensions();
    const trajets = this.#loadTrajets();
    this.#martsRatio().forEach((mart) => mart.execute(trajets));
    new MartArticle80(
      (cle) => this.#juridique.get(cle)?.nom ?? "",
      (cle) => this.#ght.get(cle)?.ght_libelle ?? "",
    ).execute(trajets);
  }

  #martsRatio(): MartRatio[] {
    return [
      new MartRatio({
        fichier: "mart_geographique.csv",
        log: "geographique",
        grain: (t) => (this.#usable(t.finess_geographique) ? t.finess_geographique : ""),
        identite: (cle) => this.#identiteGeo(cle),
      }),
      new MartRatio({
        fichier: "mart_juridique.csv",
        log: "juridique",
        grain: (t) => t.finess_juridique,
        identite: (cle) => this.#identiteJuridique(cle),
      }),
      new MartRatio({
        fichier: "mart_ght.csv",
        log: "ght",
        grain: (t) => t.ght_code,
        identite: (cle) => this.#identiteGht(cle),
      }),
      new MartRatio({
        fichier: "mart_hors_ght.csv",
        log: "hors_ght",
        grain: (t) => (t.ght_code ? "" : t.finess_juridique),
        identite: (cle) => this.#identiteJuridique(cle),
      }),
    ];
  }

  #identiteGeo(cle: string): Row {
    const e = this.#geo.get(cle);
    return {
      finess_geographique: cle,
      finess_juridique: e?.finess_juridique ?? "",
      nom: e?.nom ?? "",
      ville: e?.ville ?? "",
      departement: e?.departement ?? "",
    };
  }

  #identiteJuridique(cle: string): Row {
    const e = this.#juridique.get(cle);
    return { finess_juridique: cle, nom: e?.nom ?? "", ville: e?.ville ?? "", departement: e?.departement ?? "" };
  }

  #identiteGht(cle: string): Row {
    const g = this.#ght.get(cle);
    return { ght_code: cle, region: g?.region ?? "", ght_libelle: g?.ght_libelle ?? "" };
  }

  #loadDimensions(): void {
    this.#juridique = new Map(this.#readDimension().map((r) => [r.finess_juridique, r]));
    this.#geo = this.#geoDimension();
    this.#ght = this.#ghtDimension();
  }

  #readDimension(): EtablissementDimensionRow[] {
    return Csv.read(join(Paths.RECONCILE, "etablissements.csv")) as unknown as EtablissementDimensionRow[];
  }

  // Un site (finess géographique) peut apparaître plusieurs fois : on garde le plus gros volume.
  #geoDimension(): Map<string, EtablissementRow> {
    const map = new Map<string, EtablissementRow>();
    for (const raw of Csv.read(join(Paths.EXTRACT, "etablissements.csv"))) {
      const e = { ...raw, score: Number(raw.score) } as unknown as EtablissementRow;
      const courant = map.get(e.finess_geographique);
      if (this.#usable(e.finess_geographique) && (!courant || e.score > courant.score)) map.set(e.finess_geographique, e);
    }
    return map;
  }

  #ghtDimension(): Map<string, GhtRattachementRow> {
    const map = new Map<string, GhtRattachementRow>();
    const path = join(Paths.EXTRACT, "ght.csv");
    if (!existsSync(path)) return map;
    for (const raw of Csv.read(path)) {
      const g = raw as unknown as GhtRattachementRow;
      if (!map.has(g.ght_code)) map.set(g.ght_code, g);
    }
    return map;
  }

  #loadTrajets(): TrajetReconcilieRow[] {
    return Csv.read(join(Paths.RECONCILE, "trajets.csv")).map(
      (raw) => ({ ...raw, nb_trajets: Number(raw.nb_trajets) }) as unknown as TrajetReconcilieRow,
    );
  }

  #usable(finess: string): boolean {
    return Boolean(finess) && finess !== "0";
  }
}

if (import.meta.url === `file://${process.argv[1]}`) new Marts().execute();
