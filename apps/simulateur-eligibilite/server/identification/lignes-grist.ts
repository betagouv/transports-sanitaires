// Lire et écrire des lignes dans un doc Grist, via son API REST.
//
// Ce module détient la clé d'API : il vit côté serveur uniquement, jamais dans
// le navigateur. Il ne connaît rien du modèle métier — les noms de tables et de
// colonnes lui sont passés par l'appelant (cf. `referentiel-grist.ts`).

export type DocGrist = {
  /** Base API du doc, ex. https://…/api/docs/<docId> */
  base: string;
  cleApi: string;
};

export type LigneGrist = { id: number; fields: Record<string, unknown> };

export type Filtre = Record<string, Array<string | number>>;

export function ouvrirDoc(docUrl: string, cleApi: string): DocGrist {
  return { base: docUrl.replace(/\/$/, ""), cleApi };
}

export async function lignes(
  doc: DocGrist,
  table: string,
  filtre?: Filtre,
): Promise<LigneGrist[]> {
  const url = new URL(`${doc.base}/tables/${table}/records`);
  if (filtre) url.searchParams.set("filter", JSON.stringify(filtre));
  const res = await fetch(url, { headers: entetes(doc) });
  if (!res.ok) {
    throw new Error(`Grist ${table} → HTTP ${res.status}`);
  }
  const body = (await res.json()) as { records?: LigneGrist[] };
  return body.records ?? [];
}

// Crée une ligne et renvoie son rowId interne Grist.
export async function creerLigne(
  doc: DocGrist,
  table: string,
  fields: Record<string, unknown>,
): Promise<number> {
  const res = await envoyer(doc, table, "POST", { records: [{ fields }] });
  const body = (await res.json()) as { records?: Array<{ id: number }> };
  const id = body.records?.[0]?.id;
  if (id == null) throw new Error(`Grist ${table} POST : aucun id renvoyé`);
  return id;
}

// Met à jour les champs d'une ligne existante (PATCH).
export async function majLigne(
  doc: DocGrist,
  table: string,
  rowId: number,
  fields: Record<string, unknown>,
): Promise<void> {
  await envoyer(doc, table, "PATCH", { records: [{ id: rowId, fields }] });
}

// Valeur de cellule ramenée à du texte : Grist renvoie aussi bien des nombres
// que des chaînes selon le type de colonne.
export function texte(valeur: unknown): string {
  return typeof valeur === "string"
    ? valeur.trim()
    : valeur == null
      ? ""
      : String(valeur);
}

// ---- implémentation ----

async function envoyer(
  doc: DocGrist,
  table: string,
  methode: "POST" | "PATCH",
  corps: unknown,
): Promise<Response> {
  const res = await fetch(`${doc.base}/tables/${table}/records`, {
    method: methode,
    headers: { ...entetes(doc), "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  if (!res.ok) {
    throw new Error(`Grist ${table} ${methode} → HTTP ${res.status}`);
  }
  return res;
}

function entetes(doc: DocGrist): Record<string, string> {
  return { Authorization: `Bearer ${doc.cleApi}` };
}
