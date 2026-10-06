// Ce qu'est une question du parcours, une page, et les réponses qu'on leur
// donne. Le questionnaire est déclaré par l'application : ses pages, ses
// conditions d'affichage et ses dépendances se lisent ici, pas dans un moteur
// de règles.

/** Une réponse : un choix, un nombre, un texte, ou les cases cochées. */
export type Answer = string | number | readonly string[];

/** Les réponses données, par identifiant de question. */
export type Answers = Readonly<Record<string, Answer>>;

type Option = { readonly value: string; readonly label: string };

type Common = {
  readonly id: string;
  readonly label: string;
  /** Phrase indicative, rendue sous la question. */
  readonly hint?: string;
  /** La question se pose-t-elle, les réponses lues ? Toujours, sans condition. */
  readonly askedIf?: (answers: Answers) => boolean;
  /**
   * Les questions dont dépend cette réponse. Quand l'une d'elles change, cette
   * réponse est effacée, et elle seule (`invalidation.ts`).
   */
  readonly dependsOn?: readonly string[];
};

type SingleChoice = Common & {
  readonly kind: "single choice";
  readonly options: readonly Option[];
};

export type MultipleChoice = Common & {
  readonly kind: "multiple choice";
  readonly options: readonly Option[];
  /** L'option exclusive : la cocher décoche les autres, et inversement. */
  readonly exclusiveOption?: Option;
};

type NumberInput = Common & {
  readonly kind: "number";
  readonly min?: number;
  readonly max?: number;
  readonly unit?: string;
};

type TextInput = Common & {
  readonly kind: "text" | "date" | "datetime";
};

export type Question = SingleChoice | MultipleChoice | NumberInput | TextInput;

export type Page = {
  readonly id: string;
  /** Rang de la partie du parcours que le stepper affiche, à partir de 1. */
  readonly part: number;
  readonly questions: readonly Question[];
};

/** Les questions de la page qui se posent, les réponses lues. */
export function askedQuestions(page: Page, answers: Answers): Question[] {
  return page.questions.filter(
    (question) => question.askedIf?.(answers) ?? true,
  );
}

/** Les pages qui posent au moins une question, dans l'ordre du parcours. */
export function askedPages(pages: readonly Page[], answers: Answers) {
  return pages.filter((page) => askedQuestions(page, answers).length > 0);
}

/** La réponse suffit-elle à quitter la question ? */
export function isAnswered(question: Question, answer: Answer | undefined) {
  return answer !== undefined && errorOf(question, answer) === undefined;
}

/**
 * Ce qui ne va pas dans une saisie, à afficher sous le champ. `undefined`
 * quand elle convient, ou quand il n'y a encore rien à corriger.
 */
export function errorOf(
  question: Question,
  answer: Answer | undefined,
): string | undefined {
  if (answer === undefined) return undefined;
  if (question.kind === "number") return numberErrorOf(question, answer);
  if (question.kind === "multiple choice")
    return Array.isArray(answer) && answer.length > 0
      ? undefined
      : "Cochez au moins une réponse.";
  return typeof answer === "string" && answer.trim() !== ""
    ? undefined
    : "Cette réponse est attendue.";
}

// ---- implémentation ----

function numberErrorOf(
  question: NumberInput,
  answer: Answer,
): string | undefined {
  if (typeof answer !== "number" || !Number.isFinite(answer))
    return "Indiquez un nombre.";
  if (question.min !== undefined && answer < question.min)
    return `Indiquez un nombre d’au moins ${question.min}.`;
  if (question.max !== undefined && answer > question.max)
    return `Indiquez un nombre d’au plus ${question.max}.`;
  return undefined;
}
