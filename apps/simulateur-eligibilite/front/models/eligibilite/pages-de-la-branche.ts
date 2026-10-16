// La page de branche, dernière de P2 : Q2.13 (le départ d'une entrée), Q2.14
// (l'Engagement maternité et le HTNM) et Q2.12 (l'urgence, reprise de Q2.3.4).
// Elle ne s'affiche que si l'une de ses questions se pose (D-110).

import { optionsFrom, type QuestionnairePart } from "../../socle";
import {
  departAPoser,
  dispositifAPoser,
  rattachementAPoser,
  urgenceDevoilee,
} from "./branche";
import { OPTIONS, type Questions } from "./declarations/questions";

type Page = QuestionnairePart<Questions, undefined>["pages"][number];

const MATERNITE_REFUSEE =
  "Q2.1 indique un trajet au titre de l’Engagement maternité, et vous dites que le dispositif n’est pas établi. Corrigez le motif en Q2.1 : un hébergement ne devient pas un droit autonome.";

const HTNM_DANS_L_ENGAGEMENT_REFUSE =
  "Un hébergement rattaché à l’Engagement maternité suppose que le dispositif soit établi. Corrigez l’une des deux réponses.";

export const PAGE_DE_LA_BRANCHE: Page = {
  id: "P2/branche",
  questions: [
    {
      id: "Q2.13.depart",
      kind: "single choice",
      label: "D’où part le patient pour ce trajet ?",
      askedIf: (_answers, _cibles, validated) => departAPoser(validated),
      options: optionsFrom(OPTIONS["Q2.13.depart"]),
    },
    {
      id: "Q2.14.2",
      kind: "single choice",
      label:
        "Cet hébergement temporaire non médicalisé relève-t-il de l’Engagement maternité ?",
      askedIf: (_answers, _cibles, validated) => rattachementAPoser(validated),
      options: optionsFrom(OPTIONS["Q2.14.2"]),
    },
    {
      id: "Q2.14.1",
      kind: "single choice",
      label:
        "Le dispositif « Engagement maternité » est-il établi pour cette maternité éloignée ?",
      askedIf: (_answers, _cibles, validated) => dispositifAPoser(validated),
      dependsOn: ["Q2.14.2"],
      options: optionsFrom(OPTIONS["Q2.14.1"]),
      inconsistenciesFrom: (answers, _cibles, validated) => {
        if (answers["Q2.14.1"] !== "2_NON") return [];
        return [
          ...(validated["Q2.14.2"]?.answer === "1_DANS_L_ENGAGEMENT"
            ? [HTNM_DANS_L_ENGAGEMENT_REFUSE]
            : []),
          ...(validated["Q2.1"]?.answer === "13_MATERNITE"
            ? [MATERNITE_REFUSEE]
            : []),
        ];
      },
    },
    {
      id: "Q2.12",
      kind: "single choice",
      label:
        "Le médecin prescripteur atteste-t-il que ce transport est urgent ?",
      askedIf: (_answers, _cibles, validated) => urgenceDevoilee(validated),
      dependsOn: ["Q2.14.1", "Q2.14.2"],
      options: optionsFrom(OPTIONS["Q2.12"]),
    },
  ],
};
