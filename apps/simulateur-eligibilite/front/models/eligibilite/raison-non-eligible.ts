// La raison de la fiche patient négative (#134) : celle des textes de
// `ISSUE_NON_ELIGIBLE` que la trace prouve. Une fonction pure, sans React.
//
// Le catalogue de l'éditeur donne à chaque raison une `condition` en mots, une
// `priority` et la cible `reason` dont elle explique le code. La plus haute
// `priority` gagne ; `AUCUN_GENERIQUE` ne sert que de repli. Une raison
// inactive n'est jamais prise.
//
// Une condition n'est vraie que si la trace la PROUVE. Un fait absent n'est
// jamais « non » : le test est toujours `=== false`, `=== true` ou une
// précision présente. « Je ne peux pas préciser » (Q1.3.a) n'est jamais
// « Non ». Cinq raisons ne se prouvent par aucune de nos réponses (voir la
// table) : leur condition est codée, elle ne devient jamais vraie, et la
// raison n'est donc jamais choisie.

import type { IssueNegative } from "./declarations/catalogue-resultats";
import type { Trace } from "./trace-du-resultat";

/** Une raison du catalogue : son texte, son code, sa priorité. */
export type RaisonNonEligible = IssueNegative["reasons"][number];

/** La raison de la fiche : la plus prioritaire que la trace prouve, ou le repli. */
export function raisonNonEligible(
  issue: IssueNegative,
  trace: Trace,
): RaisonNonEligible {
  const prouvee = issue.reasons
    .filter(
      ({ id, inactive, reason }) =>
        !inactive &&
        reason === codeDeLaRaison(trace) &&
        CONDITIONS[id]?.(trace) === true,
    )
    .sort((a, b) => b.priority - a.priority)[0];
  return prouvee ?? repli(issue);
}

// ---- implémentation ----

type Condition = (trace: Trace) => boolean;

const REPLI = "AUCUN_GENERIQUE";

// Le code de raison des règles. Avec nos réponses, il reste indéfini : sa
// première branche lit `cible_care_status`, que trois faits sans question
// (`fait_exclusion_soin_prouvee`, `fait_prestation_non_couverte_declaree`,
// `fait_preuve_prestation_absente`) laissent indéfini. Ce n'est pas un « non » :
// nous ne les posons pas. Une non-éligibilité sans motif de transport
// (`cible_motif_transport` à « non », la condition même de la règle) vaut alors
// `AUCUN_MOTIF_TRANSPORT`, comme dans la trace de l'éditeur.
function codeDeLaRaison({ cibles }: Trace): string | undefined {
  if (cibles.cible_reason_code != null) return cibles.cible_reason_code;
  const sansMotif =
    cibles.cible_issue_id === "ISSUE_NON_ELIGIBLE" &&
    cibles.cible_motif_transport === false;
  return sansMotif ? "AUCUN_MOTIF_TRANSPORT" : undefined;
}

function repli(issue: IssueNegative): RaisonNonEligible {
  const raison = issue.reasons.find(({ id }) => id === REPLI);
  if (!raison) throw new Error(`Le catalogue n'a pas la raison ${REPLI}.`);
  return raison;
}

// « Aucun autre motif » n'est lu nulle part ici : `cible_reason_code` vaut
// `AUCUN_MOTIF_TRANSPORT` seulement quand les règles n'ont trouvé aucun motif.
function familleDeSoin(numero: number): Condition {
  return ({ precisions }) => precisions.careFamily === numero;
}

// Un séjour réel est prouvé : le texte de la dialyse ne dirait plus le vrai.
function sansSejour({ precisions }: Trace): boolean {
  return !precisions.hospitalisation?.startsWith("H-SEJOUR");
}

function aldConfirmee({ precisions }: Trace): boolean {
  return precisions.aldRecognized === true;
}

function aldLiee(trace: Trace): boolean {
  return aldConfirmee(trace) && trace.precisions.aldRelated === true;
}

