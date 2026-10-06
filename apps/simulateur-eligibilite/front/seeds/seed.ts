// Ce qu'est une seed : des réponses, et ce qu'on en attend.
//
// La même définition sert aux tests, qui comparent la décision aux attendus, et
// à l'écran des seeds, qui permet de l'ouvrir.

import type { Answers } from "../simulateur/questionnaire/question";

/** Ce que rend la décision : des sorties nommées. */
type Sorties = Readonly<Record<string, unknown>>;

/**
 * Où l'écran des seeds dépose l'utilisateur.
 *
 * `resultat` (par défaut) ouvre la page de résultat. La seed doit être
 * complète, et ses attendus sont vérifiés. Le questionnaire reste ouvert
 * derrière : « Précédent » y ramène.
 *
 * `questionnaire` ouvre la première page que la seed laisse sans réponse. La
 * seed n'a alors pas d'attendu : c'est un raccourci vers un écran, pas un cas
 * de non-régression.
 */
type Landing = "resultat" | "questionnaire";

export type Seed = {
  /** Identifiant stable, en kebab-case, cité par les tests et la doc. */
  readonly id: string;
  /** Libellé de l'écran des seeds : l'écran d'atterrissage, puis ce qu'on y voit. */
  readonly libelle: string;
  /** Pourquoi cette seed existe : ce qu'elle permet de voir ou de verrouiller. */
  readonly description: string;
  /** Résultat, qui est le défaut, ou questionnaire. Voir `Landing`. */
  readonly landing?: Landing;
  /** Les réponses données, par identifiant de question. */
  readonly answers: Answers;
  /** Les sorties attendues. Partiel : on n'annonce que ce qui la caractérise. */
  readonly attendu: Sorties;
};

/** La seed s'arrête-t-elle en chemin, pour ouvrir le questionnaire ? */
export function ouvreLeQuestionnaire(seed: Seed): boolean {
  return seed.landing === "questionnaire";
}

type EcartSeed = {
  readonly sortie: string;
  readonly attendu: unknown;
  readonly obtenu: unknown;
};

export type EvaluationSeed = {
  /** Ce que la décision rend pour cette seed. */
  readonly sorties: Sorties;
  /** Attendus démentis par la décision. Une liste vide veut dire seed conforme. */
  readonly ecarts: readonly EcartSeed[];
};

/**
 * Évalue une seed et compare la décision à ses attendus.
 *
 * La décision est passée en paramètre : une seed ne sait pas comment le
 * simulateur décide, seulement ce qu'elle en attend.
 */
export function evaluerSeed(
  decide: (answers: Answers) => Sorties,
  seed: Seed,
): EvaluationSeed {
  const sorties = decide(seed.answers);
  const ecarts = Object.entries(seed.attendu)
    .filter(([sortie, attendu]) => sorties[sortie] !== attendu)
    .map(([sortie, attendu]) => ({
      sortie,
      attendu,
      obtenu: sorties[sortie],
    }));
  return { sorties, ecarts };
}
