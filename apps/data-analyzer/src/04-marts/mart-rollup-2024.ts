// Rollup annuel générique : agrège un **mart de ratio** sur l'axe véhicule, pour une seule
// année, **tous types de transport confondus**. Une ligne par clé du mart source :
//   nb_plateforme = Σ trajets remontés par les plateformes (numérateur),
//   nb_cnam       = Σ trajets remboursés par la CNAM / référentiel national (dénominateur),
//   ratio         = nb_plateforme / nb_cnam, jamais plafonné.
// But : révéler d'un coup d'œil le **taux réel de recours aux plateformes**, par GHT ou par
// établissement selon la configuration. Seules les entités qui ont les deux membres du
// ratio y figurent (cf. `lisible`).
//
// Dérivé du mart de ratio écrit juste avant (pas des trajets réconciliés) : c'est une simple
// agrégation du livrable existant, ce qui garantit que les deux racontent la même chose.
//
// La clé et les colonnes d'identité sont fournies par l'appelant, comme pour `MartRatio` :
// la règle du ratio, celle du NULL et celle de l'alerte ne s'écrivent ainsi qu'une fois.

import { join } from "node:path";
import { Csv } from "../csv.ts";
import { Paths } from "../paths.ts";
import { joindrePlateformes, separerPlateformes } from "./plateformes.ts";

export interface MartRollup2024Config {
  source: string; // mart de ratio lu dans build/marts/
  fichier: string; // nom du CSV produit dans build/marts/
  log: string; // libellé affiché
  cle: (r: Ligne) => string; // valeur de clé, "" pour ignorer la ligne
  identite: (r: Ligne) => Row; // colonnes d'identité, reprises de la 1re ligne rencontrée
}

export class MartRollup2024 {
  readonly #config: MartRollup2024Config;

  constructor(config: MartRollup2024Config) {
    this.#config = config;
  }

  execute(): void {
    const rows = this.calculer(
      Csv.read(join(Paths.MARTS, this.#config.source)),
    );
    Csv.write(join(Paths.MARTS, this.#config.fichier), rows);
    this.#report(rows);
  }

  /** Le calcul pur (sans I/O), pour le test comme pour `execute`. */
  calculer(martRatio: Ligne[]): Row[] {
    const parCle = new Map<string, Accu>();
    for (const r of martRatio) this.#accumuler(parCle, r);
    return [...parCle.entries()]
      .filter(([, accu]) => lisible(accu))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, accu]) => this.#toRow(accu));
  }

  #accumuler(parCle: Map<string, Accu>, r: Ligne): void {
    if (r.annee !== ANNEE) return;
    const cle = this.#config.cle(r);
    if (!cle) return;
    const accu = this.#accu(parCle, cle, r);
    accu.nb_plateforme += Number(r.nb_plateforme) || 0;
    accu.nb_cnam += Number(r.nb_reference) || 0;
    for (const nom of separerPlateformes(r.plateforme ?? ""))
      accu.plateformes.add(nom);
  }

  #accu(parCle: Map<string, Accu>, cle: string, r: Ligne): Accu {
    const connu = parCle.get(cle);
    if (connu) return connu;
    const accu: Accu = {
      identite: this.#config.identite(r),
      nb_plateforme: 0,
      nb_cnam: 0,
      plateformes: new Set(),
    };
    parCle.set(cle, accu);
    return accu;
  }

  #toRow(accu: Accu): Row {
    const ratio =
      accu.nb_cnam > 0
        ? Number((accu.nb_plateforme / accu.nb_cnam).toFixed(4))
        : "";
    return {
      ...accu.identite,
      annee: ANNEE,
      plateforme: joindrePlateformes(accu.plateformes),
      nb_plateforme: accu.nb_plateforme,
      nb_cnam: accu.nb_cnam,
      ratio,
      alerte_qualite: typeof ratio === "number" && ratio > 1 ? "ratio>1" : "",
    };
  }

  #report(rows: Row[]): void {
    const anomalies = rows.filter((r) => r.alerte_qualite === "ratio>1").length;
    console.log(
      `marts ${this.#config.log.padEnd(15)}: ${rows.length} lignes (année ${ANNEE}, tous transports, plateforme et remboursement non nuls, ${anomalies} ratio>1)`,
    );
  }
}

// ---- implémentation ----

type Row = Record<string, string | number>;

/** Ligne d'un mart de ratio relue depuis son CSV : toutes les valeurs y sont des chaînes. */
type Ligne = Record<string, string>;

// Seule année demandée. Le référentiel national ne couvre que 2024-2025 (cf. README,
// point 4) : hors de cette fenêtre le ratio serait NULL partout.
const ANNEE = "2024";

interface Accu {
  identite: Row;
  nb_plateforme: number;
  nb_cnam: number;
  plateformes: Set<string>;
}

// Un rollup se lit comme un taux de recours. Une entité qui n'a aucun des deux membres du
// ratio n'y répond pas : sans trajet plateforme le ratio vaut 0, sans remboursement il est
// NULL. Dans les deux cas la ligne ne dit rien du recours et noie celles qui en disent
// quelque chose. Le fait « cette entité n'a aucun trajet plateforme » reste lisible dans le
// mart de ratio dont ce rollup dérive.
function lisible(accu: Accu): boolean {
  return accu.nb_plateforme > 0 && accu.nb_cnam > 0;
}
