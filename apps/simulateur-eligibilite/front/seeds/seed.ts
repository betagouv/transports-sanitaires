// Ce qu'est une *seed* : des réponses nommées, avec ce qu'on attend d'elles.
//
// Une seed sert deux publics à partir d'une seule définition :
//   - les tests, qui rejouent le catalogue et comparent la décision aux attendus ;
//   - la galerie (`GalerieSeeds.tsx`, juste à côté), d'où l'on ouvre l'écran
//     correspondant.
//
// Les deux voient donc exactement les mêmes situations. Un cas de non-régression
// n'est plus seulement une ligne de test, il est consultable à l'écran.

import type { Reponses } from "../simulateur/questionnaire/question";

/** Ce que rend la décision : des sorties nommées. */
type Sorties = Readonly<Record<string, unknown>>;

/**
 * Où la galerie dépose l'utilisateur.
 *
 * `resultat`, qui est le défaut, ouvre la page de résultat. La seed doit alors
 * être complète, et ses attendus sont vérifiés. Le questionnaire n'est pas pour
 * autant escamoté : il est rouvert derrière la page, pour que « Précédent » y
 * ramène comme après une saisie.
 *
 * `questionnaire` fait l'inverse. La seed s'arrête volontairement en chemin, et
 * le parcours s'ouvre sur la première page qu'elle laisse sans réponse. Elle
 * n'annonce aucun attendu. Ce n'est pas un cas de non-régression, mais un
 * raccourci vers un écran qu'on veut voir.
 */
type Atterrissage = "resultat" | "questionnaire";

export type Seed = {
  /** Identifiant stable, en kebab-case, cité par les tests et la doc. */
  readonly id: string;
  /** Libellé de la galerie : l'écran d'atterrissage, puis ce qu'on y voit. */
  readonly libelle: string;
  /** Pourquoi cette seed existe : ce qu'elle permet de voir ou de verrouiller. */
  readonly description: string;
  /** Résultat, qui est le défaut, ou questionnaire. Voir `Atterrissage`. */
  readonly atterrissage?: Atterrissage;
  /** Les réponses données, par identifiant de question. */
  readonly reponses: Reponses;
  /** Les sorties attendues. Partiel : on n'annonce que ce qui la caractérise. */
  readonly attendu: Sorties;
};

/** La seed s'arrête-t-elle en chemin, pour ouvrir le questionnaire ? */
export function ouvreLeQuestionnaire(seed: Seed): boolean {
  return seed.atterrissage === "questionnaire";
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
 * Évalue une seed et confronte la décision à ses attendus.
 *
 * La décision est passée en paramètre plutôt qu'importée : une seed ne sait pas
 * comment le simulateur décide, seulement ce qu'elle en attend.
 */
export function evaluerSeed(
  decider: (reponses: Reponses) => Sorties,
  seed: Seed,
): EvaluationSeed {
  const sorties = decider(seed.reponses);
  const ecarts = Object.entries(seed.attendu)
    .filter(([sortie, attendu]) => sorties[sortie] !== attendu)
    .map(([sortie, attendu]) => ({
      sortie,
      attendu,
      obtenu: sorties[sortie],
    }));
  return { sorties, ecarts };
}
