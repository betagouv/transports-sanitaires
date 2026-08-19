// Mart « Article 80 » : le remboursement national ne couvre PAS l'art. 80, donc pas de
// dénominateur indépendant → le ratio « via plateforme » vaudrait 100 % par construction.
// L'information utile est le **volume** et la **part de chaque plateforme** dans ce total.
//
// Produit un seul fichier, à deux grains (juridique et GHT), avec une colonne `grain` :
//   part_plateforme = nb(source) / Σ nb(toutes plateformes) pour la cellule.
// La plateforme au niveau GHT sans finess (rôle plateforme, ni finess ni GHT rattaché) ne
// remonte pour l'instant ni au juridique ni au GHT — cf. Points d'attention métier du README.

import { join } from "node:path";
import type { TrajetReconcilieRow } from "../contrats.ts";
import { Csv } from "../csv.ts";
import { Paths } from "../paths.ts";

export class MartArticle80 {
  readonly #grains: Grain[];

  constructor(libelleJuridique: Libelle, libelleGht: Libelle) {
    this.#grains = [
      {
        nom: "juridique",
        cle: (t) => t.finess_juridique,
        libelle: libelleJuridique,
      },
      { nom: "ght", cle: (t) => t.ght_code, libelle: libelleGht },
    ];
  }

  execute(trajets: TrajetReconcilieRow[]): void {
    const rows = this.calculer(trajets);
    Csv.write(join(Paths.MARTS, "mart_article80.csv"), rows);
    console.log(
      `marts article80       : ${rows.length} lignes (volumes + part par plateforme)`,
    );
  }

  /** Le calcul pur (sans écriture), pour le test comme pour `execute`. */
  calculer(trajets: TrajetReconcilieRow[]): Row[] {
    const art80 = trajets.filter(
      (t) => t.enveloppe === "Article 80" && t.role === "plateforme",
    );
    return this.#grains.flatMap((g) => this.#pourGrain(art80, g));
  }

  #pourGrain(art80: TrajetReconcilieRow[], grain: Grain): Row[] {
    const parSource = this.#agreger(art80, grain); // (grain|annee|vehicule|source) → nb
    const totaux = this.#totaux(parSource); // (grain|annee|vehicule) → Σ plateformes
    return [...parSource.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cle, nb]) => this.#toRow(grain, cle, nb, totaux));
  }

  #agreger(art80: TrajetReconcilieRow[], grain: Grain): Map<string, number> {
    const parSource = new Map<string, number>();
    for (const t of art80) {
      const cle = grain.cle(t);
      if (!cle) continue;
      const k = `${cle}|${t.annee}|${t.vehicule_canonique}|${t.source}`;
      parSource.set(k, (parSource.get(k) ?? 0) + Number(t.nb_trajets));
    }
    return parSource;
  }

  #totaux(parSource: Map<string, number>): Map<string, number> {
    const totaux = new Map<string, number>();
    for (const [k, nb] of parSource) {
      const cellule = k.split("|").slice(0, 3).join("|");
      totaux.set(cellule, (totaux.get(cellule) ?? 0) + nb);
    }
    return totaux;
  }

  #toRow(
    grain: Grain,
    cle: string,
    nb: number,
    totaux: Map<string, number>,
  ): Row {
    const [valeur, annee, vehicule, source] = cle.split("|");
    const total = totaux.get(`${valeur}|${annee}|${vehicule}`) ?? 0;
    return {
      grain: grain.nom,
      cle: valeur!,
      libelle: grain.libelle(valeur!),
      annee: annee!,
      vehicule: vehicule!,
      plateforme: source!,
      nb,
      part_plateforme: total > 0 ? Number((nb / total).toFixed(4)) : "",
    };
  }
}

// ---- implémentation ----

type Row = Record<string, string | number>;
type Libelle = (cle: string) => string;

interface Grain {
  nom: string; // valeur de la colonne `grain`
  cle: (t: TrajetReconcilieRow) => string; // "" pour ignorer
  libelle: Libelle;
}
