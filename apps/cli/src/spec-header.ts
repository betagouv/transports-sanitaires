// Le tableau d'en-tête d'une spec : lire un champ, l'écrire, lister les specs
// bloquantes.

/** La valeur d'un champ de l'en-tête, ou rien s'il n'y figure pas. */
export function field(markdown: string, name: string): string | undefined {
  const line = headerLines(markdown).find((each) => isField(each, name));
  return line?.split("|")[2]?.trim().replaceAll("`", "");
}

/** Écrit un champ. S'il manque, il est ajouté au bas de l'en-tête. */
export function withField(
  markdown: string,
  name: string,
  value: string,
): string {
  const lines = markdown.split("\n");
  const { start, end } = headerRange(lines);
  const row = `| ${name.padEnd(LABEL_WIDTH)} | ${value} |`;
  const at = lines.findIndex(
    (each, index) => index >= start && index < end && isField(each, name),
  );
  if (at === -1) lines.splice(end, 0, row);
  else lines[at] = row;
  return lines.join("\n");
}

/** Les specs nommées dans « bloquée par », sans leurs crochets. */
export function blockers(markdown: string): string[] {
  const value = field(markdown, BLOCKED_BY) ?? "";
  return [...value.matchAll(/\[\[([^\]]+)\]\]/g)].map((match) => match[1]!);
}

/** Retire une spec de « bloquée par ». Un champ vidé redevient `—`. */
export function withoutBlocker(markdown: string, name: string): string {
  const left = blockers(markdown).filter((each) => each !== name);
  const value = left.map((each) => `[[${each}]]`).join(", ");
  return withField(markdown, BLOCKED_BY, value === "" ? NONE : value);
}

// ---- implémentation ----

const BLOCKED_BY = "bloquée par";

/** Ce que vaut un champ vide dans le gabarit. */
const NONE = "—";

const LABEL_WIDTH = 11;

/**
 * L'en-tête est le premier tableau du fichier : un tableau du corps de la spec
 * n'en fait pas partie. Sans tableau, l'en-tête est vide et commence sous le
 * titre.
 */
function headerRange(lines: string[]): { start: number; end: number } {
  const start = lines.findIndex(isTableLine);
  if (start === -1) return { start: 1, end: 1 };
  const length = lines.slice(start).findIndex((line) => !isTableLine(line));
  return { start, end: length === -1 ? lines.length : start + length };
}

function headerLines(markdown: string): string[] {
  const lines = markdown.split("\n");
  const { start, end } = headerRange(lines);
  return lines.slice(start, end);
}

function isTableLine(line: string): boolean {
  return line.trimStart().startsWith("|");
}

function isField(line: string, name: string): boolean {
  return line.split("|")[1]?.trim() === name;
}
