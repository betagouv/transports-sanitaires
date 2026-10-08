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

type Option<
  Questions extends AnyQuestions = AnyQuestions,
  Cibles = AnyCibles | undefined,
> = {
  readonly value: string;
  readonly label: string;
  /** Ce que l'option veut dire, rendu sous son libellé. */
  readonly description?: string;
  /**
   * L'option se propose-t-elle, vu les réponses ? Absente : toujours. Une
   * réponse qui la portait la perd quand elle ne se propose plus.
   */
  offeredIf?(answers: Answers<Questions>, cibles: Cibles): boolean;
};

type Common<Questions extends AnyQuestions, Cibles> = {
  readonly id: keyof Questions & string;
  readonly label: string;
  /** Le libellé, quand il dépend des réponses. Absente : `label`. */
  labelFrom?(answers: Answers<Questions>, cibles: Cibles): string;
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
  readonly options: readonly Option<Questions, Cibles>[];
};

export type MultipleChoice<
  Questions extends AnyQuestions = AnyQuestions,
  Cibles = AnyCibles | undefined,
> = Common<Questions, Cibles> & {
  readonly kind: "multiple choice";
  readonly options: readonly Option<Questions, Cibles>[];
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

/**
 * Les questions de la page qui se posent, vu les réponses et les cibles, telles
 * qu'elles se posent : sous leur libellé du moment, avec les seules options
 * qui se proposent.
 */
export function askedQuestions(
  page: Page,
  answers: Answers,
  cibles?: AnyCibles,
): Question[] {
  return page.questions
    .filter((question) => isAsked(question, answers, cibles))
    .map((question) => asPosed(question, answers, cibles));
}

/** Les pages qui posent au moins une question, dans l'ordre du questionnaire. */
export function askedPages(
  pages: readonly Page[],
  answers: Answers,
  cibles?: AnyCibles,
) {
  return pages.filter((page) =>
    page.questions.some((question) => isAsked(question, answers, cibles)),
  );
}

/**
 * La réponse, réduite aux options de la question. `undefined` quand il n'en
 * reste rien. Une saisie libre est rendue telle quelle.
 */
export function offeredAnswer(
  question: Question,
  answer: Answer | undefined,
): Answer | undefined {
  if (question.kind === "single choice")
    return valuesOf(question).includes(answer as string) ? answer : undefined;
  if (question.kind !== "multiple choice" || !Array.isArray(answer))
    return answer;
  const offered = answer.filter((value) => valuesOf(question).includes(value));
  return offered.length > 0 ? offered : undefined;
}

/** La réponse suffit-elle à quitter la question ? */
export function isAnswered(question: Question, answer: Answer | undefined) {
  const offered = offeredAnswer(question, answer);
  return offered !== undefined && errorOf(question, offered) === undefined;
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

function isAsked(question: Question, answers: Answers, cibles?: AnyCibles) {
  return question.askedIf?.(answers, cibles) ?? true;
}

function asPosed(
  question: Question,
  answers: Answers,
  cibles?: AnyCibles,
): Question {
  const label = question.labelFrom?.(answers, cibles) ?? question.label;
  if (question.kind !== "single choice" && question.kind !== "multiple choice")
    return { ...question, label };
  const options = question.options.filter(
    (option) => option.offeredIf?.(answers, cibles) ?? true,
  );
  return { ...question, label, options };
}

// Les valeurs qu'une réponse peut porter, l'option exclusive comprise.
function valuesOf(
  question: Extract<Question, { kind: "single choice" | "multiple choice" }>,
): string[] {
  const exclusive =
    question.kind === "multiple choice" ? question.exclusiveOption : undefined;
  return [...question.options, ...(exclusive ? [exclusive] : [])].map(
    (option) => option.value,
  );
}

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
