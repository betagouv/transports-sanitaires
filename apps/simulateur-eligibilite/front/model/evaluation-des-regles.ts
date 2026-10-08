// Des faits aux cibles : ce que les règles publicodes de l'éditeur en
// calculent, par le moteur de décision du socle.

import { publicodesEngine } from "../socle/decision-engine/publicodes";
import { CIBLES, type Cibles } from "./declarations/cibles";
import type { Faits } from "./declarations/faits";
import { rules } from "./rules/regles.publicodes";

/** Toutes les cibles, et une seule cible, de faits donnés. */
export const { cibles, cible } = publicodesEngine<Faits, Cibles>(rules, CIBLES);
