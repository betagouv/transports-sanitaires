// Le questionnaire du modèle : ses parties, dans l'ordre du catalogue de
// l'éditeur. Les options et leurs libellés viennent des déclarations.

import { optionsFrom, type QuestionnairePart } from "../../socle";
import type { Cibles } from "./declarations/cibles";
import { OPTIONS, type Questions } from "./declarations/questions";
import { modeDe } from "./mode-de-transport";
import { P2 } from "./partie-2";
import { sansProfessionnel } from "./reponses";

type Partie<Cibles> = QuestionnairePart<Questions, Cibles>;

const PROFESSIONNEL = "3_AVEC_UN_PROFESSIONNEL";

// Les critères de Q1.2 qui imposent l'ambulance.
const CRITERES_D_AMBULANCE = [
  "7_ALLONGE",
  "8_BRANCARDAGE",
  "9_SURVEILLANCE",
  "10_OXYGENE",
  "11_ASEPSIE",
] as const;

// Q1.3, et Q1.3.a sur la même page quand une dialyse est cochée. Décocher la
// dialyse retire Q1.3.a, et sa réponse avec elle.
const PAGE_DES_CAS_PARTICULIERS: Partie<undefined>["pages"][number] = {
  id: "P1/3",
  questions: [
    {
      id: "Q1.3",
      kind: "multiple choice",
      label:
        "Avant d’établir le mode de transport adéquat, sélectionnez tous les éventuels cas particuliers concernant le patient.",
      // Les types se donnent ici : `.filter` prive l'appel du contexte qui
      // les ferait inférer.
      options: optionsFrom<Questions["Q1.3"][number], Questions, undefined>(
        OPTIONS["Q1.3"],
        {
          // La corpulence ne compte qu'avec un motif d'ambulance. Retiré en
          // Q1.2, il emporte la réponse.
          "1_FORTE_CORPULENCE": {
            offeredIf: (_answers, _cibles, validated) =>
              CRITERES_D_AMBULANCE.some((critere) =>
                validated["Q1.2"]?.answer?.includes(critere),
              ),
          },
          // Le partage ne concerne que le transport assis professionnel et le
          // TPMR. Ce sont les règles qui disent le mode.
          "6_PARTAGE_INCOMPATIBLE": {
            offeredIf: (_answers, _cibles, validated) => {
              const mode = modeDe(validated);
              return mode === "TAP" || mode === "TPMR";
            },
          },
        },
      ).filter((option) => option.value !== "7_AUCUNE"),
      exclusiveOption: {
        value: "7_AUCUNE",
        label: OPTIONS["Q1.3"]["7_AUCUNE"],
      },
    },
    {
      id: "Q1.3.a",
      kind: "single choice",
      label: "La séance prévue est-elle une séance d’hémodialyse ?",
      askedIf: (answers) => answers["Q1.3"]?.includes("5_DIALYSE") ?? false,
      options: optionsFrom(OPTIONS["Q1.3.a"]),
    },
  ],
};

/** P1 : ce qui fait le mode de transport. Aucun résultat ne la suit seule. */
export const P1: Partie<undefined> = {
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
          options: optionsFrom(OPTIONS["Q1.1"]),
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
          askedIf: (answers) => answers["Q1.1"] === PROFESSIONNEL,
          dependsOn: ["Q1.1"],
          options: optionsFrom(OPTIONS["Q1.2"]),
          incompatibleOptions: [
            {
              values: ["6_FAUTEUIL_SANS_TRANSFERT", "7_ALLONGE"],
              explanation:
                "Le patient voyage dans son fauteuil ou allongé sur un brancard : une seule de ces deux positions pour un même trajet.",
            },
            {
              values: ["4_HYGIENE", "11_ASEPSIE"],
              explanation:
                "L’asepsie va au-delà des précautions d’hygiène : un seul de ces deux niveaux est retenu pour un même trajet.",
            },
          ],
        },
      ],
    },
    PAGE_DES_CAS_PARTICULIERS,
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
          askedIf: (answers) => sansProfessionnel(answers["Q1.1"]),
          dependsOn: ["Q1.1"],
          options: optionsFrom(OPTIONS["Q1.4"]),
        },
      ],
    },
  ],
};

/** P0 à P2 : modifiables tant que le résultat n'est pas verrouillé. */
export const PARTS: readonly Partie<undefined>[] = [
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
            options: optionsFrom(OPTIONS["Q0.1"], {
              "1_VERIFIER": { description: "Environ 3 minutes." },
              "2_VERIFIER_ET_PRESCRIRE": { description: "Environ 10 minutes." },
            }),
          },
        ],
      },
    ],
  },
  P1,
  P2,
];

/** P3, posée après le verrou : elle complète le cerfa, elle ne décide plus. */
export const COMPLEMENT: Partie<Cibles> = {
  id: "P3",
  title: "Informations permettant de compléter la prescription",
  pages: [],
};
