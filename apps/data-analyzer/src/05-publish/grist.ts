// Client REST Grist minimal, dédié à la **publication** des marts pour la dataviz.
//
// Conventions API identiques à celles du simulateur (server/identification/
// referentiel-grist.ts) : base = `…/api/docs/<docId>`, auth `Bearer <clé>`.
//
// Ce module ne fait que ce dont un mart a besoin : garantir la table et ses
// colonnes, **remplacer** intégralement son contenu (vider + réinsérer), et
// **ranger** sa page. Un mart est un snapshot régénéré à chaque ETL : le
// remplacement évite les lignes périmées et rend la publication idempotente.
// Personne n'édite ces tables à la main : les charts et vues Grist référencent la
// table et les valeurs, pas les rowId.

export type GristType = "Text" | "Int" | "Numeric";

/** Descripteur d'une colonne : son id Grist et son type (pilote la coercition). */
export type ColumnSpec = { id: string; type: GristType };

export class GristDoc {
  readonly #base: string;
  readonly #apiKey: string;

  constructor(docUrl: string, apiKey: string) {
    this.#base = docUrl.replace(/\/$/, "");
    this.#apiKey = apiKey;
  }

  /** Crée la table si absente ; ajoute les colonnes manquantes si elle existe déjà. */
  async ensureTable(table: string, columns: ColumnSpec[]): Promise<void> {
    const tables = await this.#get<{ tables?: { id: string }[] }>("/tables");
    const existe = (tables.tables ?? []).some((t) => t.id === table);
    if (!existe) {
      await this.#post("/tables", {
        tables: [{ id: table, columns: columns.map(colDef) }],
      });
      return;
    }
    const cols = await this.#get<{ columns?: { id: string }[] }>(
      `/tables/${table}/columns`,
    );
    const presentes = new Set((cols.columns ?? []).map((c) => c.id));
    const manquantes = columns.filter((c) => !presentes.has(c.id));
    if (manquantes.length > 0) {
      await this.#post(`/tables/${table}/columns`, {
        columns: manquantes.map(colDef),
      });
    }
  }

  /** Vide la table puis réinsère toutes les lignes (par lots). */
  async replaceAll(
    table: string,
    rows: Record<string, unknown>[],
  ): Promise<void> {
    const existants = await this.#get<{ records?: GristRecord[] }>(
      `/tables/${table}/records`,
    );
    const ids = (existants.records ?? []).map((r) => r.id);
    if (ids.length > 0) {
      await this.#post(`/tables/${table}/data/delete`, ids);
    }
    for (const lot of chunk(rows, 500)) {
      await this.#post(`/tables/${table}/records`, {
        records: lot.map((fields) => ({ fields })),
      });
    }
  }

  // Ranger les pages des marts sous une page parente, pour que le document distingue à
  // l'œil ce que l'ETL produit de ce qui est construit à la main dans Grist. Grist crée une
  // page à la racine à chaque table nouvelle : sans ça, la barre latérale redevient plate.
  //
  // L'imbrication est portée par `_grist_Pages` : une page est fille de la précédente dont
  // l'indentation est plus faible. On réécrit donc tout le bloc, ce qui rend l'opération
  // idempotente et indépendante des marts publiés lors de cette exécution.
  async rangerSous(parent: string, tables: string[]): Promise<void> {
    const pages = await this.#pages();
    const bloc = [parent, ...tables]
      .map((nom) => pages.find((p) => p.name === nom)?.id)
      .filter((id): id is number => id !== undefined);
    if (bloc.length < 2) return; // page parente absente, ou aucun mart : rien à ranger
    const reste = pages.filter((p) => !bloc.includes(p.id));
    await this.#apply([
      [
        "BulkUpdateRecord",
        "_grist_Pages",
        bloc,
        {
          pagePos: bloc.map((_, i) => i + 1),
          indentation: bloc.map((_, i) => (i === 0 ? 0 : 1)),
        },
      ],
      ...reste.map((p, i) => [
        "UpdateRecord",
        "_grist_Pages",
        p.id,
        { pagePos: bloc.length + 1 + i, indentation: 0 },
      ]),
    ]);
  }

  /** Les pages du document, dans l'ordre d'affichage. */
  async #pages(): Promise<PageRecord[]> {
    const q =
      "select p.id, v.name from _grist_Pages p " +
      "join _grist_Views v on v.id = p.viewRef order by p.pagePos";
    const res = await this.#get<{ records: { fields: PageRecord }[] }>(
      `/sql?q=${encodeURIComponent(q)}`,
    );
    return res.records.map((r) => r.fields);
  }

  /** Actions utilisateur Grist (métadonnées comprises). */
  async #apply(actions: unknown[]): Promise<void> {
    await this.#post("/apply", actions);
  }

  async #get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.#base}${path}`, {
      headers: { Authorization: `Bearer ${this.#apiKey}` },
    });
    if (!res.ok)
      throw new Error(
        `Grist GET ${path} → HTTP ${res.status} ${await res.text()}`,
      );
    return res.json() as Promise<T>;
  }

  async #post(path: string, body: unknown): Promise<void> {
    const res = await fetch(`${this.#base}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.#apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok)
      throw new Error(
        `Grist POST ${path} → HTTP ${res.status} ${await res.text()}`,
      );
  }
}

/** Coerce une valeur CSV (toujours string) vers le type Grist attendu. Vide → null. */
export function coerce(value: string, type: GristType): string | number | null {
  if (type === "Text") return value;
  if (value.trim() === "") return null;
  return Number(value);
}

// ---- implémentation ----

type GristRecord = { id: number };

type PageRecord = { id: number; name: string };

function colDef(c: ColumnSpec) {
  return { id: c.id, fields: { label: c.id, type: c.type } };
}

function chunk<T>(items: T[], size: number): T[][] {
  const lots: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    lots.push(items.slice(i, i + size));
  return lots;
}
