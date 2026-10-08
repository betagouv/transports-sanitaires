// Ce que le socle attend d'une version du modèle : ses questions, ce qui
// calcule la préconisation, et ses deux résultats.
//
// Le socle déroule le parcours et ne lit aucune clé du modèle. Il transporte les
// réponses, les faits et les cibles de l'un à l'autre.

import type { ComponentType } from "react";
import type { FieldMapping } from "./cerfa/field-mapping";
import type {
  Answers,
  AnyCibles,
  AnyQuestions,
  QuestionnairePart,
} from "./questionnaire-engine/question";
import type { Seed } from "./seeds/seed";

/** Les faits d'un modèle : ce que ses règles reçoivent. */
export type AnyFaits = Readonly<Record<string, unknown>>;

/** Ce que la préconisation a calculé pour des réponses. */
export type Preconisation = { faits: AnyFaits; cibles: AnyCibles };

/** Ce qu'un résultat reçoit pour s'afficher. */
type ResultatProps<Questions extends AnyQuestions, Cibles> = {
  answers: Answers<Questions>;
  cibles: Cibles;
};

/** Le cerfa d'une préconisation : son gabarit, et ce qu'on y écrit. */
type CerfaForm<Questions extends AnyQuestions, Cibles> = {
  template: string;
  mapping: FieldMapping<
    ResultatProps<Questions, Cibles> & { completedAt: Date }
  >;
};

export type Model<
  Questions extends AnyQuestions = AnyQuestions,
  Faits extends AnyFaits = AnyFaits,
  Cibles extends AnyCibles = AnyCibles,
> = {
  /** Ce qui calcule la préconisation : des réponses aux faits, puis aux cibles. */
  preconisation: {
    faits: (answers: Answers<Questions>) => Faits;
    cibles: (faits: Faits) => Cibles;
  };
  /** Le premier résultat, après ses parties : transport et éligibilité. */
  transportAndEligibility: {
    parts: readonly QuestionnairePart<Questions, undefined>[];
    title: string;
    Resultat: ComponentType<ResultatProps<Questions, Cibles>>;
    printLabel: string;
  };
  /** Le second résultat, après le verrou : le cerfa. */
  cerfa: {
    part: QuestionnairePart<Questions, Cibles>;
    /** Le cerfa de cette préconisation. `null` : rien ne suit le premier résultat. */
    form: (cibles: Cibles) => CerfaForm<Questions, Cibles> | null;
    title: string;
    Resultat: ComponentType<ResultatProps<Questions, Cibles>>;
    /** Le libellé de l'action qui verrouille. */
    startLabel: string;
    downloadLabel: string;
  };
  /** Le catalogue des seeds, chargé à la demande. */
  seeds: () => Promise<readonly Seed<Questions, Cibles>[]>;
};

/**
 * Vérifie un modèle contre ses propres types, puis le rend tel que le socle le
 * voit : sans nom de question, de fait ni de cible.
 */
export function defineModel<
  Questions extends AnyQuestions,
  Faits extends AnyFaits,
  Cibles extends AnyCibles,
>(model: Model<Questions, Faits, Cibles>): Model {
  // Le socle ne lit aucune clé : il rend au modèle ce que le modèle lui a
  // donné. L'effacement des types est donc sans risque, et il n'a lieu qu'ici.
  return model as unknown as Model;
}

/** La préconisation de ces réponses : leurs faits, puis leurs cibles. */
export function preconisationOf(model: Model, answers: Answers): Preconisation {
  const faits = model.preconisation.faits(answers);
  return { faits, cibles: model.preconisation.cibles(faits) };
}
