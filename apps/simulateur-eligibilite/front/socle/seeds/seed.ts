// Ce qu'est une seed : des réponses, et ce qu'on en attend.
//
// La même définition sert aux tests, qui comparent la préconisation aux
// attendus, et à l'écran des seeds, qui permet de l'ouvrir.

import type {
  Answers,
  AnyCibles,
  AnyQuestions,
} from "../questionnaire-engine/question";

/**
 * Où l'écran des seeds dépose l'utilisateur.
 *
 * `result` (par défaut) ouvre la page de résultat. La seed doit être
 * complète, et ses attendus sont vérifiés. Le questionnaire reste ouvert
 * derrière : « Précédent » y ramène.
 *
 * `questionnaire` ouvre la première page que la seed laisse sans réponse. La
 * seed n'a alors pas d'attendu : c'est un raccourci vers un écran, pas un cas
 * de non-régression.
 */
type Landing = "result" | "questionnaire";

export type Seed<
  Questions extends AnyQuestions = AnyQuestions,
  Cibles extends AnyCibles = AnyCibles,
> = {
  /** Identifiant stable, en kebab-case, cité par les tests et la doc. */
  readonly id: string;
  /** Libellé de l'écran des seeds : l'écran d'atterrissage, puis ce qu'on y voit. */
  readonly label: string;
  /** Pourquoi cette seed existe : ce qu'elle permet de voir ou de verrouiller. */
  readonly description: string;
  /** Résultat, qui est le défaut, ou questionnaire. Voir `Landing`. */
  readonly landing?: Landing;
  /** Les réponses données, par identifiant de question. */
  readonly answers: Answers<Questions>;
  /** Les cibles attendues. Partiel : on n'annonce que ce qui la caractérise. */
  readonly expected: Partial<Cibles>;
};

/** La seed s'arrête-t-elle en chemin, pour ouvrir le questionnaire ? */
export function opensQuestionnaire(seed: Seed): boolean {
  return seed.landing === "questionnaire";
}

type SeedMismatch = {
  readonly cible: string;
  readonly expected: unknown;
  readonly actual: unknown;
};

export type SeedEvaluation = {
  /** Ce que la préconisation rend pour cette seed. */
  readonly cibles: AnyCibles;
  /** Attendus démentis. Une liste vide veut dire seed conforme. */
  readonly mismatches: readonly SeedMismatch[];
};

/**
 * Évalue une seed et compare ses cibles à ses attendus.
 *
 * Le calcul est passé en paramètre : une seed ne sait pas comment le modèle
 * préconise, seulement ce qu'elle en attend.
 */
export function evaluateSeed(
  preconise: (answers: Answers) => AnyCibles,
  seed: Seed,
): SeedEvaluation {
  const cibles = preconise(seed.answers);
  const mismatches = Object.entries(seed.expected)
    .filter(([cible, expected]) => cibles[cible] !== expected)
    .map(([cible, expected]) => ({ cible, expected, actual: cibles[cible] }));
  return { cibles, mismatches };
}
