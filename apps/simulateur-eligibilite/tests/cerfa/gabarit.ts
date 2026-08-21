// Ce que les fichiers de test du CERFA partagent : les deux gabarits, la relecture
// d'un PDF rempli, et les réponses qu'ils répètent pour amener une situation
// jusqu'à un document.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PDFCheckBox,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFTextField,
} from "pdf-lib";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre.ts";

const ici = dirname(fileURLToPath(import.meta.url));
const gabarit = (chemin: string) =>
  readFileSync(join(ici, "../../front/outils-produit/beta/cerfa", chemin));

/** La prescription médicale de transport, n° 11574*07 (réf. S3138g). */
export const GABARIT = gabarit("pmt/gabarit/cerfa-11574-07.pdf");

/** La demande d'accord préalable, n° 11575*08 (réf. S3139h). */
export const GABARIT_DAP = gabarit("dap/gabarit/cerfa-11575-08.pdf");

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

/** Les états d'apparence qu'un champ sait rendre, `/Off` exclu, dans l'ordre. */
export async function étatsDe(
  gabarit: Uint8Array,
  nom: string,
): Promise<string[]> {
  const champ = (await PDFDocument.load(gabarit)).getForm().getField(nom);
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
