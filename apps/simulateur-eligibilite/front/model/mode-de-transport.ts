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
    fait_autonomie_professionnel: answers["Q1.1"] === "3_AVEC_UN_PROFESSIONNEL",
    fait_accompagnant: answers["Q1.1"] === "2_AVEC_UN_PROCHE",
    fait_critere_tap: CRITERES_DU_TRANSPORT_ASSIS.some((critere) =>
      criteres.includes(critere),
    ),
    fait_critere_fauteuil: criteres.includes("6_FAUTEUIL_SANS_TRANSFERT"),
    fait_critere_allonge: criteres.includes("7_ALLONGE"),
    fait_critere_brancard: criteres.includes("8_BRANCARDAGE"),
    fait_critere_surveillance: criteres.includes("9_SURVEILLANCE"),
    fait_critere_oxygene: criteres.includes("10_OXYGENE"),
    fait_critere_asepsie: criteres.includes("11_ASEPSIE"),
    fait_partage_incompatible: (answers["Q1.3"] ?? []).includes(
      "6_PARTAGE_INCOMPATIBLE",
    ),
    fait_prefere_transport_commun: answers["Q1.4"] === "2_TRANSPORTS_EN_COMMUN",
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
const CRITERES_DU_TRANSPORT_ASSIS = [
  "1_PAS_AUTONOME",
  "2_AIDE_TECHNIQUE",
  "3_TRANSMISSION_PAR_UN_PROFESSIONNEL",
  "4_HYGIENE",
  "5_RISQUE_DE_MALAISE",
] as const;
