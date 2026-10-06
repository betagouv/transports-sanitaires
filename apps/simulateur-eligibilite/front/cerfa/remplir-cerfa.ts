// Remplit un formulaire PDF (AcroForm) à partir de saisies.
//
// Ce fichier ne fait que l'écriture. Ce qu'il faut écrire se décide dans un
// tableau de remplissage (`remplissage.ts`).
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
import { DebordementDuTexte } from "./debordement-du-texte";
import {
  TAILLE_DU_GABARIT,
  TAILLE_MINIMALE_LISIBLE,
  tailleQuiTient,
  tientDansLaZone,
} from "./mesure-de-la-zone";

/**
 * Une valeur à écrire : un texte dans un champ nommé, une case à cocher, ou un
 * texte mesuré avant d'être écrit en entier (`écrireTexteMesuré`).
 *
 * `coché` porte l'état d'export à écrire, souvent `On` ou `Yes`. Un gabarit
 * peut aussi mettre plusieurs cases sous un même nom : des boutons radio
 * déguisés, dont chaque widget rend un seul état. La casse compte : un gabarit
 * écrit `/OUI`, un autre `/Oui`. Les états se relèvent en inspectant le
 * gabarit, ils ne se devinent pas.
 */
export type Saisie = { readonly champ: string } & (
  | { readonly texte: string }
  | { readonly coché: string }
  | { readonly texteMesuré: string }
);

export type OptionsRemplissage = {
  /**
   * Passe les champs remplis en lecture seule. Le prescripteur ne peut alors
   * plus corriger ce que le simulateur a déduit. Par défaut, le formulaire reste
   * éditable.
   */
  readonly verrouiller?: boolean;
  /**
   * Champs déclarés multilignes dans le PDF, mais dont le cadre ne montre qu'une
   * ligne. Un `\n` y ferait disparaître la suite à l'impression : leurs valeurs
   * sont aplaties sur une ligne.
   */
  readonly surUneLigne?: readonly string[];
};

/**
 * Écrit `saisies` dans le formulaire `gabarit` et rend le PDF résultant.
 *
 * Un champ qui porte un widget sur plusieurs volets s'écrit une seule fois, et
 * les volets restent cohérents par construction.
 *
 * @throws {DebordementDuTexte} si un texte mesuré ne tient pas dans son champ :
 * aucun PDF n'est produit, plutôt qu'un texte coupé.
 */
export async function remplirCerfa(
  gabarit: Uint8Array | ArrayBuffer,
  saisies: readonly Saisie[],
  options: OptionsRemplissage = {},
): Promise<Uint8Array> {
  const document = await PDFDocument.load(gabarit);
  const formulaire = document.getForm();
  // `formulaire.updateFieldAppearances()` (plus bas) redessine tout champ écrit
  // dans sa police par défaut, pas dans celle du gabarit. Le débordement se
  // mesure donc avec cette police-là. Voir `réduireSiÇaDéborde`.
  const police = await document.embedFont(StandardFonts.Helvetica);

  for (const saisie of saisies) {
    if ("coché" in saisie) cocher(formulaire, saisie.champ, saisie.coché);
    else if ("texteMesuré" in saisie)
      écrireTexteMesuré(formulaire, police, saisie.champ, saisie.texteMesuré);
    else écrire(formulaire, police, saisie, options.surUneLigne ?? []);
  }

  // Sans cet appel, les valeurs sont dans le PDF mais ne s'affichent pas dans les
  // lecteurs qui ne régénèrent pas les apparences.
  formulaire.updateFieldAppearances();

  if (options.verrouiller)
    for (const { champ } of saisies)
      formulaire.getField(champ).enableReadOnly();

  return document.save();
}

// ---- implémentation ----

type Formulaire = ReturnType<PDFDocument["getForm"]>;

