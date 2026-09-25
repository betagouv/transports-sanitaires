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
import {
  remplirCerfa,
  type Saisie,
} from "../../front/outils-produit/beta/cerfa/remplir-cerfa.ts";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre.ts";

const ici = dirname(fileURLToPath(import.meta.url));
const gabarit = (chemin: string) =>
  readFileSync(join(ici, "../../front/outils-produit/beta/cerfa", chemin));

/** La prescription médicale de transport, n° 11574*07 (réf. S3138g). */
export const GABARIT = gabarit("pmt/gabarit/cerfa-11574-07.pdf");

/** La demande d'accord préalable, n° 11575*08 (réf. S3139h). */
export const GABARIT_DAP = gabarit("dap/gabarit/cerfa-11575-08.pdf");

/** La prescription pour permission de sortie, n° 16184*01 (réf. S3141). */
export const GABARIT_S3141 = gabarit("s3141/gabarit/cerfa-16184-01.pdf");

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

/** Un texte médical court, comme le réviserait le prescripteur. */
export const TEXTE_MEDICAL_REVISE = "Texte médical révisé par le prescripteur.";

/**
 * Remplit comme `remplirCerfa`, texte médical révisé : c'est ce que fait le
 * prescripteur quand le texte composé déborde de sa rubrique (contrat EM-2).
 * Pour les tests qui lisent d'autres champs, sur une seed au texte long.
 */
export function remplirApresRevision(
  gabarit: Uint8Array,
  saisies: readonly Saisie[],
): Promise<Uint8Array> {
  return remplirCerfa(
    gabarit,
    saisies.map((saisie) =>
      "texteMédical" in saisie
        ? { champ: saisie.champ, texteMédical: TEXTE_MEDICAL_REVISE }
        : saisie,
    ),
  );
}

export const situation = (entrées: Record<string, string>) => ({
  ...BASE_NEUTRE,
  ...entrées,
});

/** Les deux réponses de Q1 que ces cas citent, et un contexte ouvrant droit. */
export const AIDE_PROFESSIONNEL =
  "'Nécessite une prise en charge spécifique pendant le trajet, une aide d’un professionnel pour se déplacer ou, en l’absence d’un proche accompagnant, pour transmettre les informations nécessaires à l’équipe soignante.'";
export const PROCHE_ACCOMPAGNANT =
  "'Nécessite l’accompagnement d’un proche pour se déplacer ou transmettre les informations nécessaires à l’équipe soignante, sans intervention d’un professionnel pendant le transport.'";
export const HOSPITALISATION = {
  p2_raison_principale: "'Entrée en hospitalisation'",
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
