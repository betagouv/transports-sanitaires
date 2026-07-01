import { NotionAPI } from "notion-client";
import { getBlockValue } from "notion-utils";
import type { Collection, Decoration, ExtendedRecordMap, PageBlock } from "notion-types";
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

type RowProperties = Record<string, Decoration[]>;

function richTextToPlainText(richText: Decoration[] | undefined): string {
  if (!richText) return "";
  return richText.map((segment) => segment[0]).join("");
}

function findPropertyId(
  schema: Record<string, { name: string }>,
  name: string,
): string | undefined {
  return Object.keys(schema).find((propertyId) => schema[propertyId].name === name);
}

export function parseGlossaryEntries(recordMap: ExtendedRecordMap): GlossaryEntry[] {
  const collection = Object.values(recordMap.collection ?? {})
    .map((entry) => getBlockValue(entry) as Collection | undefined)
    .find((value) => value !== undefined);
  if (!collection) return [];

  const schema = collection.schema;
  const termePropId = findPropertyId(schema, "Terme") ?? "title";
  const definitionPropId = findPropertyId(schema, "Définition");
  const categoriePropId = findPropertyId(schema, "Catégorie");
  const statutPropId = findPropertyId(schema, "Statut");
  const sourcePropId = findPropertyId(schema, "Source");
  const structureParentePropId = findPropertyId(schema, "Structure parente");

  const entries: GlossaryEntry[] = [];
  for (const entry of Object.values(recordMap.block ?? {})) {
    const block = getBlockValue(entry);
    if (!block || block.parent_id !== collection.id || block.parent_table !== "collection") {
      continue;
    }
    const page = block as PageBlock;
    const properties = (page.properties ?? {}) as RowProperties;
    const terme = richTextToPlainText(properties[termePropId]).trim();
    if (!terme) continue;

    entries.push({
      id: page.id,
      terme,
      definition: richTextToPlainText(definitionPropId ? properties[definitionPropId] : undefined).trim(),
      categorie: categoriePropId ? richTextToPlainText(properties[categoriePropId]).trim() || undefined : undefined,
      statut: statutPropId ? richTextToPlainText(properties[statutPropId]).trim() || undefined : undefined,
      source: sourcePropId ? richTextToPlainText(properties[sourcePropId]).trim() || undefined : undefined,
      structureParente: structureParentePropId
        ? richTextToPlainText(properties[structureParentePropId]).trim() || undefined
        : undefined,
    });
  }

  return entries.sort((a, b) => a.terme.localeCompare(b.terme, "fr"));
}

export async function fetchGlossary(): Promise<GlossaryEntry[]> {
  // notion-client defaults its requests to `mode: "no-cors"`, which is meaningless in
  // Node but breaks the JSON Content-Type header in a real browser. Our extension's
  // host_permissions already grant cross-origin access, so force a normal CORS request.
  const api = new NotionAPI({ ofetchOptions: { mode: "cors" } });
  const recordMap = await api.getPage(PAGE_ID, { signFileUrls: false });
  return parseGlossaryEntries(recordMap);
}