function écrire(
  formulaire: Formulaire,
  police: PDFFont,
  { champ: nom, texte }: { champ: string; texte: string },
  surUneLigne: readonly string[],
): void {
  const champ = formulaire.getField(nom);
  if (!(champ instanceof PDFTextField)) {
    throw new Error(`Le champ « ${nom} » n'est pas un champ texte.`);
  }
  const valeur = surUneLigne.includes(nom) ? aplatir(texte) : texte;

  const maximum = champ.getMaxLength();
  if (maximum !== undefined && valeur.length > maximum) {
    // Tronquer sans le dire donnerait une valeur fausse sur un document
    // opposable. On refuse plutôt.
    throw new Error(
      `« ${nom} » accepte ${maximum} caractères, ${valeur.length} fournis : « ${valeur} ».`,
    );
  }
  champ.setText(valeur);
  réduireSiÇaDéborde(champ, police, valeur);
}

/**
 * Un gabarit déclare sa police (`/Cour 10 Tf`, par exemple). Mais `pdf-lib`
 * redessine tout champ écrit dans sa police par défaut, ici Helvetica,
 * embarquée dans `remplirCerfa`. Une valeur composée, comme une adresse sur une
 * seule ligne, peut dépasser le cadre réel à 10 points (`tientDansLaZone`).
 *
 * On descend alors directement à `TAILLE_MINIMALE_LISIBLE`, sans garantir que
 * tout y tienne. Un texte qui doit tenir passe par `texteMesuré`.
 */
function réduireSiÇaDéborde(
  champ: PDFTextField,
  police: PDFFont,
  valeur: string,
): void {
  if (tientDansLaZone(champ, police, TAILLE_DU_GABARIT)(valeur)) return;
  champ.setFontSize(TAILLE_MINIMALE_LISIBLE);
}

/**
 * Coche en imposant l'état d'export attendu.
 *
 * `PDFCheckBox.check()` de pdf-lib retient le premier état « on » qu'il trouve.
 * Pour les radios déguisés (voir `Saisie`), il coche la mauvaise case une fois
 * sur deux. On écrit donc la valeur du champ, puis pour chaque widget l'état
 * qu'il sait rendre, ou `/Off`.
 */
function cocher(formulaire: Formulaire, nom: string, coché: string): void {
  const champ = formulaire.getField(nom);
  if (!(champ instanceof PDFCheckBox)) {
    throw new Error(`Le champ « ${nom} » n'est pas une case à cocher.`);
  }
  const état = PDFName.of(coché);
  const widgets = champ.acroField.getWidgets();
  const connaissent = widgets.filter((widget) => {
    const apparences = widget.getAppearances()?.normal;
    return apparences instanceof PDFDict && apparences.has(état);
  });
  if (connaissent.length === 0) {
    // Aucun widget ne sait rendre cet état. La case resterait vide sans rien
    // signaler, sur un document opposable. `/Oui` et `/OUI` sont deux états.
    throw new Error(
      `« ${nom} » ne connaît pas l'état « /${coché} » : la case resterait vide.`,
    );
  }

  champ.acroField.dict.set(PDFName.of("V"), état);
  for (const widget of widgets) {
    const sait = connaissent.includes(widget);
    widget.dict.set(PDFName.of("AS"), sait ? état : PDFName.of("Off"));
  }
}

/** Les champs `surUneLigne` n'affichent qu'une ligne, on aplatit. */
function aplatir(texte: string): string {
  return texte
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
function écrireTexteMesuré(
  formulaire: Formulaire,
  police: PDFFont,
  nom: string,
  texte: string,
): void {
  const champ = formulaire.getField(nom);
  if (!(champ instanceof PDFTextField)) {
    throw new Error(`Le champ « ${nom} » n'est pas un champ texte.`);
  }
  const taille =
    texte === "" ? TAILLE_DU_GABARIT : tailleQuiTient(champ, police, texte);
  if (taille === undefined) throw new DebordementDuTexte(nom, texte);
  champ.setText(texte);
  champ.setFontSize(taille);
}
