// Ce qu'est une question, une page, une partie, une réponse.
//
// Le questionnaire est déclaré par le modèle : ses parties, ses pages, ses
// conditions d'affichage et ses dépendances. Le moteur ne connaît aucun
// identifiant : les génériques ne servent qu'à typer le modèle.

/** Une réponse : un choix, un nombre, un texte, ou les cases cochées. */
export type Answer = string | number | readonly string[];

/** Les questions d'un modèle : pour chacune, le type de sa réponse. */
export type AnyQuestions = Readonly<Record<string, Answer>>;

/** Les réponses données à un instant, par question. Il peut en manquer. */
export type Answers<Questions extends AnyQuestions = AnyQuestions> = Readonly<
  Partial<Questions>
>;

/** Les cibles d'un modèle : ce que sa préconisation rend. */
export type AnyCibles = Readonly<Record<string, unknown>>;

type Option = {
  readonly value: string;
  readonly label: string;
  /** Ce que l'option veut dire, rendu sous son libellé. */
  readonly description?: string;
};

type Common<Questions extends AnyQuestions, Cibles> = {
  readonly id: keyof Questions & string;
  readonly label: string;
  /** Phrase indicative, rendue sous la question. */
  readonly hint?: string;
  /**
   * La question se pose-t-elle, vu les réponses ? Absente : toujours. Après le
   * verrou, elle lit aussi les cibles figées : une question peut dépendre de la
   * préconisation.
   *
   * Écrite en méthode : TypeScript compare alors ses paramètres dans les deux
   * sens, et le moteur peut recevoir les questions typées d'un modèle.
   */
  askedIf?(answers: Answers<Questions>, cibles: Cibles): boolean;
  /**
   * Les questions dont dépend cette réponse. Quand l'une d'elles change, cette
   * réponse est effacée, et elle seule (`page-commit.ts`).
   */
  readonly dependsOn?: readonly (keyof Questions & string)[];
};

type SingleChoice<Questions extends AnyQuestions, Cibles> = Common<
  Questions,
  Cibles
> & {
  readonly kind: "single choice";
  readonly options: readonly Option[];
};

export type MultipleChoice<
  Questions extends AnyQuestions = AnyQuestions,
  Cibles = AnyCibles | undefined,
> = Common<Questions, Cibles> & {
  readonly kind: "multiple choice";
  readonly options: readonly Option[];
  /** L'option exclusive : la cocher décoche les autres, et inversement. */
  readonly exclusiveOption?: Option;
};

type NumberInput<Questions extends AnyQuestions, Cibles> = Common<
  Questions,
  Cibles
> & {
  readonly kind: "number";
  readonly min?: number;
  readonly max?: number;
  readonly unit?: string;
};

type TextInput<Questions extends AnyQuestions, Cibles> = Common<
  Questions,
  Cibles
> & {
  readonly kind: "text" | "date" | "datetime";
};

// Sans argument, ces types sont ceux du moteur : n'importe quelles questions,
// des cibles s'il y en a. Le modèle, lui, les écrit avec les siens.
export type Question<
  Questions extends AnyQuestions = AnyQuestions,
  Cibles = AnyCibles | undefined,
> =
  | SingleChoice<Questions, Cibles>
  | MultipleChoice<Questions, Cibles>
  | NumberInput<Questions, Cibles>
  | TextInput<Questions, Cibles>;

export type Page<
  Questions extends AnyQuestions = AnyQuestions,
  Cibles = AnyCibles | undefined,
> = {
  readonly id: string;
  readonly questions: readonly Question<Questions, Cibles>[];
};

/**
 * Une partie du questionnaire : ses pages, dans l'ordre. Le stepper compte les
 * parties, pas les pages. Le titre coiffe chacune de ses pages.
 */
export type QuestionnairePart<
  Questions extends AnyQuestions = AnyQuestions,
  Cibles = AnyCibles | undefined,
> = {
  readonly id: string;
  readonly title: string;
  readonly pages: readonly Page<Questions, Cibles>[];
};

/** Les pages de ces parties, dans l'ordre du questionnaire. */
export function pagesOf(parts: readonly QuestionnairePart[]): Page[] {
  return parts.flatMap((part) => part.pages);
}

/** Les questions de la page qui se posent, vu les réponses et les cibles. */
export function askedQuestions(
  page: Page,
  answers: Answers,
  cibles?: AnyCibles,
): Question[] {
  return page.questions.filter(
    (question) => question.askedIf?.(answers, cibles) ?? true,
  );
}

/** Les pages qui posent au moins une question, dans l'ordre du questionnaire. */
export function askedPages(
  pages: readonly Page[],
  answers: Answers,
  cibles?: AnyCibles,
) {
  return pages.filter(
    (page) => askedQuestions(page, answers, cibles).length > 0,
  );
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
  question: Extract<Question, { kind: "number" }>,
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
