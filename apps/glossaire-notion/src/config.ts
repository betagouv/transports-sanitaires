/**
 * Which Notion page the extension reads. To point it at another page, update
 * GLOSSARY_EDIT_URL only: the page ID is derived from the URL.
 */

export const GLOSSARY_EDIT_URL =
  "https://app.notion.com/p/01-04-Glossaire-d283fa01860782cbb0108109d64bdbbb";

/** Page ID of the "Glossaire" database, in the dashed UUID form the API expects. */
export const PAGE_ID = toDashedId(rawPageId());

// ---- implementation ----

function rawPageId(): string {
  const rawId = GLOSSARY_EDIT_URL.match(/[0-9a-f]{32}/i)?.[0];
  if (!rawId) {
    throw new Error(
      `Could not extract a Notion page ID from GLOSSARY_EDIT_URL: ${GLOSSARY_EDIT_URL}`,
    );
  }
  return rawId;
}

function toDashedId(rawId: string): string {
  return [
    rawId.slice(0, 8),
    rawId.slice(8, 12),
    rawId.slice(12, 16),
    rawId.slice(16, 20),
    rawId.slice(20, 32),
  ].join("-");
}
