// Ce que le socle expose au reste de l'app : à `main.tsx`, de quoi la monter, et au
// modèle, de quoi s'écrire. Le modèle n'importe rien d'autre du socle, sauf le
// type d'une seed, que son catalogue lit à la source.
//
// L'écran des seeds et son tableau n'y figurent pas : ils sont chargés à la
// demande, et les réexporter ici les ramènerait dans le chunk d'entrée.

export {
  chargerMatomo,
  configDepuisEnv,
  initAnalytics,
} from "./analytics/matomo";
export { App } from "./app/App";
export type { Models } from "./app/model-choice";
export { at, type Cerfa, commentOn, drawnBox, text } from "./cerfa/cerfa";
export { templateAt } from "./cerfa/generate-cerfa";
export { bindCerfa, type CerfaMapping } from "./cerfa-mapping";
export { type CerfaInput, defineModel } from "./model";
export type { Address } from "./questionnaire-engine/address";
export {
  answerAbsent,
  answerPresent,
} from "./questionnaire-engine/answer-presence";
export {
  areAnswered,
  validatedQuestions,
} from "./questionnaire-engine/asked-questions";
export { optionsFrom } from "./questionnaire-engine/option";
export {
  type Answers,
  pagesOf,
  type QuestionnairePart,
  type Unanswered,
  type Validated,
} from "./questionnaire-engine/question";
