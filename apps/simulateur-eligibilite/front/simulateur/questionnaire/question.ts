// Ce qu'est une question du parcours, une page, et les réponses qu'on leur
// donne. Le questionnaire est déclaré par l'application : ses pages, ses
// conditions d'affichage et ses dépendances se lisent ici, pas dans un moteur
// de règles.

/** Une réponse : un choix, un nombre, un texte, ou les cases cochées. */
export type Reponse = string | number | readonly string[];

/** Les réponses données, par identifiant de question. */
export type Reponses = Readonly<Record<string, Reponse>>;

type Option = { readonly valeur: string; readonly libelle: string };

type Commun = {
  readonly id: string;
  readonly libelle: string;
  /** Phrase indicative, rendue sous la question. */
  readonly aide?: string;
  /** La question se pose-t-elle, les réponses lues ? Toujours, sans condition. */
  readonly poseeSi?: (reponses: Reponses) => boolean;
  /**
   * Les questions dont dépend cette réponse. Quand l'une d'elles change, cette
   * réponse est effacée, et elle seule (`invalidation.ts`).
   */
  readonly dependDe?: readonly string[];
};

export type ChoixUnique = Commun & {
  readonly forme: "choix unique";
  readonly options: readonly Option[];
};

export type ChoixMultiple = Commun & {
  readonly forme: "choix multiple";
  readonly options: readonly Option[];
  /** L'option exclusive : la cocher décoche les autres, et inversement. */
  readonly aucun?: Option;
};

export type SaisieNombre = Commun & {
  readonly forme: "nombre";
  readonly min?: number;
  readonly max?: number;
  readonly unite?: string;
};

export type SaisieTexte = Commun & {
  readonly forme: "texte" | "date" | "date et heure";
};

export type Question = ChoixUnique | ChoixMultiple | SaisieNombre | SaisieTexte;

export type Page = {
  readonly id: string;
  /** Rang de la partie du parcours que le stepper affiche, à partir de 1. */
  readonly partie: number;
  readonly questions: readonly Question[];
};

/** Les questions de la page qui se posent, les réponses lues. */
export function questionsPosees(page: Page, reponses: Reponses): Question[] {
  return page.questions.filter(
    (question) => question.poseeSi?.(reponses) ?? true,
  );
}

/** Les pages qui posent au moins une question, dans l'ordre du parcours. */
export function pagesPosees(pages: readonly Page[], reponses: Reponses) {
  return pages.filter((page) => questionsPosees(page, reponses).length > 0);
}

/** La réponse suffit-elle à quitter la question ? */
export function estRepondue(question: Question, reponse: Reponse | undefined) {
  return reponse !== undefined && erreurDe(question, reponse) === undefined;
}

/**
 * Ce qui ne va pas dans une saisie, à afficher sous le champ. `undefined`
 * quand elle convient, ou quand il n'y a encore rien à corriger.
 */
export function erreurDe(
  question: Question,
  reponse: Reponse | undefined,
): string | undefined {
  if (reponse === undefined) return undefined;
  if (question.forme === "nombre") return erreurDeNombre(question, reponse);
  if (question.forme === "choix multiple")
    return Array.isArray(reponse) && reponse.length > 0
      ? undefined
      : "Cochez au moins une réponse.";
  return typeof reponse === "string" && reponse.trim() !== ""
    ? undefined
    : "Cette réponse est attendue.";
}

// ---- implémentation ----

function erreurDeNombre(
  question: SaisieNombre,
  reponse: Reponse,
): string | undefined {
  if (typeof reponse !== "number" || !Number.isFinite(reponse))
    return "Indiquez un nombre.";
  if (question.min !== undefined && reponse < question.min)
    return `Indiquez un nombre d’au moins ${question.min}.`;
  if (question.max !== undefined && reponse > question.max)
    return `Indiquez un nombre d’au plus ${question.max}.`;
  return undefined;
}
