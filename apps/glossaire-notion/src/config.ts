/**
 * Configuration of the Notion "Glossaire" page.
 *
 * To point the extension at another page, update GLOSSARY_EDIT_URL only:
 * the 32-character page ID is extracted from the URL automatically.
 */
export const GLOSSARY_EDIT_URL =
  "https://app.notion.com/p/01-04-Glossaire-d283fa01860782cbb0108109d64bdbbb";

/** Formats a raw 32-char Notion id into the dashed UUID form the API expects. */
function toDashedId(rawId: string): string {
  return [
    rawId.slice(0, 8),
    rawId.slice(8, 12),
    rawId.slice(12, 16),
    rawId.slice(16, 20),
    rawId.slice(20, 32),
  ].join("-");
}

const rawPageId = GLOSSARY_EDIT_URL.match(/[0-9a-f]{32}/i)?.[0];
if (!rawPageId) {
  throw new Error(`Could not extract a Notion page ID from GLOSSARY_EDIT_URL: ${GLOSSARY_EDIT_URL}`);
}

/** Page ID of the "Glossaire" database, derived from GLOSSARY_EDIT_URL. */
export const PAGE_ID = toDashedId(rawPageId);
