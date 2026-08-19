// Ce qu'est une *seed* : une situation nommée, avec ce qu'on attend d'elle.
//
// Une seed sert deux publics à partir d'une seule définition :
//   - les **tests**, qui rejouent le catalogue et comparent le moteur aux attendus ;
//   - la **galerie** (`GalerieSeeds.tsx`, juste à côté), d'où l'on ouvre le
//     résultat correspondant — et, quand le cas s'y prête, le CERFA pré-rempli.
//
// Les deux voient donc exactement les mêmes situations : un cas de non-régression
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
 * Sorties du modèle qu'une seed peut annoncer. Ce sont les cibles du parcours —
 * ni les questions, ni les règles intermédiaires : une seed décrit ce que le
 * produit affiche, pas comment le moteur y arrive.
 */
const CIBLES_SEED = [
  "cible_resultat_medical",
  "cible_transport_sanitaire_prescrit",
  "cible_partie_2_requise",
  "cible_cas_final",
  "cible_document_a_remettre_au_patient",
  // Qui paie, en un mot — l'axe sur lequel se lit une non-conformité : un transport
  // dont le régime n'est pas « assurance maladie » ne doit pas lui être facturé.
  "cible_regime_financement",
  // Article 80 : ce qui distingue deux transports à la charge de l'établissement.
  "cible_article_80_situation_specifique",
  "cible_article_80_permission_sortie_therapeutique",
] as const satisfies readonly Cible[];

export type CibleSeed = (typeof CIBLES_SEED)[number];

/**
 * Attendus déclarés par une seed. Partiel : on n'annonce que ce qui la caractérise —
 * sauf `cible_regime_financement`, que toutes déclarent (cf. `catalogue.ts`).
 */
type AttenduSeed = Partial<Record<CibleSeed, string | boolean>>;

export type Seed = {
  /** Identifiant stable (kebab-case) — cité par les tests, les scripts et la doc. */
  readonly id: string;
  /** Libellé de la galerie : l'écran d'atterrissage, puis ce qu'on y voit. */
  readonly libelle: string;
  /** Pourquoi cette seed existe — ce qu'elle permet de voir ou de verrouiller. */
  readonly description: string;
  /** Écran ouvert par la galerie : résultat médical (P1) ou résultat final (P2). */
  readonly outil: Outil;
  /** Réponses qui distinguent cette seed, surchargées sur `BASE_NEUTRE`. */
  readonly entrees: SituationTypee;
  readonly attendu: AttenduSeed;
};

/** Situation publicodes complète de la seed : base neutre + ses entrées. */
export function situationDe(seed: Seed): Situation<string> {
  return { ...BASE_NEUTRE, ...seed.entrees };
}

type EcartSeed = {
  readonly cible: CibleSeed;
  readonly attendu: string | boolean;
  readonly obtenu: unknown;
};

export type EvaluationSeed = {
  /** Valeur rendue par le moteur pour chaque cible. */
  readonly valeurs: Record<CibleSeed, unknown>;
  /** Cibles laissées indécises par la situation — toujours vide si la base neutre suffit. */
  readonly manquantes: readonly CibleSeed[];
  /** Attendus démentis par le moteur. Vide = seed conforme. */
  readonly ecarts: readonly EcartSeed[];
};

/**
 * Évalue une seed et confronte le moteur à ses attendus.
 *
 * Le moteur est passé en paramètre plutôt que construit ici : le front en a un
 * seul (`front/simulateur/moteur.ts`, qui peut porter les règles du labo) et les
 * tests le fabriquent depuis le disque.
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
