// Mart « GHT 2024 » : rollup du mart GHT (build/marts/mart_ght.csv) pour une seule année,
// **tous types de transport confondus**. Une ligne par GHT :
//   nb_plateforme = Σ trajets remontés par les plateformes (numérateur),
//   nb_cnam       = Σ trajets remboursés par la CNAM / référentiel national (dénominateur),
//   ratio         = nb_plateforme / nb_cnam — vide (NULL) sans dénominateur.
// But : révéler d'un coup d'œil le **taux réel de recours aux plateformes par GHT**.
//
// Dérivé du **mart GHT** (pas des trajets réconciliés) : simple agrégation du livrable
// existant sur l'axe véhicule, restreinte à l'année cible.

import { join } from "node:path";
import { Csv } from "../csv.ts";
import { Paths } from "../paths.ts";

type Row = Record<string, string | number>;

// Seule année demandée. Le référentiel national ne couvre que 2024-2025 (cf. README,
// point 4) : hors de cette fenêtre le ratio serait NULL partout.
const ANNEE = "2024";

interface Accu {
  region: string;
  ght_libelle: string;
  nb_plateforme: number;
  nb_cnam: number;
}

export class MartGht2024 {
  execute(): void {
    const rows = this.calculer(Csv.read(join(Paths.MARTS, "mart_ght.csv")));
    Csv.write(join(Paths.MARTS, "mart_ght_2024.csv"), rows);
    console.log(`marts ght_2024        : ${rows.length} GHT (année ${ANNEE}, tous transports)`);
  }

  /** Calcul pur (sans I/O) : agrège les véhicules du mart GHT par GHT, pour l'année cible. */
  calculer(martGht: Record<string, string>[]): Row[] {
    const parGht = new Map<string, Accu>();
    for (const r of martGht) {
      if (r.annee !== ANNEE || !r.ght_code) continue;
      const accu = this.#accu(parGht, r.ght_code, r);
      accu.nb_plateforme += Number(r.nb_plateforme) || 0;
      accu.nb_cnam += Number(r.nb_reference) || 0;
    }
    return [...parGht.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ght_code, accu]) => this.#toRow(ght_code, accu));
  }

  #accu(parGht: Map<string, Accu>, ght_code: string, r: Record<string, string>): Accu {
    let accu = parGht.get(ght_code);
    if (!accu)
      parGht.set(ght_code, (accu = { region: r.region ?? "", ght_libelle: r.ght_libelle ?? "", nb_plateforme: 0, nb_cnam: 0 }));
    return accu;
  }

  #toRow(ght_code: string, accu: Accu): Row {
    return {
      ght_code,
      region: accu.region,
      ght_libelle: accu.ght_libelle,
      annee: ANNEE,
      nb_plateforme: accu.nb_plateforme,
      nb_cnam: accu.nb_cnam,
      ratio: accu.nb_cnam > 0 ? Number((accu.nb_plateforme / accu.nb_cnam).toFixed(4)) : "",
    };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) new MartGht2024().execute();
