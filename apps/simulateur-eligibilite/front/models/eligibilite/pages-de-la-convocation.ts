// La page de la convocation, après la permission : Q2.10 pour la catégorie, et
// sur la même page, pour l'appareillage, l'agrément du fournisseur (Q2.10.a) et
// l'appareillage concerné (Q2.10.b) (D-108).

import { optionsFrom, type QuestionnairePart } from "../../socle";
import { convocationAnnoncee } from "./convocation";
import { OPTIONS, type Questions } from "./declarations/questions";

type Page = QuestionnairePart<Questions, undefined>["pages"][number];

// Q2.10 se pose quand Q2.1 dit une convocation, ou que Q2.2.1.b en signale une
// (option 13). Elle n'est jamais reproposée si Q2.1 l'a déjà dite : Q2.2.1.b la
// retire. Q2.10.a et Q2.10.b se posent ensemble sous l'option 6.
export const PAGE_DE_LA_CONVOCATION: Page = {
  id: "P2/convocation",
  questions: [
    {
      id: "Q2.10",
      kind: "single choice",
      label:
        "Quelle convocation, quel avis d’audience ou quel appareillage motive ce trajet ?",
      askedIf: (_answers, _cibles, validated) => convocationAnnoncee(validated),
      options: optionsFrom(OPTIONS["Q2.10"]),
    },
    {
      id: "Q2.10.a",
      kind: "single choice",
      label: "Le fournisseur est-il agréé pour cet appareillage ?",
      askedIf: (answers) => answers["Q2.10"] === "6_APPAREILLAGE",
      dependsOn: ["Q2.10"],
      options: optionsFrom(OPTIONS["Q2.10.a"]),
    },
    {
      id: "Q2.10.b",
      kind: "single choice",
      label: "Quel appareillage est concerné ?",
      askedIf: (answers) => answers["Q2.10"] === "6_APPAREILLAGE",
      dependsOn: ["Q2.10"],
      options: optionsFrom(OPTIONS["Q2.10.b"]),
    },
  ],
};
