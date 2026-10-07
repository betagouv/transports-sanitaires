// Ce que le socle expose au modèle. Le modèle n'importe rien d'autre du socle.
//
// L'écran des seeds et son tableau n'y figurent pas : ils sont chargés à la
// demande, et les réexporter ici les ramènerait dans le chunk d'entrée.

export type { Answers, Page } from "./questionnaire-engine/question";
export type { Seed } from "./seeds/seed";
