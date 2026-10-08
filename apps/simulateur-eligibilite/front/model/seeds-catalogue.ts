// Le catalogue des seeds : les situations de référence du simulateur.
//
// Les tests le rejouent et l'écran des seeds l'affiche. Il est vide : une seed
// est faite de réponses, et l'oracle de l'éditeur n'est écrit qu'en faits
// (`tests/model/oracle.test.ts`).

import type { Seed } from "../socle/seeds/seed";
import type { Cibles } from "./declarations/cibles";
import type { Questions } from "./declarations/questions";

export const SEEDS: readonly Seed<Questions, Cibles>[] = [];
