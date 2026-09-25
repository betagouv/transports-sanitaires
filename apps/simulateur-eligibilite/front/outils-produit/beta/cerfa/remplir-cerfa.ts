// Remplissage du CERFA n° 11574*07 à partir d'un jeu de saisies.
//
// Ce fichier ne fait que l'écriture. Ce qu'il faut écrire se décide dans
// `remplissage-pmt.ts` ; ici on ne connaît que le gabarit et ses pièges.
//
// `pdf-lib` fonctionne à l'identique dans Node et dans le navigateur. Ce module
// n'importe rien de `node:*` et reste donc exécutable côté front, ce qui permet de
// générer la prescription sans que les données patient quittent le poste. Voir la
// section « Où faire tourner le remplissage » du README.

import {
  PDFCheckBox,
  PDFDict,
  PDFDocument,
  type PDFFont,
  PDFName,
  PDFTextField,
  StandardFonts,
} from "pdf-lib";
import { DebordementDuTexteMedical } from "./elements-medicaux/debordement-du-texte-medical.ts";
import {
  TAILLE_DU_GABARIT,
  TAILLE_MINIMALE_LISIBLE,
  tailleQuiTient,
  tientDansLaZone,
} from "./elements-medicaux/mesure-de-la-zone.ts";

/**
 * État d'export à écrire pour cocher un champ. Le « off » est toujours `/Off`.
 *
 * `On` est le cas courant, une case pour un champ. Les autres servent aux champs
 * qui portent plusieurs cases visibles sous un même nom, c'est-à-dire des boutons
 * radio déguisés en case à cocher, dont chaque widget sait rendre un état et un
 * seul. La PMT en a trois (`ALD exo`, `oui1`, `oui2`), la DAP quatre.
 *
 * La casse compte, et les deux gabarits ne s'accordent pas : la PMT écrit `/OUI`
 * et `/NON`, la DAP `/Oui` et `/non`. Rien ne se devine ici. Les états sont
 * relevés par introspection, et `tests/cerfa/remplissage.test.ts` vérifie que
 * chaque état employé par un tableau est bien connu du champ visé.
 */
export type ÉtatCoché =
  | "On"
  | "OUI"
  | "NON"
  | "Oui"
  | "non"
  | "ald"
  | "atmp"
  | "camsp"
  | "engag"
  | "ref";

/**
 * Une valeur à écrire : un texte dans un champ nommé, une case à cocher, ou un
 * texte médical, mesuré avant d'être écrit en entier (`écrireTexteMédical`,
 * contrat EM-2).
 */
export type Saisie = { readonly champ: string } & (
  | { readonly texte: string }
  | { readonly coché: ÉtatCoché }
  | { readonly texteMédical: string }
);

export type OptionsRemplissage = {
  /**
   * Verrouille les champs remplis en lecture seule après coup. Le prescripteur ne
   * peut alors plus corriger ce que le simulateur a déduit, donc à n'activer que si
   * le produit assume cette contrainte. Par défaut le formulaire reste éditable.
   */
  readonly verrouiller?: boolean;
};

/**
 * Champs déclarés multilignes dans le PDF, mais dont le cadre visible ne montre
 * qu'une ligne. Y écrire un `\n` rogne silencieusement le reste à l'impression, on
 * aplatit donc sur une seule ligne les valeurs qui leur sont destinées.
 */
const MULTILIGNES_ROGNÉS: readonly string[] = ["adresse"];

/**
 * Écrit `saisies` dans le CERFA `gabarit` et rend le PDF résultant.
 *
 * Les champs de l'en-tête et de la prescription portent un widget sur chacun des
 * deux volets. Écrire une fois suffit donc, et les deux volets restent cohérents
 * par construction. Seuls `comm évent`, qui porte les éléments d'ordre médical, et
 * le bloc transporteur sont propres à un volet.
 *
 * @throws {DebordementDuTexteMedical} si le texte médical ne tient pas dans sa
 * rubrique : aucun PDF n'est produit, plutôt qu'un texte coupé.
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
    else if ("texteMédical" in saisie)
      écrireTexteMédical(formulaire, police, saisie.champ, saisie.texteMédical);
    else écrire(formulaire, police, saisie.champ, saisie.texte);
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
  nom: string,
  texte: string,
): void {
  const champ = formulaire.getField(nom);
  if (!(champ instanceof PDFTextField)) {
    throw new Error(`Le champ « ${nom} » n'est pas un champ texte.`);
  }
  const valeur = MULTILIGNES_ROGNÉS.includes(nom) ? aplatir(texte) : texte;

  const maximum = champ.getMaxLength();
  if (maximum !== undefined && valeur.length > maximum) {
    // Tronquer silencieusement produirait un NIR ou une adresse faux sur un
    // document opposable. On refuse plutôt que de livrer une prescription erronée.
    throw new Error(
      `« ${nom} » accepte ${maximum} caractères, ${valeur.length} fournis : « ${valeur} ».`,
    );
  }
  champ.setText(valeur);
  réduireSiÇaDéborde(champ, police, valeur);
}

/**
 * Les gabarits déclarent Courier 10 (`/Cour 10 Tf`), mais `pdf-lib` recompose
 * l'apparence de tout champ écrit dans sa police par défaut au moment de
 * `formulaire.updateFieldAppearances()`, jamais dans celle du `/DA` d'origine —
 * ici Helvetica, embarquée dans `remplirCerfa`. Une valeur composée, comme une
 * adresse assemblée sur l'unique ligne que le formulaire lui donne, peut
 * dépasser le cadre réel à 10 points, mesuré avec cette police réelle
 * (`tientDansLaZone`, sur laquelle repose aussi la zone médicale).
 *
 * Provisoire : on descend directement à `TAILLE_MINIMALE_LISIBLE` plutôt que de
 * chercher une taille intermédiaire, et sans garantir que tout y tienne — une
 * prochaine spec doit encore trancher le comportement attendu quand même ce
 * plancher ne suffit pas (TS973-14).
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
 * les apparences du champ. Pour les radios déguisés, décrits sur `ÉtatCoché`, cela
 * coche la mauvaise moitié une fois sur deux. On écrit donc la valeur du champ, et
 * pour chaque widget l'état d'apparence qu'il sait rendre, ou `/Off` sinon.
 */
function cocher(formulaire: Formulaire, nom: string, coché: ÉtatCoché): void {
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
    // le même état, et les deux gabarits n'écrivent pas la même casse.
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

/** Les champs de `MULTILIGNES_ROGNÉS` n'affichent qu'une ligne, on aplatit. */
function aplatir(texte: string): string {
  return texte
    .replace(/\s*\n+\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Écrit un texte médical en entier, s'il tient dans sa rubrique (contrat EM-2).
 *
 * Le cadre du gabarit est petit : une ligne et demie sur la PMT, qui passe à
 * la ligne d'elle-même, une seule sur la DAP. La police descend jusqu'au
 * plancher de lisibilité s'il le faut. Au-delà, rien n'est écrit plus petit ni
 * coupé : le texte déborde, et le prescripteur le révise.
 */
function écrireTexteMédical(
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
  if (taille === undefined) throw new DebordementDuTexteMedical(texte);
  champ.setText(texte);
  champ.setFontSize(taille);
}
