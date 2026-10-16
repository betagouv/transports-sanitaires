// P2 : l'éligibilité. La prestation (Q2.1), puis le trajet (Q2.3). Les autres
// pages du catalogue viennent ensuite (issue 63).

import { optionsFrom, type QuestionnairePart } from "../../socle";
import { OPTIONS, type Questions } from "./declarations/questions";
import { motifDeP1, plusieursSeances } from "./prestation";
import { faitsDuTrajet, urgenceAAfficher } from "./trajet";

type Page = QuestionnairePart<Questions, undefined>["pages"][number];

// Q2.1 et ses sous-questions f, g et h, sur une seule page. Q2.1 se saute quand
// P1 prouve déjà un motif de transport ; Q2.1.f se pose quand même, si
// plusieurs séances sont cochées. La page s'affiche dès que l'une se pose
// (D-97).
const PAGE_DE_LA_PRESTATION: Page = {
  id: "P2/prestation",
  questions: [
    {
      id: "Q2.1",
      kind: "single choice",
      label:
        "Quelle situation médicale ou quel événement motive ce déplacement ?",
      askedIf: (_answers, _cibles, validated) => !motifDeP1(validated),
      options: optionsFrom<Questions["Q2.1"], Questions, undefined>(
        OPTIONS["Q2.1"],
        {
          // Une séance se coche en Q1.3 : elle ne se vote pas deux fois.
          "6_SEANCE": {
            offeredIf: (_answers, _cibles, validated) =>
              !validated["Q1.3"]?.answer?.some((cas) =>
                ["3_CHIMIOTHERAPIE", "4_RADIOTHERAPIE", "5_DIALYSE"].includes(
                  cas,
                ),
              ),
          },
        },
      ),
    },
    {
      id: "Q2.1.f",
      kind: "single choice",
      label:
        "Les séances sélectionnées motivent-elles le même déplacement vers le même lieu de soins ?",
      askedIf: (_answers, _cibles, validated) => plusieursSeances(validated),
      options: optionsFrom(OPTIONS["Q2.1.f"], {
        "2_NON": {
          blocks:
            "Une simulation porte sur un seul déplacement. Corrigez les séances en Q1.3, puis faites une simulation par déplacement.",
        },
      }),
    },
    {
      id: "Q2.1.g",
      kind: "single choice",
      label:
        "S’agit-il d’une entrée dans un établissement de santé, d’une sortie de cet établissement ou d’une admission en HAD à domicile ?",
      askedIf: (answers) => answers["Q2.1"] === "8_HOSPITALISATION",
      dependsOn: ["Q2.1"],
      options: optionsFrom(OPTIONS["Q2.1.g"]),
    },
    {
      id: "Q2.1.h",
      kind: "single choice",
      label:
        "La séance est-elle organisée par le CAMSP ou le CMPP, dans le parcours de l’enfant ?",
      askedIf: (answers) => answers["Q2.1"] === "10_CAMSP",
      dependsOn: ["Q2.1"],
      options: optionsFrom(OPTIONS["Q2.1.h"]),
    },
  ],
};

// Q2.3 : le trajet évalué, sur une seule page. L'avion ou le bateau est une
// case seule : décochée, elle répond « non ». La série se révèle sous la
// distance quand le trajet dépasse 50 km, et l'urgence quand la garde de
// l'éditeur le dit (`cible_question_urgence_a_afficher`).
const PAGE_DU_TRAJET: Page = {
  id: "P2/trajet",
  questions: [
    {
      id: "Q2.3.1",
      kind: "single choice",
      label:
        "Quelle distance parcourra le patient pour le trajet dans le sens évalué ?",
      options: optionsFrom(OPTIONS["Q2.3.1"]),
    },
    {
      id: "Q2.3.2",
      kind: "checkbox",
      label:
        "Une partie du trajet se fera en avion ou en bateau de ligne régulière.",
      box: "Oui, une partie du trajet se fera en avion ou en bateau de ligne régulière.",
    },
    {
      id: "Q2.3.3",
      kind: "single choice",
      label:
        "Dans les deux mois à compter du premier transport, au moins quatre transports de plus de 50 km chacun sont-ils prescrits au titre du même traitement ?",
      hint: "Un aller-retour compte pour deux transports.",
      askedIf: (_answers, _cibles, validated) =>
        faitsDuTrajet(validated).fait_distance_plus_50.value === true,
      options: optionsFrom(OPTIONS["Q2.3.3"]),
    },
    {
      id: "Q2.3.4",
      kind: "single choice",
      label:
        "Le médecin prescripteur atteste-t-il que ce transport est urgent ?",
      askedIf: (_answers, _cibles, validated) => urgenceAAfficher(validated),
      options: optionsFrom(OPTIONS["Q2.3.4"]),
    },
  ],
};

/** P2 : l'éligibilité. */
export const P2: QuestionnairePart<Questions, undefined> = {
  id: "P2",
  title: "Éligibilité",
  pages: [PAGE_DE_LA_PRESTATION, PAGE_DU_TRAJET],
};
