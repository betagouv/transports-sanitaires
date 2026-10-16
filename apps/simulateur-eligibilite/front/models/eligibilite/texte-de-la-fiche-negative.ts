// Le texte de la fiche patient négative (#134), pour `ISSUE_NON_ELIGIBLE`.
// Une fonction pure, sans React.
//
// Tous les mots viennent du catalogue de l'éditeur, recopiés tels quels. Ce
// fichier choisit la raison, puis range les textes de la fiche : il n'en écrit
// aucun. Le conseil sur l'ALD ne vient que si l'ALD est établie (#134) : le
// catalogue ne dit pas quand l'afficher.

import type {
  CatalogueResultats,
  IssueNegative,
} from "./declarations/catalogue-resultats";
import { raisonNonEligible } from "./raison-non-eligible";
import type { Trace } from "./trace-du-resultat";

type Bloc = IssueNegative["finance"];

/** La fiche patient négative, et le titre que le prescripteur lit au-dessus. */
export type TexteDeLaFicheNegative = {
  readonly titreDuPrescripteur: string;
  readonly titreDuPatient: string;
  readonly raison: string;
  readonly introDesCartes: Bloc;
  readonly cartes: readonly Bloc[];
  readonly consignes: {
    readonly titre: string;
    /** Absent quand le catalogue le laisse vide. */
    readonly sousTitre?: string;
    readonly texte: string;
    readonly etapes: readonly string[];
  };
  /** Absent tant que la trace n'établit pas l'ALD. */
  readonly conseilAld?: string;
  readonly finance: Bloc;
};

/** Le texte de la fiche négative pour cette trace. */
export function texteDeLaFicheNegative(
  catalogue: CatalogueResultats,
  trace: Trace,
): TexteDeLaFicheNegative {
  const issue = catalogue.issues.ISSUE_NON_ELIGIBLE;
  const { intro, body, steps } = issue.instructions;
  return {
    titreDuPrescripteur: issue.prescriberTitle,
    titreDuPatient: issue.title,
    raison: raisonNonEligible(issue, trace).text,
    introDesCartes: issue.cardIntro,
    cartes: issue.fixedCards,
    consignes: {
      titre: intro.title,
      ...(intro.subtitle !== "" && { sousTitre: intro.subtitle }),
      texte: body,
      etapes: steps,
    },
    ...(trace.precisions.aldRecognized === true && {
      conseilAld: issue.aldAdvice,
    }),
    finance: issue.finance,
  };
}
