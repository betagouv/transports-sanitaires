// Le questionnaire factice : trois questions sans rapport avec le transport
// sanitaire.
//
// Il garde sous test la mécanique du questionnaire : avancement automatique,
// retour, brouillon, effacement des réponses dépendantes et verrou.

import type { QuestionnairePart } from "../../../../front/socle";
import type { Cibles } from "./declarations/cibles";
import type { Questions } from "./declarations/questions";

/** Modifiables tant que le résultat n'est pas verrouillé. */
export const PARTS: readonly QuestionnairePart<Questions, undefined>[] = [
  {
    id: "commande",
    title: "Questionnaire factice",
    pages: [
      {
        id: "boisson",
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
    ],
  },
];

/** Posée après le verrou : elle complète, elle ne décide plus. */
export const COMPLEMENT: QuestionnairePart<Questions, Cibles> = {
  id: "complement",
  title: "Compléter la commande",
  pages: [
    {
      id: "quantite",
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
  ],
};
