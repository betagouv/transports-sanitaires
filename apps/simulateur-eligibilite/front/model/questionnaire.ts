// Le questionnaire du modèle : ses parties, dans l'ordre du catalogue de
// l'éditeur. Les libellés en sont repris mot pour mot.

import type { QuestionnairePart } from "../socle";
import type { Cibles } from "./declarations/cibles";
import type { Questions } from "./declarations/questions";
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
          options: [
            {
              value: "1",
              label:
                "Peut se déplacer seul, sans aide technique ou humaine et sans besoin particulier sur l’entièreté du trajet.",
            },
            {
              value: "2",
              label:
                "Nécessite l’accompagnement d’un proche pour se déplacer ou transmettre les informations nécessaires à l’équipe soignante, sans intervention d’un professionnel pendant le transport.",
            },
            {
              value: "3",
              label:
                "Nécessite une prise en charge spécifique pendant le trajet, une aide d’un professionnel pour se déplacer ou, en l’absence d’un proche accompagnant, pour transmettre les informations nécessaires à l’équipe soignante.",
            },
          ],
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
          askedIf: (answers) => answers["Q1.1"] === "3",
          dependsOn: ["Q1.1"],
          options: [
            {
              value: "1",
              label:
                "Ne peut pas se déplacer de manière autonome sur une longue distance, utiliser seul les transports en commun ou conduire un véhicule personnel en raison de sa pathologie, de son traitement ou d’un handicap.",
            },
            {
              value: "2",
              label:
                "Nécessite une aide technique, telle qu’un fauteuil roulant, un déambulateur ou des béquilles, et une assistance pour monter dans le véhicule ou en descendre.",
            },
            {
              value: "3",
              label:
                "Nécessite, en l’absence d’un proche accompagnant, l’aide d’un professionnel pour transmettre les informations nécessaires à l’équipe soignante.",
            },
            {
              value: "4",
              label:
                "Nécessite le respect rigoureux de règles d’hygiène ou la désinfection du véhicule afin de prévenir un risque infectieux.",
            },
            {
              value: "5",
              label:
                "Présente un risque d’effets secondaires, de malaise ou de complications pendant le transport.",
            },
            {
              value: "6",
              label:
                "Le patient doit être transporté dans son fauteuil roulant, sans transfert vers un siège du véhicule.",
            },
            {
              value: "7",
              label:
                "Doit être transporté en position allongée ou semi-assise sur un brancard, car son état ne lui permet pas de rester assis normalement pendant le transport.",
            },
            {
              value: "8",
              label:
                "Nécessite un brancardage ou un portage, c’est-à-dire que le patient doit être soulevé et transporté par des professionnels, y compris sur une courte distance.",
            },
            {
              value: "9",
              label:
                "Nécessite une surveillance constante par une personne qualifiée et la présence de matériel de secours pendant le transport, en raison d’un risque médical identifié de dégradation de son état.",
            },
            {
              value: "10",
              label:
                "Nécessite l’administration d’oxygène pendant le transport.",
            },
            {
              value: "11",
              label:
                "L’état du patient nécessite un transport dans des conditions d’asepsie.",
            },
          ],
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
          options: [
            {
              value: "1",
              label:
                "La morphologie ou le poids du patient (plus de 150 kg) nécessite un véhicule disposant d’un équipement bariatrique adapté.",
            },
            {
              value: "2",
              label:
                "Les soins ou examens à l’origine du déplacement sont en lien avec une ALD (Affection de Longue Durée) reconnue pour ce patient par l’Assurance Maladie.",
            },
            { value: "3", label: "Séance de chimiothérapie." },
            { value: "4", label: "Séance de radiothérapie." },
            {
              value: "5",
              label: "Séance de dialyse en centre, notamment d’hémodialyse.",
            },
            {
              value: "6",
              label:
                "L’état de santé du patient n’est pas compatible avec un transport partagé.",
              // Le partage ne concerne que le transport assis professionnel
              // et le TPMR. Ce sont les règles qui disent le mode.
              offeredIf: (answers) => {
                const mode = modeDe(answers);
                return mode === "TAP" || mode === "TPMR";
              },
            },
          ],
          exclusiveOption: { value: "7", label: "Aucune de ces situations." },
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
            answers["Q1.1"] === "2"
              ? "Le patient pouvant réaliser le trajet avec l’aide d’un proche, sans intervention d’un professionnel, merci de préciser sa préférence en matière de transport."
              : "Le patient pouvant réaliser le trajet en toute autonomie, sans intervention d’un professionnel, merci de préciser sa préférence en matière de transport.",
          askedIf: (answers) =>
            answers["Q1.1"] === "1" || answers["Q1.1"] === "2",
          dependsOn: ["Q1.1"],
          options: [
            { value: "1", label: "Véhicule personnel." },
            { value: "2", label: "Transports en commun terrestres." },
          ],
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
            options: [
              {
                value: "1",
                label: "Vérifier une éligibilité",
                description: "Environ 2 minutes.",
              },
              {
                value: "2",
                label: "Vérifier et prescrire si la situation le permet",
                description: "Environ 4 minutes.",
              },
            ],
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
