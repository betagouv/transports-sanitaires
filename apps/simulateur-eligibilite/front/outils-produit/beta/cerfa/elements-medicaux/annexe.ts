// Ce que la mesure et l'annexe médicale demandent à `pdf-lib` : seul fichier
// du dossier à l'importer (décision 6 et 7 de la spec 0005).
//
// `layoutMultilineText` et `layoutSinglelineText` sont celles que `pdf-lib`
// emploie pour composer l'apparence réelle d'un champ (`updateFieldAppearances`,
// dans `remplir-cerfa.ts`) : les réutiliser pour mesurer, plutôt que
// réimplémenter un retour à la ligne, garantit que la mesure et le rendu
// s'accordent. `TAILLE_DE_POLICE` est celle que composent les deux gabarits —
// Helvetica 10, jamais réduite pour cette zone (décision 6).

import {
  layoutMultilineText,
  layoutSinglelineText,
  type PDFDocument,
  type PDFFont,
  type PDFTextField,
  StandardFonts,
  TextAlignment,
} from "pdf-lib";
import { MENTION_CONFIDENTIALITE } from "./libelles.ts";

type Bornes = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

const TAILLE_DE_POLICE = 10;
const TAILLE_ANNEXE = 11;
const INTERLIGNE_ANNEXE = TAILLE_ANNEXE * 1.2;
const MARGE_ANNEXE = 36; // 0,5 pouce
const HAUTEUR_ENTETE = 60;
const HAUTEUR_SIGNATURE = 90;

/**
 * Une mesure liée à `champ` : `texte` entre-t-il dans sa zone réelle, à
 * `police` et `taille` ? `taille` par défaut à `TAILLE_DE_POLICE` (10, jamais
 * réduite pour la zone médicale, décision 6) ; `remplir-cerfa.ts` l'appelle
 * aussi au plancher de lisibilité d'une adresse (TS973-14).
 */
export function tientDansLaZone(
  champ: PDFTextField,
  police: PDFFont,
  taille: number = TAILLE_DE_POLICE,
): (texte: string) => boolean {
  const bornes = bornesUtiles(champ);
  if (!bornes || bornes.width <= 0 || bornes.height <= 0) {
    return (texte) => texte === "";
  }
  return champ.isMultiline()
    ? (texte) => tientEnMultiligne(texte, police, taille, bornes)
    : (texte) =>
        layoutSinglelineText(texte, {
          alignment: TextAlignment.Left,
          fontSize: taille,
          font: police,
          bounds: bornes,
        }).line.width <= bornes.width;
}

/** Découpe `texte` en pages de lignes qui tiennent dans `cadre`, à `TAILLE_ANNEXE`. */
export function paginer(
  texte: string,
  police: PDFFont,
  cadre: { readonly largeur: number; readonly hauteur: number },
): string[][] {
  const disposition = layoutMultilineText(texte, {
    alignment: TextAlignment.Left,
    fontSize: TAILLE_ANNEXE,
    font: police,
    bounds: {
      x: 0,
      y: 0,
      width: cadre.largeur,
      height: Number.MAX_SAFE_INTEGER,
    },
  });
  const lignes = disposition.lines.map((ligne) => ligne.text);
  const parPage = Math.max(1, Math.floor(cadre.hauteur / INTERLIGNE_ANNEXE));
  const pages: string[][] = [];
  for (let i = 0; i < lignes.length; i += parPage) {
    pages.push(lignes.slice(i, i + parPage));
  }
  return pages.length > 0 ? pages : [[]];
}

/**
 * Insère l'annexe juste après `aprèsLaPage` (index 0), une ou plusieurs pages
 * de la taille de celle qu'elle suit. La dernière page seule porte les zones
 * de signature — décision 7 de la spec 0005.
 */