// La condition de chaque raison, par son identifiant. Une raison qui n'y est
// pas (les trois inactives) n'est jamais prise.
//
// Jamais prouvées par nos réponses (arbitrages [ÉDITEUR], D-113) :
// AUCUN_ALD_SANS_LIEN, AUCUN_ALD_CADRE_NON_QUALIFIANT, AUCUN_SERIE_NON_QUALIFIANTE,
// AUCUN_AUTRE_DEPLACEMENT et TRANSPORT_EXCLU.
const CONDITIONS: Readonly<Record<string, Condition>> = {
  // « ALD confirmée ; soin sans lien avec cette ALD prouvé ». Q1.3 option 2
  // dit le lien avec l'ALD : `aldRelated` n'est jamais « faux ».
  AUCUN_ALD_SANS_LIEN: (trace) =>
    aldConfirmee(trace) && trace.precisions.aldRelated === false,
  // « Lien établi ; Q1.1/Q1.2 prouve l'absence de déficience ». Avec Q1.3
  // option 2, `fait_ald_liee` ne vaut « non » que si Q1.1 dit « seul ».
  AUCUN_ALD_SANS_DEFICIENCE: (trace) =>
    aldLiee(trace) && trace.faits.fait_ald_liee.value === false,
  // « Réponse prouvée hors fondement 3°/4° ; exception mineur non applicable ».
  // Q1.3 option 2 dit le 100 % : le fondement n'est jamais prouvé « non ».
  AUCUN_ALD_CADRE_NON_QUALIFIANT: (trace) =>
    aldLiee(trace) &&
    trace.faits.fait_ald_exonerante_3_ou_4.value === false &&
    trace.faits.fait_mineur_soins_prolonges_reconnus.value === false,
  AUCUN_DIALYSE_NON_HEMO: (trace) =>
    trace.precisions.dialysisType === "non-hemodialyse" && sansSejour(trace),
  AUCUN_DIALYSE_TYPE_INCONNU: (trace) =>
    trace.precisions.dialysisType === "inconnu" && sansSejour(trace),
  AUCUN_APPAREILLAGE_HORS_CATEGORIES: ({ precisions }) =>
    precisions.deviceCategory === "hors-categories",
  // « Transports répétés effectivement prévus, mais série Q2.3.3 non
  // qualifiante prouvée ». Seul Q2.3.3 « Oui » prouve des transports répétés,
  // et il qualifie la série : les deux ne vont jamais ensemble.
  AUCUN_SERIE_NON_QUALIFIANTE: (trace) =>
    trace.precisions.repeatedTripsPlanned === true &&
    trace.faits.fait_serie_qualifiante.value === false,
  AUCUN_CONSULTATION: familleDeSoin(1),
  AUCUN_SOINS_DENTAIRES_SAGE_FEMME: familleDeSoin(2),
  AUCUN_IMAGERIE: familleDeSoin(3),
  AUCUN_BIOLOGIE: familleDeSoin(4),
  AUCUN_PARAMEDICAL: familleDeSoin(5),
  AUCUN_PSYCHOLOGUE: familleDeSoin(7),
  AUCUN_AUTRE_SOIN: familleDeSoin(14),
  // « Q2.1 = 15 prouvé et finalité clarifiée ». Aucune question ne clarifie la
  // finalité : `eventFinalityClarified` n'est jamais là.
  AUCUN_AUTRE_DEPLACEMENT: (trace) =>
    trace.precisions.careFamily === 15 &&
    trace.precisions.eventFinalityClarified === true,
  // « fait_exclusion_transport_prouvee = oui + règle officielle datée
  // conservée en preuve ». Notre fait vaut toujours « non » (D-111).
  TRANSPORT_EXCLU: (trace) =>
    trace.faits.fait_exclusion_transport_prouvee.value === true &&
    trace.precisions.transportExclusionRule !== undefined,
};
