// Le mode de transport : les faits que les réponses de P1 établissent, et le
// mode que les règles en tirent avant la fin du questionnaire.
//
// Chaque fait vient d'une réponse du catalogue, sans jugement : c'est le
// classement « direct » de `docs/tasks/10-annexe-faits.md`.

import type { Answers } from "../socle";
import type { Cibles } from "./declarations/cibles";
import { AUCUN_FAIT, type Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";
import { cible } from "./evaluation-des-regles";

/** Les faits que Q1.1 à Q1.4 établissent. */
export function faitsDuMode(answers: Answers<Questions>) {
  const criteres = answers["Q1.2"] ?? [];
  return {
    fait_autonomie_professionnel: answers["Q1.1"] === "3",
    fait_accompagnant: answers["Q1.1"] === "2",
    fait_critere_tap: CRITERES_DU_TRANSPORT_ASSIS.some((critere) =>
      criteres.includes(critere),
    ),
    fait_critere_fauteuil: criteres.includes("6"),
    fait_critere_allonge: criteres.includes("7"),
    fait_critere_brancard: criteres.includes("8"),
    fait_critere_surveillance: criteres.includes("9"),
    fait_critere_oxygene: criteres.includes("10"),
    fait_critere_asepsie: criteres.includes("11"),
    fait_partage_incompatible: (answers["Q1.3"] ?? []).includes("6"),
    fait_prefere_transport_commun: answers["Q1.4"] === "2",
  } satisfies Partial<Faits>;
}

/**
 * Le mode que les règles retiennent pour ces réponses. Elles ne le rendent
 * qu'une fois P1 complète : elle est tenue pour telle, le temps de la poser.
 */
export function modeDe(answers: Answers<Questions>): Cibles["cible_mode_id"] {
  return cible(
    { ...AUCUN_FAIT, ...faitsDuMode(answers), fait_p1_complete: true },
    "cible_mode_id",
  );
}

// ---- implémentation ----

// Les options de Q1.2 qui relèvent du transport assis professionnel.
const CRITERES_DU_TRANSPORT_ASSIS = ["1", "2", "3", "4", "5"] as const;
