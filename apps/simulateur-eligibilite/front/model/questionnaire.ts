// Le questionnaire du modèle : ses parties, dans l'ordre du catalogue de
// l'éditeur. Les options et leurs libellés viennent des déclarations.

import type { Answers, QuestionnairePart } from "../socle";
import type { Cibles } from "./declarations/cibles";
import { OPTIONS, type Questions } from "./declarations/questions";
import { modeDe } from "./mode-de-transport";

/** P1 : ce qui fait le mode de transport. Aucun résultat ne la suit seule. */
export const P1: QuestionnairePart<Questions, undefined> = {
  id: "P1",
  title: "Autonomie et état de santé",
  pages: [
    {
      id: "P1/1",
      questions: [
        {
          id: "Q1.1",
          kind: "single choice",
          label: "Concernant son déplacement, le patient :",
          options: optionsOf("Q1.1"),
        },
      ],
    },
    {
      id: "P1/2",
      questions: [
        {
          id: "Q1.2",
          kind: "multiple choice",
          label:
            "Quelles aides ou conditions particulières sont nécessaires pendant le transport ?",
          askedIf: (answers) => answers["Q1.1"] === "3_AVEC_UN_PROFESSIONNEL",
          dependsOn: ["Q1.1"],
          options: optionsOf("Q1.2"),
        },
      ],
    },
    {
      id: "P1/3",
      questions: [
        {
          id: "Q1.3",
          kind: "multiple choice",
          label:
            "Avant d’établir le mode de transport adéquat, sélectionnez tous les éventuels cas particuliers concernant le patient.",
          options: optionsOf("Q1.3", {
            // Le partage ne concerne que le transport assis professionnel et
            // le TPMR. Ce sont les règles qui disent le mode.
            "6_PARTAGE_INCOMPATIBLE": {
              offeredIf: (answers) => {
                const mode = modeDe(answers);
                return mode === "TAP" || mode === "TPMR";
              },
            },
          }).filter((option) => option.value !== "7_AUCUNE"),
          exclusiveOption: {
            value: "7_AUCUNE",
            label: OPTIONS["Q1.3"]["7_AUCUNE"],
          },
        },
      ],
    },
    {
      id: "P1/4",
      questions: [
        {
          id: "Q1.4",
          kind: "single choice",
          label:
            "Le patient pouvant réaliser le trajet sans intervention d’un professionnel, merci de préciser sa préférence en matière de transport.",
          // Le catalogue demande que le libellé précise « en toute autonomie »
          // ou « avec l’aide d’un proche », sans donner la phrase.
          labelFrom: (answers) =>
            answers["Q1.1"] === "2_AVEC_UN_PROCHE"
              ? "Le patient pouvant réaliser le trajet avec l’aide d’un proche, sans intervention d’un professionnel, merci de préciser sa préférence en matière de transport."
              : "Le patient pouvant réaliser le trajet en toute autonomie, sans intervention d’un professionnel, merci de préciser sa préférence en matière de transport.",
          askedIf: (answers) =>
            answers["Q1.1"] === "1_SEUL" ||
            answers["Q1.1"] === "2_AVEC_UN_PROCHE",
          dependsOn: ["Q1.1"],
          options: optionsOf("Q1.4"),
        },
      ],
    },
  ],
};

/** P0 à P2 : modifiables tant que le résultat n'est pas verrouillé. */
export const PARTS: readonly QuestionnairePart<Questions, undefined>[] = [
  {
    id: "P0",
    title: "Mon besoin",
    pages: [
      {
        id: "P0/1",
        questions: [
          {
            id: "Q0.1",
            kind: "single choice",
            label: "Quel est votre besoin ?",
            options: optionsOf("Q0.1", {
              "1_VERIFIER": { description: "Environ 2 minutes." },
              "2_VERIFIER_ET_PRESCRIRE": { description: "Environ 4 minutes." },
            }),
          },
        ],
      },
    ],
  },
  P1,
];

/** P3, posée après le verrou : elle complète le cerfa, elle ne décide plus. */
export const COMPLEMENT: QuestionnairePart<Questions, Cibles> = {
  id: "P3",
  title: "Informations permettant de compléter la prescription",
  pages: [],
};

// ---- implémentation ----

// Ce qu'une option porte en plus de son libellé.
type Details = {
  description?: string;
  offeredIf?: (answers: Answers<Questions>) => boolean;
};

// Les options d'une question, dans l'ordre de leur déclaration.
function optionsOf<Id extends keyof typeof OPTIONS>(
  id: Id,
  details: Partial<Record<keyof (typeof OPTIONS)[Id], Details>> = {},
) {
  const slugs = Object.keys(OPTIONS[id]) as (keyof (typeof OPTIONS)[Id] &
    string)[];
  return slugs.map((slug) => ({
    value: slug,
    label: OPTIONS[id][slug] as string,
    ...details[slug],
  }));
}
