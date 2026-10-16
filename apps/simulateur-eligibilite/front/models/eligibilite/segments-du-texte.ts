// Les mots du catalogue qui portent une mise en forme : le gras (`**…**`) et
// le lien (`[texte](https://…)`). Ce fichier les lit sans HTML, en morceaux
// que React affiche un par un. Un lien n'est repris que s'il va en http ou
// https.

/** Un morceau de texte, et sa mise en forme. La clé est sa place dans le texte. */
export type Segment = {
  readonly cle: number;
  readonly texte: string;
  readonly gras: boolean;
  readonly lien?: string;
};

/** Le texte en morceaux : les liens, puis le gras du reste. */
export function segmentsDuTexte(texte: string): readonly Segment[] {
  const segments: Segment[] = [];
  let debut = 0;
  for (const lien of texte.matchAll(LIEN)) {
    segments.push(...enGras(texte.slice(debut, lien.index), debut));
    segments.push({
      cle: lien.index,
      texte: lien[1] ?? "",
      gras: false,
      lien: lien[2] ?? "",
    });
    debut = lien.index + lien[0].length;
  }
  return [...segments, ...enGras(texte.slice(debut), debut)];
}

// ---- implémentation ----

const LIEN = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;

// Le catalogue met en gras avec `**…**`. Chaque morceau garde sa position
// dans le texte, qui lui sert de clé.
function enGras(texte: string, depart = 0): readonly Segment[] {
  let debut = depart;
  return texte
    .split("**")
    .map((morceau, rang) => {
      const segment = { cle: debut, gras: rang % 2 === 1, texte: morceau };
      debut += morceau.length + 2;
      return segment;
    })
    .filter(({ texte: morceau }) => morceau !== "");
}
