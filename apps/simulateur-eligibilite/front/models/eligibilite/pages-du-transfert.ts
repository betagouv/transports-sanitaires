// Les deux pages du transfert, après le trajet de P2 : Q2.5 seule, puis Q2.6.a
// et Q2.6 sur la page des exceptions de l'article 80 (D-106).

import { optionsFrom, type QuestionnairePart } from "../../socle";
import { OPTIONS, type Questions } from "./declarations/questions";
import {
  retourPenitentiaireValide,
  TRANSFERT_VERS_LA_PRISON,
} from "./retour-penitentiaire";
import {
  champIOuvert,
  exceptionAProposer,
  transfertAPoser,
  typeAPoser,
} from "./transfert";

type Page = QuestionnairePart<Questions, undefined>["pages"][number];

// Q2.5 distingue le transfert entre établissements d'un autre déplacement
// pendant l'hospitalisation. Q2.1 = 9 les regroupe, et Q2.2.1.a écarte la
// permission sans dire de quel déplacement il s'agit.
export const PAGE_DU_TRANSFERT: Page = {
  id: "P2/transfert",
  questions: [
    {
      id: "Q2.5",
      kind: "single choice",
      label:
        "S’agit-il d’un transfert entre établissements ou d’un autre déplacement pendant l’hospitalisation ?",
      askedIf: (_answers, _cibles, validated) => transfertAPoser(validated),
      options: optionsFrom(OPTIONS["Q2.5"]),
      inconsistenciesFrom: (answers, _cibles, validated) =>
        answers["Q2.5"] === "1_TRANSFERT" &&
        retourPenitentiaireValide(validated)
          ? [TRANSFERT_VERS_LA_PRISON]
          : [],
    },
  ],
};

// Le type du transfert (Q2.6.a, posée à part), puis les exceptions. Les
// exceptions attendent le type quand il se pose : leurs options en dépendent.
export const PAGE_DES_EXCEPTIONS: Page = {
  id: "P2/exceptions",
  questions: [
    {
      id: "Q2.6.a",
      kind: "single choice",
      label: "Le transfert est-il définitif ou provisoire ?",
      askedIf: (_answers, _cibles, validated) => typeAPoser(validated),
      options: optionsFrom(OPTIONS["Q2.6.a"]),
    },
    {
      id: "Q2.6",
      kind: "multiple choice",
      label:
        "Quelle situation précise et quelles exceptions s’appliquent à ce déplacement ?",
      askedIf: (answers, _cibles, validated) =>
        champIOuvert(validated) &&
        (!typeAPoser(validated) || answers["Q2.6.a"] !== undefined),
      reminderFrom: (_answers, _cibles, validated) =>
        validated["Q2.3.2"]?.answer === true
          ? "Déjà indiqué : une partie du trajet se fera en avion ou en bateau de ligne régulière."
          : undefined,
      options: optionsFrom<Questions["Q2.6"][number], Questions, undefined>(
        OPTIONS["Q2.6"],
      )
        .filter((option) => option.value !== "11_AUCUNE")
        .map((option) => ({
          ...option,
          offeredIf: (answers, _cibles, validated) =>
            exceptionAProposer(
              option.value as Questions["Q2.6"][number],
              answers["Q2.6.a"],
              validated,
            ),
        })),
      exclusiveOption: {
        value: "11_AUCUNE",
        label: OPTIONS["Q2.6"]["11_AUCUNE"],
      },
    },
  ],
};
