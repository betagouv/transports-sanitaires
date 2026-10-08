// Ce que le socle expose au reste de l'app : à `Main`, de quoi la monter, et au
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
export { defineModel } from "./model";
export type {
  Answers,
  QuestionnairePart,
} from "./questionnaire-engine/question";
