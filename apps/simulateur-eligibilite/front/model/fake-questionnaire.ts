// Le questionnaire factice : trois questions sans rapport avec le transport
// sanitaire. Il ne décide rien.
//
// Il garde sous test la mécanique du questionnaire : avancement automatique,
// retour, brouillon, effacement des réponses dépendantes et verrou.

import type { Answers, Page } from "../socle";

/** Ce qu'une décision rend : des sorties nommées, à afficher et à comparer. */
export type Outputs = Readonly<Record<string, string>>;

export const PART_COUNT = 2;

/** Modifiables tant que le résultat n'est pas verrouillé. */
export const PAGES_BEFORE_LOCK: readonly Page[] = [
  {
    id: "boisson",
    part: 1,
    questions: [
      {
        id: "boisson",
        kind: "single choice",
        label: "Quelle boisson souhaitez-vous ?",
        options: [
          { value: "the", label: "Un thé" },
          { value: "cafe", label: "Un café" },
          { value: "rien", label: "Rien" },
        ],
      },
    ],
  },
  {
    id: "accompagnements",
    part: 1,
    questions: [
      {
        id: "accompagnements",
        kind: "multiple choice",
        label: "Avec quoi ?",
        askedIf: (answers) =>
          answers.boisson !== undefined && answers.boisson !== "rien",
        dependsOn: ["boisson"],
        options: [
          { value: "lait", label: "Du lait" },
          { value: "sucre", label: "Du sucre" },
        ],
        exclusiveOption: { value: "aucun", label: "Rien de plus" },
      },
    ],
  },
];

/** Posées après le verrou : elles complètent, elles ne décident plus. */
export const PAGES_AFTER_LOCK: readonly Page[] = [
  {
    id: "quantite",
    part: 2,
    questions: [
      {
        id: "quantite",
        kind: "number",
        label: "Combien de tasses ?",
        min: 1,
        unit: "tasses",
      },
    ],
  },
];

/** La décision factice : la commande, lue dans les réponses. */
export function decide(answers: Answers): Outputs {
  const boisson = LABELS[String(answers.boisson)];
  if (!boisson || answers.boisson === "rien") return { commande: "aucune" };
  const avec = sidesOf(answers);
  return {
    commande: avec.length > 0 ? `${boisson}, ${avec.join(" et ")}` : boisson,
  };
}

// ---- implémentation ----

const LABELS: Record<string, string> = {
  the: "thé",
  cafe: "café",
  lait: "lait",
  sucre: "sucre",
};

function sidesOf(answers: Answers): string[] {
  const checked = Array.isArray(answers.accompagnements)
    ? (answers.accompagnements as readonly string[])
    : [];
  return checked.flatMap((item) => LABELS[item] ?? []);
}
