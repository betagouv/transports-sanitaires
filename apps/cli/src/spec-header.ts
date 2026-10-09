// Le tableau d'en-tête d'une spec : lire un champ, l'écrire, lister les specs
// bloquantes.

/** La valeur d'un champ de l'en-tête, ou rien s'il n'y figure pas. */
export function field(markdown: string, name: string): string | undefined {
  const line = markdown.split("\n").find((each) => isField(each, name));
  return line?.split("|")[2]?.trim().replaceAll("`", "");
}

/** Écrit un champ. S'il manque, il est ajouté au bas de l'en-tête. */
export function withField(
  markdown: string,
  name: string,
  value: string,
): string {
  const lines = markdown.split("\n");
  const row = `| ${name.padEnd(LABEL_WIDTH)} | ${value} |`;
  const at = lines.findIndex((each) => isField(each, name));
  if (at !== -1) {
    lines[at] = row;
    return lines.join("\n");
  }
  const last = lines.findLastIndex((each) => isField(each, LAST_FIELD));
  lines.splice(last + 1, 0, row);
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

/** Le dernier champ du gabarit : un champ ajouté se pose après lui. */
const LAST_FIELD = BLOCKED_BY;

/** Ce que vaut un champ vide dans le gabarit. */
const NONE = "—";

const LABEL_WIDTH = 11;

function isField(line: string, name: string): boolean {
  return line.split("|")[1]?.trim() === name;
}
