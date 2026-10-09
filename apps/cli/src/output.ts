// Ce que tsp affiche : du texte pour une personne, du JSON pour un agent.

export function print(text: string): void {
  process.stdout.write(`${text}\n`);
}

export function printError(text: string): void {
  process.stderr.write(`${text}\n`);
}

/** Affiche `value` en JSON si l'appelant l'a demandé, sinon son rendu texte. */
export function emit<T>(
  json: boolean,
  value: T,
  render: (value: T) => string,
): void {
  print(json ? JSON.stringify(value, null, 2) : render(value));
}

/** Aligne des lignes en colonnes. La dernière colonne n'est pas complétée. */
export function columns(rows: string[][]): string {
  const widths = columnWidths(rows);
  return rows
    .map((row) =>
      row
        .map((cell, index) => cell.padEnd(widths[index]!))
        .join("  ")
        .trimEnd(),
    )
    .join("\n");
}

/** Un titre suivi de son contenu indenté, ou de « rien » s'il est vide. */
export function section(title: string, body: string): string {
  const content = body === "" ? "rien" : body;
  return `${title}\n${indent(content)}`;
}

// ---- implémentation ----

function indent(text: string): string {
  return text
    .split("\n")
    .map((line) => (line === "" ? line : `  ${line}`))
    .join("\n");
}

function columnWidths(rows: string[][]): number[] {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, index) => {
      widths[index] = Math.max(widths[index] ?? 0, cell.length);
    });
  }
  return widths;
}
