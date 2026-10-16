// Les consignes d'une fiche patient positive (#135) : le modus du catalogue,
// lu en introduction et en étapes numérotées. Une fonction pure, sans React.
//
// Le catalogue écrit le modus en texte à balisage léger : `<br>` pour les
// lignes, `**N. Titre**` pour une étape, « • » pour une puce, `[motif_Administratif]`
// et `[badges]` pour ce que la trace complète. Ce fichier lit ce balisage ; il
// n'y met aucun mot. Le gras et les liens du texte courant restent en place
// (`segments-du-texte.ts`).

import type { IssuePositive } from "./declarations/catalogue-resultats";

/** Une puce de liste ; avec des badges, c'est la légende qui les introduit. */
export type Puce = {
  readonly texte: string;
  readonly badges?: readonly string[];
};

/** Un bloc d'une étape : un paragraphe, ou une liste à puces. */
export type BlocDeConsigne =
  | { readonly type: "paragraphe"; readonly texte: string }
  | { readonly type: "liste"; readonly puces: readonly Puce[] };

type Etape = {
  readonly numero: number;
  readonly titre: string;
  readonly blocs: readonly BlocDeConsigne[];
};

/** L'introduction d'une issue d'accord préalable : un titre et un sous-titre. */
export type Introduction = {
  readonly title: string;
  readonly subtitle: string;
};

export type Consignes = {
  readonly introduction: string;
  /** Les paragraphes du sous-titre de l'introduction, s'il y en a un. */
  readonly complement: readonly string[];
  readonly etapes: readonly Etape[];
};

/** Le modus du libellé de mode, ou rien si le catalogue n'en a pas. */
export function modusDuMode(
  issue: IssuePositive,
  libelle: string,
): string | undefined {
  return issue.modus.find(
    ({ mode, alsoFor }) => mode === libelle || alsoFor.includes(libelle),
  )?.text;
}

/**
 * Les consignes de ce modus. Sans motif administratif, la clause « au titre
 * de … » est retirée de la phrase : rien n'est écrit à la place. Sans badge,
 * la puce des besoins particuliers n'apparaît pas. Le repère `[INTRO]` des
 * modus d'accord préalable devient le titre de l'introduction, puis son
 * sous-titre en paragraphes, une seule fois avant la première étape.
 */
export function consignesDuModus(
  modus: string,
  motif: string | undefined,
  badges: readonly string[],
  intro?: Introduction,
): Consignes {
  const lignes = sansGrasSurPlusieursLignes(avecLeMotif(modus, motif))
    .split("<br>")
    .filter((ligne) => ligne.trim() !== "");
  const introduction: string[] = [];
  const etapes: EtapeEnCours[] = [];
  for (const ligne of lignes) {
    const titre = titreDEtape(ligne);
    if (titre) etapes.push({ ...titre, lignes: [] });
    else (etapes.at(-1)?.lignes ?? introduction).push(ligne);
  }
  return {
    ...introductionDe(introduction, intro),
    etapes: etapes.map(({ lignes: corps, ...etape }) => ({
      ...etape,
      blocs: blocsDesLignes(corps, badges),
    })),
  };
}

// ---- implémentation ----

type EtapeEnCours = Omit<Etape, "blocs"> & { lignes: string[] };

const INTRO = "[INTRO]";
const MOTIF = "[motif_Administratif]";
const BADGES = "[badges]";
const CLAUSE_DU_MOTIF = ` au titre de ${MOTIF}`;

function avecLeMotif(modus: string, motif: string | undefined): string {
  if (motif === undefined) return modus.replaceAll(CLAUSE_DU_MOTIF, "");
  // Le catalogue écrit « au titre de [motif] » et les motifs commencent par
  // « un » : la fiche de l'éditeur élide, « au titre d’un transport ».
  const elision = /^[aeiouyéèh]/i.test(motif);
  const elide = elision ? modus.replaceAll(`de ${MOTIF}`, `d’${motif}`) : modus;
  return elide.replaceAll(MOTIF, motif);
}

// Les lignes avant la première étape, jointes ; le repère `[INTRO]` prend le
// titre de l'introduction, et son sous-titre fait le complément.
function introductionDe(
  lignes: readonly string[],
  intro: Introduction | undefined,
): Pick<Consignes, "introduction" | "complement"> {
  const repere = lignes.some((ligne) => ligne.trim() === INTRO);
  if (!intro || !repere)
    return { introduction: lignes.join(" "), complement: [] };
  return {
    introduction: lignes
      .map((ligne) => (ligne.trim() === INTRO ? intro.title : ligne))
      .join(" "),
    complement: intro.subtitle
      .split("<br>")
      .filter((ligne) => ligne.trim() !== ""),
  };
}

// Le catalogue ferme parfois le gras après un saut de ligne
// (`**2. Comment être remboursé ?<br>**`). Le saut sort du gras.
function sansGrasSurPlusieursLignes(texte: string): string {
  return texte
    .split("**")
    .map((morceau, rang) => {
      if (rang % 2 === 0) return morceau;
      const sans = morceau.replace(/(<br>)+$/, "");
      return `**${sans}**${morceau.slice(sans.length)}`;
    })
    .join("");
}

// `**1. Dès votre rendez-vous fixé**` : le numéro, puis le titre.
function titreDEtape(ligne: string): Pick<Etape, "numero" | "titre"> | null {
  const trouve = /^\*\*(\d+)\.\s*(.+)\*\*$/.exec(ligne.trim());
  if (!trouve) return null;
  return { numero: Number(trouve[1]), titre: trouve[2] ?? "" };
}

const PUCE = /^\s*•\s*/;

// Les lignes qui se suivent avec une puce font une liste ; les autres, chacune
// un paragraphe.
function blocsDesLignes(
  lignes: readonly string[],
  badges: readonly string[],
): BlocDeConsigne[] {
  const blocs: BlocDeConsigne[] = [];
  for (const ligne of lignes) {
    const dernier = blocs.at(-1);
    if (!PUCE.test(ligne)) {
      blocs.push({ type: "paragraphe", texte: ligne.trim() });
      continue;
    }
    const puce = puceDe(ligne.replace(PUCE, "").trim(), badges);
    if (!puce) continue;
    if (dernier?.type === "liste") {
      blocs[blocs.length - 1] = { ...dernier, puces: [...dernier.puces, puce] };
    } else blocs.push({ type: "liste", puces: [puce] });
  }
  return blocs;
}

// « et les besoins particuliers suivants : [badges]. » devient sa légende et
// ses badges. Sans badge, la puce disparaît.
function puceDe(texte: string, badges: readonly string[]): Puce | null {
  if (!texte.includes(BADGES)) return { texte };
  if (badges.length === 0) return null;
  return { texte: texte.split(BADGES)[0]?.trim() ?? "", badges };
}
