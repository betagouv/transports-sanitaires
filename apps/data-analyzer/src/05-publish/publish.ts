// Étape 5 — publication : pousse les marts dans Grist pour la dataviz.
//
// Générique : chaque mart déclare son fichier source, sa table Grist et ses colonnes
// (dans MARTS ci-dessous) ; le moteur — garantir la table + remplacer son contenu — est
// mutualisé (voir grist.ts). Ajouter un mart publiable = ajouter une entrée à MARTS.
//
// Config (env, .env lu automatiquement s'il existe) :
//   GRIST_DOC_URL — base API du doc cible, ex. https://…/api/docs/<docId>
//   GRIST_API_KEY — clé API Grist
//
//   npm run publish-grist              # tous les marts publiables
//   npm run publish-grist -- ght_2024  # un seul (par son nom court)

import { join } from "node:path";
import { Csv } from "../csv.ts";
import { Paths } from "../paths.ts";
import { GristDoc, coerce, type ColumnSpec } from "./grist.ts";

interface MartSpec {
  nom: string; // nom court : sélection en CLI + log
  fichier: string; // CSV source dans build/marts/
  table: string; // table Grist cible
  columns: ColumnSpec[]; // ordre = ordre des colonnes à la création de la table
}

const MARTS: MartSpec[] = [
  {
    nom: "ght",
    fichier: "mart_ght.csv",
    table: "Mart_Ght",
    columns: [
      { id: "ght_code", type: "Text" },
      { id: "region", type: "Text" },
      { id: "ght_libelle", type: "Text" },
      { id: "annee", type: "Int" },
      { id: "vehicule", type: "Text" },
      { id: "nb_plateforme", type: "Int" },
      { id: "nb_reference", type: "Int" },
      { id: "part", type: "Numeric" },
      { id: "alerte_qualite", type: "Text" },
    ],
  },
  {
    nom: "ght_2024",
    fichier: "mart_ght_2024.csv",
    table: "Mart_Ght_2024",
    columns: [
      { id: "ght_code", type: "Text" },
      { id: "region", type: "Text" },
      { id: "ght_libelle", type: "Text" },
      { id: "annee", type: "Int" },
      { id: "nb_plateforme", type: "Int" },
      { id: "nb_cnam", type: "Int" },
      { id: "ratio", type: "Numeric" },
    ],
  },
];

export class PublishMart {
  readonly #doc: GristDoc;

  constructor(doc: GristDoc) {
    this.#doc = doc;
  }

  async execute(spec: MartSpec): Promise<void> {
    const source = Csv.read(join(Paths.MARTS, spec.fichier));
    const rows = source.map((row) =>
      Object.fromEntries(spec.columns.map((c) => [c.id, coerce(row[c.id] ?? "", c.type)])),
    );
    await this.#doc.ensureTable(spec.table, spec.columns);
    await this.#doc.replaceAll(spec.table, rows);
    console.log(`Grist ${spec.table.padEnd(16)} ← ${rows.length} lignes publiées.`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.loadEnvFile();
  } catch {
    // Pas de .env : on se rabat sur l'environnement du shell.
  }
  const docUrl = process.env.GRIST_DOC_URL?.trim();
  const apiKey = process.env.GRIST_API_KEY?.trim();
  if (!docUrl || !apiKey) {
    console.error("GRIST_DOC_URL et GRIST_API_KEY sont requis (voir .env).");
    process.exit(1);
  }
  const filtre = process.argv[2]?.trim();
  const specs = filtre ? MARTS.filter((m) => m.nom === filtre) : MARTS;
  if (specs.length === 0) {
    console.error(`Mart inconnu : « ${filtre} ». Disponibles : ${MARTS.map((m) => m.nom).join(", ")}.`);
    process.exit(1);
  }
  const publisher = new PublishMart(new GristDoc(docUrl, apiKey));
  for (const spec of specs) await publisher.execute(spec);
}
