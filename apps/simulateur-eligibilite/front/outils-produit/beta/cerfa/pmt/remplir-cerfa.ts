// Remplissage du CERFA n° 11574*07 à partir d'un jeu de saisies.
//
// La couche d'écriture, et elle seule : *quoi* écrire se décide dans
// `remplissage-pmt.ts`. Ici on ne connaît que le gabarit et ses pièges.
//
// `pdf-lib` fonctionne à l'identique dans Node et dans le navigateur : ce module
// n'importe rien de `node:*` et reste donc exécutable côté front — ce qui permet
// de générer la prescription **sans que les données patient quittent le poste**
// (cf. README, § « Où faire tourner le remplissage »).

import {
  PDFCheckBox,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFTextField,
} from "pdf-lib";

/**
 * État d'export à écrire pour cocher un champ (le « off » est toujours `/Off`).
 *
 * `On` est le cas courant. `OUI` et `NON` servent aux trois champs du gabarit qui
 * sont des **boutons radio déguisés en case à cocher** — `ALD exo`, `oui1` et
 * `oui2` : un même champ y porte quatre widgets, deux par volet, dont l'un a pour
 * état d'export `/OUI` et l'autre `/NON`.
 */
export type ÉtatCoché = "On" | "OUI" | "NON";

/** Une valeur à écrire : un texte dans un champ nommé, ou une case à cocher. */
export type Saisie = { readonly champ: string } & (
  | { readonly texte: string }
  | { readonly coché: ÉtatCoché }
);

export type OptionsRemplissage = {
  /**
   * Verrouille les champs remplis (lecture seule) après coup. Le prescripteur ne
   * peut alors plus corriger ce que le simulateur a déduit — à n'activer que si le
   * produit assume cette contrainte. Par défaut le formulaire reste éditable.
   */
  readonly verrouiller?: boolean;
};

/**
 * Champs déclarés multilignes dans le PDF mais dont le cadre visible ne montre
 * qu'une ligne : y écrire un `\n` rogne silencieusement le reste à l'impression.
 * Les valeurs destinées à ces champs sont aplaties sur une seule ligne.
 */
const MULTILIGNES_ROGNÉS: readonly string[] = ["adresse"];

/**
 * Écrit `saisies` dans le CERFA `gabarit` et rend le PDF résultant.
 *
 * Les champs de l'en-tête et de la prescription portent un widget sur chacun des
 * deux volets : écrire une fois suffit, les deux volets restent cohérents par
 * construction. Seuls `comm évent` (éléments d'ordre médical) et le bloc
 * transporteur sont propres à un volet.
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

  // Sans cet appel, les valeurs sont bien dans le PDF mais rien ne s'affiche tant
  // qu'un lecteur ne régénère pas les apparences — ce que tous ne font pas.
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
    // document opposable : on refuse plutôt que de livrer une prescription erronée.
    throw new Error(
      `« ${nom} » accepte ${maximum} caractères, ${valeur.length} fournis : « ${valeur} ».`,
    );
  }
  champ.setText(valeur);
}

/**
 * Coche en imposant l'état d'export attendu.
 *
 * `PDFCheckBox.check()` de pdf-lib retient le premier état « on » qu'il trouve dans
 * les apparences du champ. Pour les radios déguisés (cf. `ÉtatCoché`), cela coche
 * la mauvaise moitié une fois sur deux. On écrit donc la valeur du champ et, pour
 * chaque widget, l'état d'apparence qu'il sait rendre (`/Off` sinon).
 */
function cocher(formulaire: Formulaire, nom: string, coché: ÉtatCoché): void {
  const champ = formulaire.getField(nom);
  if (!(champ instanceof PDFCheckBox)) {
    throw new Error(`Le champ « ${nom} » n'est pas une case à cocher.`);
  }
  const état = PDFName.of(coché);
  champ.acroField.dict.set(PDFName.of("V"), état);

  for (const widget of champ.acroField.getWidgets()) {
    const apparences = widget.getAppearances()?.normal;
    const sait = apparences instanceof PDFDict && apparences.has(état);
    widget.dict.set(PDFName.of("AS"), sait ? état : PDFName.of("Off"));
  }
}

/** Les champs de `MULTILIGNES_ROGNÉS` n'affichent qu'une ligne : on aplatit. */
function aplatir(texte: string): string {
  return texte
    .replace(/\s*\n+\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}
