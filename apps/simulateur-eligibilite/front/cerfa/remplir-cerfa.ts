// Remplissage d'un formulaire PDF (AcroForm) à partir d'un jeu de saisies.
//
// Ce fichier ne fait que l'écriture. Ce qu'il faut écrire se décide dans un
// tableau de remplissage (`remplissage.ts`) ; ici on ne connaît que le PDF et
// ses pièges.
//
// `pdf-lib` fonctionne à l'identique dans Node et dans le navigateur. Ce module
// n'importe rien de `node:*` et reste donc exécutable côté front, ce qui permet de
// générer un document sans que les données patient quittent le poste.

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
 * `coché` porte l'état d'export à écrire. `On` ou `Yes` sont les cas courants,
 * une case pour un champ. Un gabarit peut aussi porter plusieurs cases visibles
 * sous un même nom, c'est-à-dire des boutons radio déguisés en case à cocher,
 * dont chaque widget sait rendre un état et un seul. La casse compte, et deux
 * gabarits ne s'accordent pas forcément : l'un écrit `/OUI`, l'autre `/Oui`.
 * Rien ne se devine : les états se relèvent par introspection du gabarit.
 */
export type Saisie = { readonly champ: string } & (
  | { readonly texte: string }
  | { readonly coché: string }
  | { readonly texteMesuré: string }
);

export type OptionsRemplissage = {
  /**
   * Verrouille les champs remplis en lecture seule après coup. Le prescripteur ne
   * peut alors plus corriger ce que le simulateur a déduit, donc à n'activer que si
   * le produit assume cette contrainte. Par défaut le formulaire reste éditable.
   */
  readonly verrouiller?: boolean;
  /**
   * Champs déclarés multilignes dans le PDF, mais dont le cadre visible ne montre
   * qu'une ligne. Y écrire un `\n` rogne silencieusement le reste à l'impression :
   * les valeurs qui leur sont destinées sont aplaties sur une seule ligne.
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
  // `formulaire.updateFieldAppearances()` (plus bas) recompose l'apparence de
  // tout champ écrit dans SA police par défaut, jamais dans celle déclarée par
  // le gabarit : la mesure de débordement doit donc porter sur cette police-là,
  // pas sur celle du `/DA` d'origine — cf. `réduireSiÇaDéborde`.
  const police = await document.embedFont(StandardFonts.Helvetica);

  for (const saisie of saisies) {
    if ("coché" in saisie) cocher(formulaire, saisie.champ, saisie.coché);
    else if ("texteMesuré" in saisie)
      écrireTexteMesuré(formulaire, police, saisie.champ, saisie.texteMesuré);
    else écrire(formulaire, police, saisie, options.surUneLigne ?? []);
  }

  // Sans cet appel, les valeurs sont bien dans le PDF, mais rien ne s'affiche tant
  // qu'un lecteur ne régénère pas les apparences, ce que tous ne font pas.
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
    // Tronquer silencieusement produirait une valeur fausse sur un document
    // opposable. On refuse plutôt que de livrer une prescription erronée.
    throw new Error(
      `« ${nom} » accepte ${maximum} caractères, ${valeur.length} fournis : « ${valeur} ».`,
    );
  }
  champ.setText(valeur);
  réduireSiÇaDéborde(champ, police, valeur);
}

/**
 * Un gabarit déclare sa police (`/Cour 10 Tf`, par exemple), mais `pdf-lib` recompose
 * l'apparence de tout champ écrit dans sa police par défaut au moment de
 * `formulaire.updateFieldAppearances()`, jamais dans celle du `/DA` d'origine —
 * ici Helvetica, embarquée dans `remplirCerfa`. Une valeur composée, comme une
 * adresse assemblée sur l'unique ligne que le formulaire lui donne, peut
 * dépasser le cadre réel à 10 points, mesuré avec cette police réelle
 * (`tientDansLaZone`).
 *
 * On descend directement à `TAILLE_MINIMALE_LISIBLE` plutôt que de chercher une
 * taille intermédiaire, et sans garantir que tout y tienne. Un texte qui doit
 * tenir passe par `texteMesuré`.
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
 * `PDFCheckBox.check()` de pdf-lib retient le premier état « on » qu'il trouve dans
 * les apparences du champ. Pour les radios déguisés, décrits sur `Saisie`, cela
 * coche la mauvaise moitié une fois sur deux. On écrit donc la valeur du champ, et
 * pour chaque widget l'état d'apparence qu'il sait rendre, ou `/Off` sinon.
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
    // Aucun widget ne sait rendre cet état. La case resterait vierge, sans que
    // rien ne le signale, sur un document opposable. `/Oui` et `/OUI` ne sont pas
    // le même état.
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
