// Remplit un formulaire PDF (AcroForm) à partir d'entrées.
//
// Ce fichier ne fait que l'écriture. Ce qu'il faut écrire se décide dans un
// tableau de remplissage (`field-mapping.ts`).
//
// Il n'importe rien de `node:*` : le PDF se génère dans le navigateur, et les
// données du patient ne quittent pas le poste.

import {
  PDFCheckBox,
  PDFDict,
  PDFDocument,
  type PDFFont,
  PDFName,
  PDFTextField,
  StandardFonts,
} from "pdf-lib";
import {
  fitsInField,
  fittingFontSize,
  MIN_READABLE_FONT_SIZE,
  TEMPLATE_FONT_SIZE,
} from "./text-fit";
import { TextOverflowError } from "./text-overflow";

/**
 * Une valeur à écrire : un texte dans un champ nommé, une case à cocher, ou un
 * texte mesuré avant d'être écrit en entier (`writeMeasuredText`).
 *
 * `checked` porte l'état d'export à écrire, souvent `On` ou `Yes`. Un gabarit
 * peut aussi mettre plusieurs cases sous un même nom : des boutons radio
 * déguisés, dont chaque widget rend un seul état. La casse compte : un gabarit
 * écrit `/OUI`, un autre `/Oui`. Les états se relèvent en inspectant le
 * gabarit, ils ne se devinent pas.
 */
export type FieldEntry = { readonly field: string } & (
  | { readonly text: string }
  | { readonly checked: string }
  | { readonly measuredText: string }
);

export type FillOptions = {
  /**
   * Passe les champs remplis en lecture seule. Le prescripteur ne peut alors
   * plus corriger ce que le simulateur a déduit. Par défaut, le formulaire reste
   * éditable.
   */
  readonly readOnly?: boolean;
  /**
   * Champs déclarés multilignes dans le PDF, mais dont le cadre ne montre qu'une
   * ligne. Un `\n` y ferait disparaître la suite à l'impression : leurs valeurs
   * sont aplaties sur une ligne.
   */
  readonly singleLineFields?: readonly string[];
};

/**
 * Écrit `entries` dans le formulaire `template` et rend le PDF résultant.
 *
 * Un champ qui porte un widget sur plusieurs volets s'écrit une seule fois, et
 * les volets restent cohérents par construction.
 *
 * @throws {TextOverflowError} si un texte mesuré ne tient pas dans son champ :
 * aucun PDF n'est produit, plutôt qu'un texte coupé.
 */
export async function fillCerfa(
  template: Uint8Array | ArrayBuffer,
  entries: readonly FieldEntry[],
  options: FillOptions = {},
): Promise<Uint8Array> {
  const document = await PDFDocument.load(template);
  const form = document.getForm();
  // `form.updateFieldAppearances()` (plus bas) redessine tout champ écrit dans
  // sa police par défaut, pas dans celle du gabarit. Le débordement se mesure
  // donc avec cette police-là. Voir `shrinkOnOverflow`.
  const font = await document.embedFont(StandardFonts.Helvetica);

  for (const entry of entries) {
    if ("checked" in entry) check(form, entry.field, entry.checked);
    else if ("measuredText" in entry)
      writeMeasuredText(form, font, entry.field, entry.measuredText);
    else writeText(form, font, entry, options.singleLineFields ?? []);
  }

  // Sans cet appel, les valeurs sont dans le PDF mais ne s'affichent pas dans les
  // lecteurs qui ne régénèrent pas les apparences.
  form.updateFieldAppearances();

  if (options.readOnly)
    for (const { field } of entries) form.getField(field).enableReadOnly();

  return document.save();
}

// ---- implémentation ----

type Form = ReturnType<PDFDocument["getForm"]>;

