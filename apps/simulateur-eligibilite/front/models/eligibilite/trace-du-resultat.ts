// La trace du résultat : ce que les textes de R2 lisent (D-111). Une fonction
// pure des réponses et des cibles, sans React.
//
// Elle suit le « Contrat de trace » du README de l'éditeur, moins ce que nous
// ne portons pas : la version du paquet, l'empreinte du modèle et la révision
// (D-104 : une simulation se fait en une fois, sur le modèle chargé à
// l'ouverture). Un fait inconnu est une clé absente, jamais un « non ».

import {
  type Answers,
  pagesOf,
  type Validated,
  validatedQuestions,
} from "../../socle";
import type { Cibles } from "./declarations/cibles";
import type { Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";
import {
  type Precisions,
  precisionsDuResultat,
} from "./precisions-du-resultat";
import { faits } from "./preconisation";
import { PARTS } from "./questionnaire";

/** Ce que les textes de R2 lisent, pour des réponses et leurs cibles. */
export type Trace = {
  readonly cibles: Cibles;
  /** Les faits tels que les réponses les établissent. */
  readonly faits: Faits;
  /**
   * Les numéros de Q1.2 réellement choisis, tels que les réponses les disent.
   * Vide si Q1.2 ne s'est pas posée (Q1.1 prouve alors qu'elle ne s'applique
   * pas). Jamais refaits depuis `fait_critere_tap`, qui les regroupe.
   */
  readonly criteres: readonly number[];
  /** La réponse à Q2.8.5, si elle est validée. */
  readonly permissionRepeated?: boolean;
  /**
   * Une partie terrestre d'un trajet en ligne régulière est prouvée. Aucune
   * question ne la pose : Q2.3.2 dit la ligne régulière, pas ce qui l'entoure.
   * La clé reste donc absente.
   */
  readonly partieTerrestre?: true;
  readonly precisions: Precisions;
};

/** La trace de ces réponses : elle relit les questions qui se posent encore. */
export function traceDuResultat(
  answers: Answers<Questions>,
  cibles: Cibles,
): Trace {
  const validated = validatedQuestions(
    pagesOf(PARTS),
    answers,
  ) as Validated<Questions>;
  const repetee = validated["Q2.8.5"]?.answer;
  return {
    cibles,
    faits: faits(answers, validated),
    criteres: (validated["Q1.2"]?.answer ?? []).map(numeroDuCritere),
    ...(repetee && { permissionRepeated: repetee === "1_OUI" }),
    precisions: precisionsDuResultat(validated),
  };
}

// Le numéro de l'option au catalogue, que porte son identifiant (D-75).
function numeroDuCritere(option: string): number {
  return Number.parseInt(option, 10);
}
