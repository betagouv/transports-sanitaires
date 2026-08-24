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
  PDFName,
  PDFTextField,
} from "pdf-lib";

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

/** Une valeur à écrire : un texte dans un champ nommé, ou une case à cocher. */
export type Saisie = { readonly champ: string } & (
  | { readonly texte: string }
  | { readonly coché: ÉtatCoché }
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
 */
export async function remplirCerfa(
  gabarit: Uint8Array | ArrayBuffer,
  saisies: readonly Saisie[],
  options: OptionsRemplissage = {},
): Promise<Uint8Array> {
  const document = await PDFDocument.load(gabarit);
  const formulaire = document.getForm();

  for (const saisie of saisies) {
    if ("coché" in saisie) cocher(formulaire, saisie.champ, saisie.coché);
    else écrire(formulaire, saisie.champ, saisie.texte);
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

function écrire(formulaire: Formulaire, nom: string, texte: string): void {
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
  réduireSiÇaDéborde(champ, valeur);
}

/**
 * Les deux gabarits écrivent en Courier 10 (`/Cour 10 Tf`), à taille fixe. Une
 * valeur composée, comme une adresse aplatie sur l'unique ligne que le formulaire
 * lui donne, dépasse le cadre : le PDF la porte entière, l'impression la rogne, et
 * rien ne le signale.
 *
 * On passe alors en taille automatique, et `pdf-lib` recompose l'apparence à une
 * taille qui tient, dans sa police par défaut puisque Courier n'est pas des
 * siennes. On ne le fait que dans ce cas : en taille automatique partout, une
 * valeur courte grossirait jusqu'à la hauteur du cadre, et le document changerait
 * d'allure sans qu'on y gagne rien.
 *
 * Courier est à chasse fixe, chaque caractère occupant 0,6 cadratin, donc la
 * largeur se calcule sans rien mesurer. `tests/cerfa/remplissage.test.ts` vérifie
 * que les deux gabarits emploient bien cette police et cette taille.
 */
function réduireSiÇaDéborde(champ: PDFTextField, valeur: string): void {
  const cadre = champ.acroField.getWidgets()[0]?.getRectangle();
  if (!cadre) return;
  const largeur = valeur.length * TAILLE_DU_GABARIT * AVANCE_COURIER;
  if (largeur > cadre.width - 2 * MARGE_INTERNE) champ.setFontSize(0);
}

const TAILLE_DU_GABARIT = 10;
const AVANCE_COURIER = 0.6;
// La marge que pdf-lib laisse de chaque côté en composant l'apparence.
const MARGE_INTERNE = 2;

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