function writeText(
  form: Form,
  font: PDFFont,
  { field: name, text }: { field: string; text: string },
  singleLineFields: readonly string[],
): void {
  const field = form.getField(name);
  if (!(field instanceof PDFTextField)) {
    throw new Error(`Le champ « ${name} » n'est pas un champ texte.`);
  }
  const value = singleLineFields.includes(name) ? flatten(text) : text;

  const maxLength = field.getMaxLength();
  if (maxLength !== undefined && value.length > maxLength) {
    // Tronquer sans le dire donnerait une valeur fausse sur un document
    // opposable. On refuse plutôt.
    throw new Error(
      `« ${name} » accepte ${maxLength} caractères, ${value.length} fournis : « ${value} ».`,
    );
  }
  field.setText(value);
  shrinkOnOverflow(field, font, value);
}

/**
 * Un gabarit déclare sa police (`/Cour 10 Tf`, par exemple). Mais `pdf-lib`
 * redessine tout champ écrit dans sa police par défaut, ici Helvetica,
 * embarquée dans `fillCerfa`. Une valeur composée, comme une adresse sur une
 * seule ligne, peut dépasser le cadre réel à 10 points (`fitsInField`).
 *
 * On descend alors directement à `MIN_READABLE_FONT_SIZE`, sans garantir que
 * tout y tienne. Un texte qui doit tenir passe par `measuredText`.
 */
function shrinkOnOverflow(
  field: PDFTextField,
  font: PDFFont,
  value: string,
): void {
  if (fitsInField(field, font, TEMPLATE_FONT_SIZE)(value)) return;
  field.setFontSize(MIN_READABLE_FONT_SIZE);
}

/**
 * Coche en imposant l'état d'export attendu.
 *
 * `PDFCheckBox.check()` de pdf-lib retient le premier état « on » qu'il trouve.
 * Pour les radios déguisés (voir `FieldEntry`), il coche la mauvaise case une
 * fois sur deux. On écrit donc la valeur du champ, puis pour chaque widget
 * l'état qu'il sait rendre, ou `/Off`.
 */
function check(form: Form, name: string, checked: string): void {
  const field = form.getField(name);
  if (!(field instanceof PDFCheckBox)) {
    throw new Error(`Le champ « ${name} » n'est pas une case à cocher.`);
  }
  const state = PDFName.of(checked);
  const widgets = field.acroField.getWidgets();
  const capable = widgets.filter((widget) => {
    const appearances = widget.getAppearances()?.normal;
    return appearances instanceof PDFDict && appearances.has(state);
  });
  if (capable.length === 0) {
    // Aucun widget ne sait rendre cet état. La case resterait vide sans rien
    // signaler, sur un document opposable. `/Oui` et `/OUI` sont deux états.
    throw new Error(
      `« ${name} » ne connaît pas l'état « /${checked} » : la case resterait vide.`,
    );
  }

  field.acroField.dict.set(PDFName.of("V"), state);
  for (const widget of widgets) {
    const rendersIt = capable.includes(widget);
    widget.dict.set(PDFName.of("AS"), rendersIt ? state : PDFName.of("Off"));
  }
}

/** Les champs `singleLineFields` n'affichent qu'une ligne, on aplatit. */
function flatten(text: string): string {
  return text
    .replace(/\s*\n+\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Écrit un texte en entier, s'il tient dans son champ.
 *
 * La police descend jusqu'au plancher de lisibilité s'il le faut. Au-delà, rien
 * n'est écrit plus petit ni coupé : le texte déborde, et le prescripteur le
 * révise.
 */
function writeMeasuredText(
  form: Form,
  font: PDFFont,
  name: string,
  text: string,
): void {
  const field = form.getField(name);
  if (!(field instanceof PDFTextField)) {
    throw new Error(`Le champ « ${name} » n'est pas un champ texte.`);
  }
  const fontSize =
    text === "" ? TEMPLATE_FONT_SIZE : fittingFontSize(field, font, text);
  if (fontSize === undefined) throw new TextOverflowError(name, text);
  field.setText(text);
  field.setFontSize(fontSize);
}
