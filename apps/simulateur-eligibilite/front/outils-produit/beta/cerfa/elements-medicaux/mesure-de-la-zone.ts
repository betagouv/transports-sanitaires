// La mesure d'un champ, avec la police et la géométrie du gabarit réel : la
// zone médicale (contrat EM-2) et les adresses (TS973-14). Seul fichier du
// dossier à importer `pdf-lib`.
//
// `layoutMultilineText` et `layoutSinglelineText` sont celles que `pdf-lib`
// emploie pour composer l'apparence réelle d'un champ (`updateFieldAppearances`,
// dans `remplir-cerfa.ts`) : les réutiliser pour mesurer, plutôt que
// réimplémenter un retour à la ligne, garantit que la mesure et le rendu
// s'accordent.

import {
  layoutMultilineText,
  layoutSinglelineText,
  type PDFFont,
  type PDFTextField,
  TextAlignment,
} from "pdf-lib";

/** La taille que déclarent les deux gabarits, en points. */
export const TAILLE_DU_GABARIT = 10;

/**
 * En dessous, un texte imprimé n'est plus confortablement lisible : plancher
 * courant pour une mention secondaire (notes de bas de page, mentions
 * légales). Partagé par les adresses (TS973-14) et la zone médicale (EM-2).
 */
export const TAILLE_MINIMALE_LISIBLE = 6;

/**
 * Une mesure liée à `champ` : `texte` entre-t-il dans sa zone réelle, à
 * `police` et `taille` ? `taille` par défaut à `TAILLE_DU_GABARIT` (10) ;
 * `remplir-cerfa.ts` l'appelle aussi au plancher de lisibilité d'une adresse
 * (TS973-14).
 */
export function tientDansLaZone(
  champ: PDFTextField,
  police: PDFFont,
  taille: number = TAILLE_DU_GABARIT,
): (texte: string) => boolean {
  const bornes = bornesUtiles(champ);
  if (!bornes || bornes.width <= 0 || bornes.height <= 0) {
    return (texte) => texte === "";
  }
  return champ.isMultiline()
    ? (texte) => tientEnMultiligne(texte, police, taille, bornes)
    : (texte) =>
        layoutSinglelineText(texte, {
          alignment: TextAlignment.Left,
          fontSize: taille,
          font: police,
          bounds: bornes,
        }).line.width <= bornes.width;
}

/**
 * La plus grande taille, de celle du gabarit au plancher de lisibilité, à
 * laquelle `texte` tient dans la zone de `champ`, et dans son nombre maximal de
 * caractères s'il en déclare un. `undefined` s'il ne tient à aucune : le texte
 * déborde, et rien ne l'écrira plus petit.
 */
export function tailleQuiTient(
  champ: PDFTextField,
  police: PDFFont,
  texte: string,
): number | undefined {
  const maximum = champ.getMaxLength();
  if (maximum !== undefined && texte.length > maximum) return undefined;
  for (
    let taille = TAILLE_DU_GABARIT;
    taille >= TAILLE_MINIMALE_LISIBLE;
    taille--
  )
    if (tientDansLaZone(champ, police, taille)(texte)) return taille;
  return undefined;
}

// ---- implémentation ----

type Bornes = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

// Le même calcul que `defaultTextFieldAppearanceProvider` de `pdf-lib` : la
// marge est la bordure du widget plus le remplissage qu'il applique aux
// champs non combés, jamais 0, sans quoi le texte toucherait le cadre.
function bornesUtiles(champ: PDFTextField): Bornes | undefined {
  const cadre = champ.acroField.getWidgets()[0]?.getRectangle();
  if (!cadre) return undefined;
  const bordure =
    champ.acroField.getWidgets()[0]?.getBorderStyle()?.getWidth() ?? 0;
  const marge = bordure + 1;
  return {
    x: 0,
    y: 0,
    width: cadre.width - 2 * marge,
    height: cadre.height - 2 * marge,
  };
}

function tientEnMultiligne(
  texte: string,
  police: PDFFont,
  taille: number,
  bornes: Bornes,
): boolean {
  const disposition = layoutMultilineText(texte, {
    alignment: TextAlignment.Left,
    fontSize: taille,
    font: police,
    bounds: bornes,
  });
  const tientEnHauteur =
    disposition.lines.length * disposition.lineHeight <= bornes.height;
  return (
    tientEnHauteur &&
    disposition.lines.every((ligne) => ligne.width <= bornes.width)
  );
}
