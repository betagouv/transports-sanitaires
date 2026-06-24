import type { GlossaryEntry } from "./notion";

const COMBINING_DIACRITICAL_MARKS_START = 0x0300;
const COMBINING_DIACRITICAL_MARKS_END = 0x036f;

export function normalize(text: string): string {
  return Array.from(text.normalize("NFD"))
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code < COMBINING_DIACRITICAL_MARKS_START || code > COMBINING_DIACRITICAL_MARKS_END;
    })
    .join("")
    .toLowerCase();
}

export function searchGlossary(entries: GlossaryEntry[], query: string): GlossaryEntry[] {
  const normalizedQuery = normalize(query.trim());
  if (!normalizedQuery) return entries;
  return entries.filter(
    (entry) =>
      normalize(entry.terme).includes(normalizedQuery) ||
      normalize(entry.definition).includes(normalizedQuery),
  );
}
