// Lire ce que la documentation écrit en Markdown : un titre, un tableau, un
// en-tête YAML, une section.

/** Le premier titre de niveau 1, sans son `#`. */
export function title(markdown: string): string | undefined {
  const line = markdown.split("\n").find((each) => each.startsWith("# "));
  return line?.slice(2).trim();
}

/** Les lignes du premier tableau, sans son en-tête ni son séparateur. */
export function firstTable(markdown: string): string[][] {
  const lines = markdown.split("\n");
  const start = lines.findIndex(isTableLine);
  if (start === -1) return [];
  const table: string[] = [];
  for (const line of lines.slice(start)) {
    if (!isTableLine(line)) break;
    table.push(line);
  }
  return table.slice(2).map(cells);
}

/** Les paires `clé: valeur` de l'en-tête YAML, entre ses deux `---`. */
export function frontmatter(markdown: string): Record<string, string> {
  const lines = markdown.split("\n");
  if (lines[0]?.trim() !== "---") return {};
  const end = lines.indexOf("---", 1);
  const pairs: Record<string, string> = {};
  for (const line of lines.slice(1, end === -1 ? undefined : end)) {
    const colon = line.indexOf(":");
    if (colon > 0)
      pairs[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return pairs;
}

/** Le corps d'une section de niveau 2, jusqu'à la suivante. */
export function section(markdown: string, heading: string): string {
  const lines = markdown.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return rest
    .slice(0, end === -1 ? undefined : end)
    .join("\n")
    .trim();
}

// ---- implémentation ----

function isTableLine(line: string): boolean {
  return line.trimStart().startsWith("|");
}

/** Coupe une ligne de tableau sur ses `|`, sauf ceux qu'un `\` échappe. */
function cells(line: string): string[] {
  return line
    .trim()
    .split(/(?<!\\)\|/)
    .slice(1, -1)
    .map((cell) => cell.trim());
}