export async function insererAnnexe(
  document: PDFDocument,
  aprèsLaPage: number,
  annexe: { readonly titre: string; readonly texte: string },
): Promise<void> {
  const police = await document.embedFont(StandardFonts.Helvetica);
  const policeDuTitre = await document.embedFont(StandardFonts.HelveticaBold);
  const { width: largeur, height: hauteur } = document
    .getPage(aprèsLaPage)
    .getSize();
  const cadre = {
    largeur: largeur - 2 * MARGE_ANNEXE,
    hauteur: hauteur - 2 * MARGE_ANNEXE - HAUTEUR_ENTETE - HAUTEUR_SIGNATURE,
  };
  const pages = paginer(annexe.texte, police, cadre);
  pages.forEach((lignes, index) => {
    const page = document.insertPage(aprèsLaPage + 1 + index, [
      largeur,
      hauteur,
    ]);
    dessinerEntête(page, policeDuTitre, police, annexe.titre, index === 0);
    dessinerCorps(page, police, lignes, hauteur);
    if (index === pages.length - 1) dessinerZonesDeSignature(page, police);
  });
}

// ---- implémentation ----

// Le même calcul que `defaultTextFieldAppearanceProvider` de `pdf-lib` : la
// marge est la bordure du widget plus le remplissage qu'il applique aux
// champs non combés — jamais 0, sans quoi le texte toucherait le cadre.
function bornesUtiles(champ: PDFTextField): Bornes | undefined {
  const cadre = champ.acroField.getWidgets()[0]?.getRectangle();
  if (!cadre) return undefined;
  const bordure =
    champ.acroField.getWidgets()[0]?.getBorderStyle()?.getWidth() ?? 0;
  const marge = bordure + 1;
  return {
    x: 0,
    y: 0,
    width: cadre.width - 2 * marge,
    height: cadre.height - 2 * marge,
  };
}

function tientEnMultiligne(
  texte: string,
  police: PDFFont,
  taille: number,
  bornes: Bornes,
): boolean {
  const disposition = layoutMultilineText(texte, {
    alignment: TextAlignment.Left,
    fontSize: taille,
    font: police,
    bounds: bornes,
  });
  const tientEnHauteur =
    disposition.lines.length * disposition.lineHeight <= bornes.height;
  return (
    tientEnHauteur &&
    disposition.lines.every((ligne) => ligne.width <= bornes.width)
  );
}

function dessinerEntête(
  page: ReturnType<PDFDocument["insertPage"]>,
  policeDuTitre: PDFFont,
  police: PDFFont,
  titre: string,
  première: boolean,
): void {
  const { height: hauteur } = page.getSize();
  page.drawText(titre, {
    x: MARGE_ANNEXE,
    y: hauteur - MARGE_ANNEXE - 14,
    size: 14,
    font: policeDuTitre,
  });
  if (première) {
    page.drawText(MENTION_CONFIDENTIALITE, {
      x: MARGE_ANNEXE,
      y: hauteur - MARGE_ANNEXE - 34,
      size: 9,
      font: police,
    });
  }
}

function dessinerCorps(
  page: ReturnType<PDFDocument["insertPage"]>,
  police: PDFFont,
  lignes: readonly string[],
  hauteur: number,
): void {
  let y = hauteur - MARGE_ANNEXE - HAUTEUR_ENTETE;
  for (const ligne of lignes) {
    page.drawText(ligne, {
      x: MARGE_ANNEXE,
      y,
      size: TAILLE_ANNEXE,
      font: police,
    });
    y -= INTERLIGNE_ANNEXE;
  }
}

function dessinerZonesDeSignature(
  page: ReturnType<PDFDocument["insertPage"]>,
  police: PDFFont,
): void {
  const zones = [
    "Identité du patient : ……………………………………………………………………………",
    "Identité et RPPS du prescripteur : ……………………………………………………………",
    "Date : ……………………………     Signature du prescripteur :",
  ];
  let y = MARGE_ANNEXE + 40;
  for (const zone of zones) {
    page.drawText(zone, { x: MARGE_ANNEXE, y, size: 10, font: police });
    y -= 18;
  }
}
