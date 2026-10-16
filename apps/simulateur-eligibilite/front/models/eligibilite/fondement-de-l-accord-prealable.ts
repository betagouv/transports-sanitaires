// Ce que dit la fiche d'une demande d'accord préalable (#136) : la raison que
// lit le patient, le motif que reprend le modus, et le rappel d'attente. Des
// fonctions pures de la trace, sans React.
//
// Les mots viennent du catalogue de l'éditeur. La raison suit la page
// « Éligibilité » : le contexte du soin, puis la convocation et la permission
// quand elles sont qualifiées, puis la justification de l'accord préalable,
// séparés par un espace. Un code n'est posé que si la cible qui le prouve vaut
// « oui » : rien n'est jamais déduit. Sans justification pour les motifs
// établis, la phrase manque : rien n'est inventé à la place.

import {
  avecLeLexique,
  codesDeContexte,
  texteDuCodeExact,
} from "./contexte-du-resultat";
import type {
  CatalogueResultats,
  IssuePositive,
} from "./declarations/catalogue-resultats";
import type { Cibles } from "./declarations/cibles";
import type { Trace } from "./trace-du-resultat";

/** Pourquoi le transport demande un accord, et le motif que reprend le modus. */
export type FondementDeLAccord = {
  readonly raison: string | undefined;
  readonly motif: string | undefined;
};

/** Les codes des motifs d'accord préalable établis, dans l'ordre L, S, V, C, N. */
export function codesDeLAccord(cibles: Cibles): readonly string[] {
  return MOTIFS.filter(([, cible]) => cibles[cible] === true).map(
    ([code]) => code,
  );
}

/** La raison et le motif de cette issue d'accord préalable pour cette trace. */
export function fondementDeLAccord(
  issue: IssuePositive,
  trace: Trace,
): FondementDeLAccord {
  return {
    raison: raisonDeLAccord(issue, trace),
    motif: motifDeLAccord(issue, trace),
  };
}

/**
 * Le rappel d'attente : le texte de l'issue sans urgence quand les règles
 * disent d'attendre l'accord, celui de l'urgence attestée quand elles disent
 * de ne pas attendre. Sans réponse des règles, aucun rappel.
 */
export function rappelDAttente(
  catalogue: CatalogueResultats,
  cibles: Cibles,
): string | undefined {
  const { ISSUE_DAP_SANS_URGENCE, ISSUE_DAP_URGENCE_ATTESTEE } =
    catalogue.issues;
  if (cibles.cible_attente_accord === true) {
    return ISSUE_DAP_SANS_URGENCE.blueReminder ?? undefined;
  }
  if (cibles.cible_attente_accord === false) {
    return ISSUE_DAP_URGENCE_ATTESTEE.blueReminder ?? undefined;
  }
  return undefined;
}

// ---- implémentation ----

// Chaque code de motif, et la cible qui le prouve.
const MOTIFS = [
  ["L", "cible_dap_motif_longue_distance"],
  ["S", "cible_dap_motif_serie"],
  ["V", "cible_dap_motif_avion_bateau"],
  ["C", "cible_dap_motif_camsp_cmpp"],
  ["N", "cible_dap_motif_engagement_maternite"],
] as const satisfies readonly (readonly [string, keyof Cibles])[];

const SANS_COMPLEMENT = "un transport";

// Le contexte (vide sans aucun code), la convocation, la permission, puis la
// justification. Les composantes vides disparaissent.
function raisonDeLAccord(issue: IssuePositive, trace: Trace) {
  const contexte = texteDuCodeExact(
    issue.contexts,
    codesDeContexte(trace.cibles),
  );
  const justification = texteDuCodeExact(
    issue.dapPhrases,
    codesDeLAccord(trace.cibles),
  );
  const raison = [
    contexte,
    ...complements(issue.contextExtras, trace),
    justification,
  ]
    .filter((texte) => texte)
    .join(" ");
  return raison === "" ? undefined : avecLeLexique(issue, trace, raison);
}

// La base du contexte, puis les clauses : convocation, permission, motifs
// d'accord. Après « un transport » seul, un espace ; après une base détaillée,
// une virgule.
function motifDeLAccord(issue: IssuePositive, trace: Trace) {
  const codes = codesDeContexte(trace.cibles);
  const base = texteDuCodeExact(issue.administrativeBases, codes);
  if (base === undefined) return undefined;
  const clauses = [
    ...complements(issue.administrativeExtras, trace),
    texteDuCodeExact(issue.administrativeDap, codesDeLAccord(trace.cibles)),
  ].filter((clause): clause is string => !!clause);
  const separateur = base === SANS_COMPLEMENT ? " " : ", ";
  const motif =
    clauses.length === 0 ? base : `${base}${separateur}${relier(clauses)}`;
  return avecLeLexique(issue, trace, motif);
}

// Les textes de la convocation (K) et de la permission (P) quand les faits
// les qualifient. Une permission de mineur admissible est la seule qui compte.
function complements(
  extras: IssuePositive["contextExtras"],
  trace: Trace,
): string[] {
  const {
    fait_convocation,
    fait_permission,
    fait_permission_mineur_admissible,
  } = trace.faits;
  const qualifies = {
    K: fait_convocation.value === true,
    P:
      fait_permission.value === true &&
      fait_permission_mineur_admissible.value === true,
  };
  return extras
    .filter(({ code }) => qualifies[code as keyof typeof qualifies])
    .map(({ text }) => text);
}

// Une clause telle quelle, deux reliées par « et », au-delà des virgules et un
// dernier « et ».
function relier(clauses: readonly string[]): string {
  if (clauses.length <= 2) return clauses.join(" et ");
  return `${clauses.slice(0, -1).join(", ")} et ${clauses.at(-1)}`;
}
