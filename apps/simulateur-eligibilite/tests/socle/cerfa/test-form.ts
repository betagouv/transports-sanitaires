// Un formulaire PDF fabriqué pour les tests, et de quoi relire un PDF rempli.
// Pas de gabarit réel : on connaît la taille et les états de chaque champ.

import {
  PDFCheckBox,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFTextField,
} from "pdf-lib";

/**
 * Un formulaire à quatre champs : `nom` sur une ligne, `nir` limité à treize
 * caractères, `motif` multiligne et étroit, et la case `ald`.
 */
export async function testForm(): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const page = document.addPage([400, 400]);
  const form = document.getForm();

  const box = { x: 20, width: 200, height: 16 };
  form.createTextField("nom").addToPage(page, { ...box, y: 360 });
  const nir = form.createTextField("nir");
  nir.setMaxLength(13);
  nir.addToPage(page, { ...box, y: 330 });
  const motif = form.createTextField("motif");
  motif.enableMultiline();
  motif.addToPage(page, { x: 20, y: 270, width: 120, height: 30 });
  form.createCheckBox("ald").addToPage(page, { x: 20, y: 240 });

  return document.save();
}

/** Relit un PDF rempli et rend `{ nom du champ → valeur }`, champs vides exclus. */
export async function readBack(
  pdf: Uint8Array,
): Promise<Record<string, string>> {
  const form = (await PDFDocument.load(pdf)).getForm();
  const read: Record<string, string> = {};
  for (const field of form.getFields()) {
    if (field instanceof PDFTextField) {
      const text = field.getText();
      if (text) read[field.getName()] = text;
    } else if (field instanceof PDFCheckBox) {
      const state = field.acroField.dict.get(PDFName.of("V"));
      if (state) read[field.getName()] = state.toString();
    }
  }
  return read;
}

/** Les états d'apparence qu'un champ sait rendre, `/Off` exclu, dans l'ordre. */
export async function statesOf(
  pdf: Uint8Array,
  name: string,
): Promise<string[]> {
  const field = (await PDFDocument.load(pdf)).getForm().getField(name);
  const states = field.acroField.getWidgets().flatMap((widget) => {
    const appearances = widget.getAppearances()?.normal;
    return appearances instanceof PDFDict
      ? appearances
          .keys()
          .map((key) => String(key).slice(1))
          .filter((key) => key !== "Off")
      : [];
  });
  return [...new Set(states)];
}

/** La taille de police d'un champ texte, telle que son `/DA` la déclare. */
export async function fontSizeOf(
  pdf: Uint8Array,
  name: string,
): Promise<number> {
  const field = (await PDFDocument.load(pdf)).getForm().getTextField(name);
  const fontSize = field.acroField.getDefaultAppearance()?.match(/([\d.]+) Tf/);
  return Number(fontSize?.[1]);
}
