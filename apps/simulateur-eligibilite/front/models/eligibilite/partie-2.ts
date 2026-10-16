// P2 : l'éligibilité. La prestation (Q2.1), les situations particulières
// (Q2.2.1), le trajet (Q2.3), puis le transfert (Q2.5) et les exceptions de
// l'article 80 (Q2.6), dans `pages-du-transfert.ts`. Les autres pages du
// catalogue viennent ensuite (issue 63).

import { optionsFrom, type QuestionnairePart } from "../../socle";
import {
  contexteDeQ21,
  contextesAProposer,
  sejourAProposer,
} from "./contextes";
import { OPTIONS, type Questions } from "./declarations/questions";
import { PAGE_DES_EXCEPTIONS, PAGE_DU_TRANSFERT } from "./pages-du-transfert";
import { motifDeP1, plusieursSeances } from "./prestation";
import { faitsDuTrajet, urgenceAAfficher } from "./trajet";

type Page = QuestionnairePart<Questions, undefined>["pages"][number];

// Q2.1 et ses sous-questions f, g et h, sur une seule page. Q2.1 se saute quand
// P1 prouve déjà un motif de transport ; Q2.1.f se pose quand même, si
// plusieurs séances sont cochées. La page s'affiche dès que l'une se pose
// (D-102).
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

// Q2.2.1 et ses précisions sur une seule page : la permission (a), l'autre
// cadre (b) et l'étranger (Q2.2.5), chacune sous le groupe qui l'ouvre. Elle se
// pose sur tous les parcours, même quand Q2.1 est sautée (D-98).
const PAGE_DES_CONTEXTES: Page = {
  id: "P2/contextes",
  questions: [
    {
      id: "Q2.2.1",
      kind: "multiple choice",
      label:
        "L’une de ces situations correspond-elle aussi au trajet à réaliser ?",
      reminderFrom: (_answers, _cibles, validated) => {
        const indique = contexteDeQ21(validated);
        return indique && `Déjà indiqué : ${indique}`;
      },
      options: optionsFrom<Questions["Q2.2.1"][number], Questions, undefined>(
        OPTIONS["Q2.2.1"],
        {
          "1_HOSPITALISATION": {
            offeredIf: (_answers, _cibles, validated) =>
              sejourAProposer(validated),
          },
          "3_AUTRE_CADRE": {
            description:
              "Accident du travail ou maladie professionnelle, convocation ou appareillage, pension militaire, soins ou hébergement dans un dispositif particulier, retour vers un établissement pénitentiaire.",
            helpFrom: (_answers, _cibles, validated) => ({
              label: "Voir les situations concernées",
              items: contextesAProposer(validated).map(
                (contexte) => OPTIONS["Q2.2.1.b"][contexte],
              ),
            }),
          },
        },
      ).filter((option) => option.value !== "4_AUCUNE"),
      exclusiveOption: {
        value: "4_AUCUNE",
        label: OPTIONS["Q2.2.1"]["4_AUCUNE"],
        labelFrom: (_answers, _cibles, validated) =>
          contexteDeQ21(validated)
            ? "Aucune autre situation parmi celles proposées."
            : OPTIONS["Q2.2.1"]["4_AUCUNE"],
      },
    },
    {
      id: "Q2.2.1.a",
      kind: "single choice",
      label:
        "Ce trajet correspond-il à une permission temporaire de sortie de l’hôpital ?",
      askedIf: (answers) =>
        answers["Q2.2.1"]?.includes("1_HOSPITALISATION") ?? false,
      options: optionsFrom(OPTIONS["Q2.2.1.a"]),
    },
    {
      id: "Q2.2.1.b",
      kind: "multiple choice",
      label:
        "Laquelle ou lesquelles de ces situations concernent aussi ce trajet ?",
      askedIf: (answers) =>
        answers["Q2.2.1"]?.includes("3_AUTRE_CADRE") ?? false,
      options: optionsFrom<Questions["Q2.2.1.b"][number], Questions, undefined>(
        OPTIONS["Q2.2.1.b"],
      ).map((option) => ({
        ...option,
        offeredIf: (_answers, _cibles, validated) =>
          contextesAProposer(validated).some(
            (contexte) => contexte === option.value,
          ),
      })),
      incompatibleOptions: [
        {
          values: ["4_MATERNITE_ELOIGNEE", "5_HTNM"],
          explanation:
            "Un même hébergement relève de l’Engagement maternité ou d’un hébergement temporaire non médicalisé, pas des deux. Pour deux hébergements, faites une simulation par trajet.",
        },
        {
          values: ["6_CAMSP", "7_SAMSAH"],
          explanation:
            "Le CAMSP ou le CMPP accueille un enfant, le SAMSAH un adulte : un seul des deux pour un même trajet.",
        },
      ],
    },
    {
      id: "Q2.2.5",
      kind: "multiple choice",
      label: "Quel lieu lié à ce transport se trouve à l’étranger ?",
      askedIf: (answers) => answers["Q2.2.1"]?.includes("2_ETRANGER") ?? false,
      options: optionsFrom(OPTIONS["Q2.2.5"]),
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
  pages: [
    PAGE_DE_LA_PRESTATION,
    PAGE_DES_CONTEXTES,
    PAGE_DU_TRAJET,
    PAGE_DU_TRANSFERT,
    PAGE_DES_EXCEPTIONS,
  ],
};
