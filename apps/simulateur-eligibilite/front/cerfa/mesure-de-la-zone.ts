// Mesure un champ du PDF : un texte y tient-il, et à quelle taille ?
//
// La mesure emploie les fonctions de `pdf-lib` qui font le rendu. Mesure et
// rendu s'accordent donc toujours.

import {
  layoutMultilineText,
  layoutSinglelineText,
  type PDFFont,
  type PDFTextField,
  TextAlignment,
} from "pdf-lib";

/** La taille de départ d'un texte, en points. */
export const TAILLE_DU_GABARIT = 10;

/**
 * En dessous, un texte imprimé se lit mal. C'est le plancher courant des notes
 * de bas de page et des mentions légales.
 */
export const TAILLE_MINIMALE_LISIBLE = 6;

/**
 * Une mesure liée à `champ` : `texte` tient-il dans sa zone réelle, à `police`
 * et `taille` ? `taille` vaut `TAILLE_DU_GABARIT` par défaut.
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
 * La plus grande taille à laquelle `texte` tient dans la zone de `champ`, entre
 * celle du gabarit et le plancher de lisibilité. Le nombre maximal de
 * caractères du champ compte aussi. `undefined` si le texte déborde à toutes
 * les tailles.
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

// Le même calcul que `defaultTextFieldAppearanceProvider` de `pdf-lib`. La
// marge est la bordure du widget plus son remplissage, jamais 0 : sinon le
// texte toucherait le cadre.
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
