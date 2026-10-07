// Le catalogue des seeds : les situations de référence du simulateur.
//
// Les tests le rejouent et l'écran des seeds l'affiche. Il est vide : le
// questionnaire factice n'a pas de situation de référence.

import type { Seed } from "../socle/seeds/seed";
import type { Cibles } from "./declarations/cibles";
import type { Questions } from "./declarations/questions";

export const SEEDS: readonly Seed<Questions, Cibles>[] = [];
