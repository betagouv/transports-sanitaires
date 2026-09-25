// Les deux précisions médicales, saisies directement (TS973-15) :
// `p2_motif_detail` et `p2_transfert_motif_detail`.
//
// Recopie du contrat d'interface v9.7.3 : l'énoncé selon la raison
// (`labels_by_reason`), les suggestions (`suggestions_by_reason`,
// `suggestions`, `session_suggestions`) et la longueur maximale. Les
// suggestions aident, elles ne remplacent jamais la saisie : aucune n'est
// présélectionnée. Le contrôle de la saisie réencode `medicalDetailValid`
// (`src/application.mjs`).

import type { Situation } from "publicodes";
import { lecteurs } from "./lecture-de-situation";
import { SEANCES } from "./questionnaire/visibilite-des-options";

/** Ce que l'écran d'une précision affiche en plus de sa saisie. */
export type Precision = {
  /** L'énoncé propre à la raison du déplacement, s'il y en a un. */
  readonly libelle?: string;
  readonly suggestions: readonly string[];
  readonly longueurMax: number;
};

/** Les deux précisions médicales. */
export type ClePrecision = "p2_motif_detail" | "p2_transfert_motif_detail";

/** Ce qui cloche dans une précision saisie. */
export type RefusDeLaPrecision =
  | "generique"
  | "seance non declaree"
  | "trop longue";

/** La précision que ce champ recueille, ou `undefined` s'il n'en est pas une. */
export function precisionMedicale(
  id: string,
  situation: Situation<string>,
): Precision | undefined {
  if (id === "p2_motif_detail") return precisionDuMotif(situation);
  if (id === "p2_transfert_motif_detail")
    return precisionDuTransfert(situation);
  return undefined;
}

/**
 * Pourquoi la précision saisie ne convient pas, ou `undefined`. Pas encore
 * répondue, elle convient : c'est la complétude qui la réclame.
 */
export function refusDeLaPrecision(
  id: ClePrecision,
  situation: Situation<string>,
): RefusDeLaPrecision | undefined {
  const { lu, vrai } = lecteurs(situation);
  const saisie = lu(id).trim();
  if (saisie === "") return undefined;
  if (saisie.length > LONGUEUR_MAX) return "trop longue";
  if (GENERIQUES.has(replie(saisie))) return "generique";
  const seance = SEANCES[saisie];
  if (seance && !vrai(seance)) return "seance non declaree";
  return undefined;
}

/**
 * Les précisions que la situation demande sont-elles acceptables ? Une
 * réponse restée d'une autre raison ne compte pas. Lue par
 * `validations-documentaires.ts`.
 */
export function precisionsValides(situation: Situation<string>): boolean {
  return (["p2_motif_detail", "p2_transfert_motif_detail"] as const)
    .filter((id) => precisionDemandee(id, situation))
    .every((id) => refusDeLaPrecision(id, situation) === undefined);
}

// ---- implémentation ----

const LONGUEUR_MAX = 500;

const SOIN =
  "Soin ou traitement autre qu’une séance de chimiothérapie, de radiothérapie ou de dialyse";

const LIBELLES_PAR_RAISON: Record<string, string> = {
  "Consultation médicale": "Quelle consultation motive ce déplacement ?",
  "Examen médical": "Quel examen motive ce déplacement ?",
  [SOIN]: "Quel soin ou traitement motive ce déplacement ?",
  "Autre examen ou soin":
    "Précisez l’examen ou le soin à l’origine du déplacement.",
};

const SUGGESTIONS_PAR_RAISON: Record<string, readonly string[]> = {
  "Consultation médicale": [
    "Consultation de cardiologie",
    "Consultation de neurologie",
    "Consultation d’oncologie",
  ],
  "Examen médical": ["Imagerie médicale"],
  [SOIN]: ["Rééducation"],
};

const SUGGESTIONS_DE_TRANSFERT = ["Imagerie médicale", "Rééducation"];

// Les conditions de `p2_precision_motif_requise` et
// `p2_transfert_precision_requise` (regles.publicodes), lues sur la situation.
function precisionDemandee(id: ClePrecision, situation: Situation<string>) {
  const { lu } = lecteurs(situation);
  if (id === "p2_motif_detail")
    return lu("p2_raison_principale") in LIBELLES_PAR_RAISON;
  return (
    lu("p2_raison_principale") ===
      "Transfert d’un patient hospitalisé vers un autre établissement de santé" &&
    lu("p2_nature_transfert") === "Provisoire"
  );
}

function precisionDuMotif(situation: Situation<string>): Precision {
  const raison = lecteurs(situation).lu("p2_raison_principale");
  return {
    libelle: LIBELLES_PAR_RAISON[raison],
    suggestions: SUGGESTIONS_PAR_RAISON[raison] ?? [],
    longueurMax: LONGUEUR_MAX,
  };
}

// Les séances déclarées s'ajoutent aux suggestions (`session_suggestions` du
// contrat). `suggestionsFor`, dans l'adaptateur de référence, ne les ajoute
// pas : on suit le contrat d'interface, et l'écart est noté au ticket 21.
function precisionDuTransfert(situation: Situation<string>): Precision {
  const { vrai } = lecteurs(situation);
  const seances = Object.entries(SEANCES)
    .filter(([, cle]) => vrai(cle))
    .map(([libelle]) => libelle);
  return {
    suggestions: [...SUGGESTIONS_DE_TRANSFERT, ...seances],
    longueurMax: LONGUEUR_MAX,
  };
}

// Les libellés qui ne précisent rien : ceux des raisons, et les « Autre ».
// Comparés repliés, casse et accents effacés, comme chez l'éditeur.
const GENERIQUES = new Set(
  [
    "Autre - préciser",
    "Autre examen ou soin",
    "Consultation médicale",
    "Examen médical",
    SOIN,
    "Autre",
    "À préciser",
  ].map(replie),
);

function replie(texte: string): string {
  return texte
    .trim()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/\s+/g, " ");
}
