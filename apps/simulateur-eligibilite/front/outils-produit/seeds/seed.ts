// Ce qu'est une *seed* : une situation nommée, avec ce qu'on attend d'elle.
//
// Une seed sert deux publics à partir d'une seule définition :
//   - les tests, qui rejouent le catalogue et comparent le moteur aux attendus ;
//   - la galerie (`GalerieSeeds.tsx`, juste à côté), d'où l'on ouvre le résultat
//     correspondant, et le CERFA pré-rempli quand le cas s'y prête.
//
// Les deux voient donc exactement les mêmes situations. Un cas de non-régression
// n'est plus seulement une ligne de test, il est consultable à l'écran.

import type Engine from "publicodes";
import type { Situation } from "publicodes";
import type { Outil } from "../../app/outil.ts";
import type {
  Cible,
  SituationTypee,
} from "../../simulateur/contrat-regles-publicodes.ts";
import { BASE_NEUTRE } from "./base-neutre.ts";

/**
 * Sorties du modèle qu'une seed peut annoncer. Ce sont les cibles du parcours, ni
 * les questions ni les règles intermédiaires : une seed décrit ce que le produit
 * affiche, pas comment le moteur y arrive.
 */
const CIBLES_SEED = [
  "cible_resultat_medical",
  "cible_transport_sanitaire_prescrit",
  "cible_partie_2_requise",
  "cible_cas_final",
  "cible_document_a_remettre_au_patient",
  // Qui paie, en un mot. C'est l'axe sur lequel se lit une non-conformité : un
  // transport dont le régime n'est pas « assurance maladie » ne doit pas lui être
  // facturé.
  "cible_regime_financement",
  // Article 80 : ce qui distingue deux transports à la charge de l'établissement.
  "cible_article_80_situation_specifique",
] as const satisfies readonly Cible[];

export type CibleSeed = (typeof CIBLES_SEED)[number];

/**
 * Attendus déclarés par une seed. Ils sont partiels : on n'annonce que ce qui la
 * caractérise, sauf `cible_regime_financement`, que toutes déclarent. Voir
 * `catalogue.ts`.
 */
type AttenduSeed = Partial<Record<CibleSeed, string | boolean>>;

/**
 * Réponses d'une seed, surchargées sur la base neutre. `null` retire la réponse :
 * c'est ainsi qu'une seed laisse une question sans réponse, ce qu'aucune surcharge
 * ne saurait exprimer puisque la base neutre répond à tout.
 */
type EntreesSeed = { [Question in keyof SituationTypee]: string | null };

/**
 * Où la galerie dépose l'utilisateur.
 *
 * `resultat`, qui est le défaut, ouvre directement la page de résultat. La seed
 * doit alors être complète, et ses attendus sont vérifiés. Le questionnaire n'est
 * pas pour autant escamoté : le parcours que ces réponses auraient produit est
 * rejoué derrière la page, voir `simulateur/questionnaire/rejeu.ts`, pour que
 * « Précédent » y ramène comme après une saisie.
 *
 * `questionnaire` fait l'inverse. La seed s'arrête volontairement en chemin, et le
 * parcours s'ouvre sur la première question qu'elle laisse sans réponse. Elle ne
 * décide donc aucune cible et n'annonce aucun attendu. Ce n'est pas un cas de
 * non-régression, mais un raccourci vers un écran qu'on veut voir.
 */
type Atterrissage = "resultat" | "questionnaire";

export type Seed = {
  /** Identifiant stable, en kebab-case, cité par les tests, les scripts et la doc. */
  readonly id: string;
  /** Libellé de la galerie : l'écran d'atterrissage, puis ce qu'on y voit. */
  readonly libelle: string;
  /** Pourquoi cette seed existe : ce qu'elle permet de voir ou de verrouiller. */
  readonly description: string;
  /** Écran ouvert par la galerie : résultat médical (P1) ou résultat final (P2). */
  readonly outil: Outil;
  /** Résultat, qui est le défaut, ou questionnaire. Voir `Atterrissage`. */
  readonly atterrissage?: Atterrissage;
  /** Réponses qui distinguent cette seed, surchargées sur `BASE_NEUTRE`. */
  readonly entrees: EntreesSeed;
  readonly attendu: AttenduSeed;
};

/** La seed s'arrête-t-elle en chemin, pour ouvrir le questionnaire ? */
export function ouvreLeQuestionnaire(seed: Seed): boolean {
  return seed.atterrissage === "questionnaire";
}

/** Situation publicodes de la seed : la base neutre et ses entrées, `null` retirant. */
export function situationDe(seed: Seed): Situation<string> {
  const situation: Situation<string> = { ...BASE_NEUTRE };
  for (const [cle, valeur] of Object.entries(seed.entrees)) {
    if (valeur === null) delete situation[cle];
    else situation[cle] = valeur;
  }
  return situation;
}

type EcartSeed = {
  readonly cible: CibleSeed;
  readonly attendu: string | boolean;
  readonly obtenu: unknown;
};

export type EvaluationSeed = {
  /** Valeur rendue par le moteur pour chaque cible. */
  readonly valeurs: Record<CibleSeed, unknown>;
  /** Cibles laissées indécises. Toujours vide si la base neutre suffit. */
  readonly manquantes: readonly CibleSeed[];
  /** Attendus démentis par le moteur. Une liste vide veut dire seed conforme. */
  readonly ecarts: readonly EcartSeed[];
};

/**
 * Évalue une seed et confronte le moteur à ses attendus.
 *
 * Le moteur est passé en paramètre plutôt que construit ici, parce que le front en
 * a un seul, dans `front/simulateur/moteur.ts`, qui peut porter les règles du labo,
 * et que les tests le fabriquent depuis le disque.
 */
export function evaluerSeed(
  moteur: Engine<string>,
  seed: Seed,
): EvaluationSeed {
  const évalué = moteur.setSituation(situationDe(seed));

  const valeurs = {} as Record<CibleSeed, unknown>;
  const manquantes: CibleSeed[] = [];
  for (const cible of CIBLES_SEED) {
    const résultat = évalué.evaluate(cible);
    valeurs[cible] = résultat.nodeValue;
    if (Object.keys(résultat.missingVariables ?? {}).length > 0)
      manquantes.push(cible);
  }

  const ecarts = Object.entries(seed.attendu)
    .filter(([cible, attendu]) => valeurs[cible as CibleSeed] !== attendu)
    .map(([cible, attendu]) => ({
      cible: cible as CibleSeed,
      attendu: attendu as string | boolean,
      obtenu: valeurs[cible as CibleSeed],
    }));

  return { valeurs, manquantes, ecarts };
}
