// The glossary as it lives in Notion: fetching the page, and turning its
// collection rows into flat entries.

import { NotionAPI } from "notion-client";
import type {
  Block,
  Collection,
  Decoration,
  ExtendedRecordMap,
  PageBlock,
} from "notion-types";
import { getBlockValue } from "notion-utils";
import { PAGE_ID } from "./config";

export { GLOSSARY_EDIT_URL } from "./config";

export interface GlossaryEntry {
  id: string;
  terme: string;
  definition: string;
  categorie?: string;
  statut?: string;
  source?: string;
  structureParente?: string;
}

export async function fetchGlossary(): Promise<GlossaryEntry[]> {
  // notion-client defaults its requests to `mode: "no-cors"`, which is meaningless in
  // Node but breaks the JSON Content-Type header in a real browser. Our extension's
  // host_permissions already grant cross-origin access, so force a normal CORS request.
  const api = new NotionAPI({ ofetchOptions: { mode: "cors" } });
  const recordMap = await api.getPage(PAGE_ID, { signFileUrls: false });
  return parseGlossaryEntries(recordMap);
}

export function parseGlossaryEntries(
  recordMap: ExtendedRecordMap,
): GlossaryEntry[] {
  const collection = findCollection(recordMap);
  if (!collection) return [];

  const propertyIds = resolvePropertyIds(collection.schema);
  return Object.values(recordMap.block ?? {})
    .map((entry) => getBlockValue(entry))
    .filter((block) => isRowOf(block, collection))
    .flatMap((block) => entryFromRow(block as PageBlock, propertyIds) ?? [])
    .sort((a, b) => a.terme.localeCompare(b.terme, "fr"));
}

// ---- implementation ----

type RowProperties = Record<string, Decoration[]>;

function richTextToPlainText(richText: Decoration[] | undefined): string {
  if (!richText) return "";
  return richText.map((segment) => segment[0]).join("");
}

function findPropertyId(
  schema: Record<string, { name: string }>,
  name: string,
): string | undefined {
  return Object.keys(schema).find(
    (propertyId) => schema[propertyId]?.name === name,
  );
}

type PropertyIds = {
  terme: string;
  definition?: string;
  categorie?: string;
  statut?: string;
  source?: string;
  structureParente?: string;
};

function findCollection(recordMap: ExtendedRecordMap): Collection | undefined {
  return Object.values(recordMap.collection ?? {})
    .map((entry) => getBlockValue(entry) as Collection | undefined)
    .find((value) => value !== undefined);
}

function resolvePropertyIds(
  schema: Record<string, { name: string }>,
): PropertyIds {
  return {
    terme: findPropertyId(schema, "Terme") ?? "title",
    definition: findPropertyId(schema, "Définition"),
    categorie: findPropertyId(schema, "Catégorie"),
    statut: findPropertyId(schema, "Statut"),
    source: findPropertyId(schema, "Source"),
    structureParente: findPropertyId(schema, "Structure parente"),
  };
}

function isRowOf(block: Block | undefined, collection: Collection): boolean {
  return (
    !!block &&
    block.parent_id === collection.id &&
    block.parent_table === "collection"
  );
}

/** A collection row, or `undefined` when it carries no term to show. */
function entryFromRow(
  page: PageBlock,
  propertyIds: PropertyIds,
): GlossaryEntry | undefined {
  const properties = (page.properties ?? {}) as RowProperties;
  const read = (propertyId: string | undefined): string | undefined =>
    propertyId
      ? richTextToPlainText(properties[propertyId]).trim() || undefined
      : undefined;

  const terme = richTextToPlainText(properties[propertyIds.terme]).trim();
  if (!terme) return undefined;

  return {
    id: page.id,
    terme,
    definition: read(propertyIds.definition) ?? "",
    categorie: read(propertyIds.categorie),
    statut: read(propertyIds.statut),
    source: read(propertyIds.source),
    structureParente: read(propertyIds.structureParente),
  };
}
