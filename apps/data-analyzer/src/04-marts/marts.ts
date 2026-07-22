// Étape 4 — marts : applique la règle de calcul et produit les livrables.
//
// Itération 1 : `mart_etablissement` — part des trajets **hors Article 80** réalisés via
// les plateformes (rôle `plateforme`, à finess), par établissement × année × type.
//   part = Σ plateformes(hors art.80) / référentiel national,  au grain finess juridique
//          × année × véhicule canonique.
// Jointure externe complète : on garde les cellules sans dénominateur (années non
// couvertes par le référentiel) avec part = "" (NULL, tracé), et les cellules du
// référentiel sans plateforme (part = 0).
//
// Le calcul ne connaît que des **rôles**, jamais l'identité des fournisseurs. mart_ght
// (exhaustif, plateformes au niveau GHT) est différé (cf. spec).

import { join } from "node:path";
import { readCsv, writeCsv } from "../csv.ts";
import { MARTS, RECONCILE, STAGING } from "../paths.ts";
import type {
  EtablissementDimensionRow,
  MartEtablissementRow,
  TrajetRow,
} from "../contrats.ts";
import type { VehiculeCanonique } from "../types.ts";

interface Cellule {
  nb_plateforme: number;
  nb_reference: number;
}

export function marts(): void {
  const trajets = readCsv(join(STAGING, "trajets.csv")) as unknown as TrajetRow[];
  const etablissements = new Map<string, EtablissementDimensionRow>(
    readCsv(join(RECONCILE, "etablissements.csv")).map((r) => [
      r.finess_juridique!,
      r as unknown as EtablissementDimensionRow,
    ]),
  );

  const cellules = new Map<string, Cellule>();
  const get = (k: string): Cellule => {
    let c = cellules.get(k);
    if (!c) cellules.set(k, (c = { nb_plateforme: 0, nb_reference: 0 }));
    return c;
  };
  for (const t of trajets) {
    if (t.enveloppe !== "Hors Article 80" || !t.finess_juridique) continue;
    const nb = Number(t.nb_trajets);
    const k = `${t.finess_juridique}|${t.annee}|${t.vehicule_canonique}`;
    if (t.role === "referentiel-national") get(k).nb_reference += nb;
    else if (t.role === "plateforme") get(k).nb_plateforme += nb;
  }

  const rows: MartEtablissementRow[] = [...cellules.entries()]
    .map(([k, c]) => {
      const [finess, annee, vehicule] = k.split("|") as [string, string, VehiculeCanonique];
      const etab = etablissements.get(finess);
      return {
        finess_juridique: finess,
        nom: etab?.nom ?? "",
        ville: etab?.ville ?? "",
        departement: etab?.departement ?? "",
        annee,
        vehicule,
        nb_plateforme: c.nb_plateforme,
        nb_reference: c.nb_reference,
        part: c.nb_reference > 0 ? Number((c.nb_plateforme / c.nb_reference).toFixed(4)) : ("" as const),
      };
    })
    .sort(
      (a, b) =>
        a.finess_juridique.localeCompare(b.finess_juridique) ||
        a.annee.localeCompare(b.annee) ||
        a.vehicule.localeCompare(b.vehicule),
    );

  writeCsv(join(MARTS, "mart_etablissement.csv"), rows as unknown as Record<string, string | number>[]);

  const sansDenominateur = rows.filter((r) => r.part === "").length;
  const anomalies = rows.filter((r) => typeof r.part === "number" && r.part > 1).length;
  console.log(
    `marts etablissement          : ${rows.length} lignes (${sansDenominateur} sans dénominateur)`,
  );
  if (anomalies > 0) console.warn(`  ⚠️ ${anomalies} cellules avec part > 1 (à investiguer)`);
}

if (import.meta.url === `file://${process.argv[1]}`) marts();
