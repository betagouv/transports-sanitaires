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
export async function formulaireDeTest(): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const page = document.addPage([400, 400]);
  const formulaire = document.getForm();

  const cadre = { x: 20, width: 200, height: 16 };
  formulaire.createTextField("nom").addToPage(page, { ...cadre, y: 360 });
  const nir = formulaire.createTextField("nir");
  nir.setMaxLength(13);
  nir.addToPage(page, { ...cadre, y: 330 });
  const motif = formulaire.createTextField("motif");
  motif.enableMultiline();
  motif.addToPage(page, { x: 20, y: 270, width: 120, height: 30 });
  formulaire.createCheckBox("ald").addToPage(page, { x: 20, y: 240 });

  return document.save();
}

/** Relit un PDF rempli et rend `{ nom du champ → valeur }`, champs vides exclus. */
export async function relire(pdf: Uint8Array): Promise<Record<string, string>> {
  const formulaire = (await PDFDocument.load(pdf)).getForm();
  const lu: Record<string, string> = {};
  for (const champ of formulaire.getFields()) {
    if (champ instanceof PDFTextField) {
      const texte = champ.getText();
      if (texte) lu[champ.getName()] = texte;
    } else if (champ instanceof PDFCheckBox) {
      const état = champ.acroField.dict.get(PDFName.of("V"));
      if (état) lu[champ.getName()] = état.toString();
    }
  }
  return lu;
}

/** Les états d'apparence qu'un champ sait rendre, `/Off` exclu, dans l'ordre. */
export async function étatsDe(pdf: Uint8Array, nom: string): Promise<string[]> {
  const champ = (await PDFDocument.load(pdf)).getForm().getField(nom);
  const états = champ.acroField.getWidgets().flatMap((widget) => {
    const apparences = widget.getAppearances()?.normal;
    return apparences instanceof PDFDict
      ? apparences
          .keys()
          .map((clé) => String(clé).slice(1))
          .filter((clé) => clé !== "Off")
      : [];
  });
  return [...new Set(états)];
}

/** La taille de police d'un champ texte, telle que son `/DA` la déclare. */
export async function tailleDe(pdf: Uint8Array, nom: string): Promise<number> {
  const champ = (await PDFDocument.load(pdf)).getForm().getTextField(nom);
  const taille = champ.acroField.getDefaultAppearance()?.match(/([\d.]+) Tf/);
  return Number(taille?.[1]);
}
