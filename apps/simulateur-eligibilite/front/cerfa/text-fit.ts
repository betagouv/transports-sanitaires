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
export const TEMPLATE_FONT_SIZE = 10;

/**
 * En dessous, un texte imprimé se lit mal. C'est le plancher courant des notes
 * de bas de page et des mentions légales.
 */
export const MIN_READABLE_FONT_SIZE = 6;

/**
 * Une mesure liée à `field` : `text` tient-il dans sa zone réelle, à `font` et
 * `fontSize` ? `fontSize` vaut `TEMPLATE_FONT_SIZE` par défaut.
 */
export function fitsInField(
  field: PDFTextField,
  font: PDFFont,
  fontSize: number = TEMPLATE_FONT_SIZE,
): (text: string) => boolean {
  const bounds = innerBounds(field);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    return (text) => text === "";
  }
  return field.isMultiline()
    ? (text) => fitsMultiline(text, font, fontSize, bounds)
    : (text) =>
        layoutSinglelineText(text, {
          alignment: TextAlignment.Left,
          fontSize,
          font,
          bounds,
        }).line.width <= bounds.width;
}

/**
 * La plus grande taille à laquelle `text` tient dans la zone de `field`, entre
 * celle du gabarit et le plancher de lisibilité. Le nombre maximal de
 * caractères du champ compte aussi. `undefined` si le texte déborde à toutes
 * les tailles.
 */
export function fittingFontSize(
  field: PDFTextField,
  font: PDFFont,
  text: string,
): number | undefined {
  const maximum = field.getMaxLength();
  if (maximum !== undefined && text.length > maximum) return undefined;
  for (
    let fontSize = TEMPLATE_FONT_SIZE;
    fontSize >= MIN_READABLE_FONT_SIZE;
    fontSize--
  )
    if (fitsInField(field, font, fontSize)(text)) return fontSize;
  return undefined;
}

// ---- implémentation ----

type Bounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

// Le même calcul que `defaultTextFieldAppearanceProvider` de `pdf-lib`. La
// marge est la bordure du widget plus son remplissage, jamais 0 : sinon le
// texte toucherait le cadre.
function innerBounds(field: PDFTextField): Bounds | undefined {
  const rectangle = field.acroField.getWidgets()[0]?.getRectangle();
  if (!rectangle) return undefined;
  const border =
    field.acroField.getWidgets()[0]?.getBorderStyle()?.getWidth() ?? 0;
  const padding = border + 1;
  return {
    x: 0,
    y: 0,
    width: rectangle.width - 2 * padding,
    height: rectangle.height - 2 * padding,
  };
}

function fitsMultiline(
  text: string,
  font: PDFFont,
  fontSize: number,
  bounds: Bounds,
): boolean {
  const layout = layoutMultilineText(text, {
    alignment: TextAlignment.Left,
    fontSize,
    font,
    bounds,
  });
  const fitsHeight = layout.lines.length * layout.lineHeight <= bounds.height;
  return fitsHeight && layout.lines.every((line) => line.width <= bounds.width);
}
