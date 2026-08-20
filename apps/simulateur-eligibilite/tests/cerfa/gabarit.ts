// Ce que les deux fichiers de test du CERFA partagent : le gabarit lui-même, la
// relecture d'un PDF rempli, et les réponses qu'ils répètent pour amener une
// situation jusqu'à une prescription médicale de transport.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFCheckBox, PDFDocument, PDFName, PDFTextField } from "pdf-lib";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre.ts";

export const GABARIT = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../front/outils-produit/beta/cerfa/gabarit/cerfa-11574-07.pdf",
  ),
);

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

export const situation = (entrées: Record<string, string>) => ({
  ...BASE_NEUTRE,
  ...entrées,
});

/** Les deux réponses de Q1 que ces cas citent, et un contexte ouvrant droit. */
export const AIDE_PROFESSIONNEL =
  "'Nécessite une prise en charge spécifique pendant le trajet ou l’aide d’un professionnel pour se déplacer ou accomplir les formalités liées au transport.'";
export const PROCHE_ACCOMPAGNANT =
  "'Peut se déplacer avec un proche accompagnant, qui peut l’aider à se déplacer ou à transmettre les informations nécessaires à l’équipe soignante, sans intervention d’un professionnel pendant le transport.'";
export const HOSPITALISATION = {
  p2_contexte_hospitalisation: "oui",
  p2_contexte_aucun: "non",
};
