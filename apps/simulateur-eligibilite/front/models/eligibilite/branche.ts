// La page de branche, dernière de P2 : quand ses questions se posent, et les
// faits qu'elle établit (Q2.12, Q2.13, Q2.14).
//
// Une question de branche ne se pose que si sa réponse peut changer l'issue.
// L'éditeur ne donne pas de variable de décisivité pour Q2.13 ni pour Q2.14 :
// la condition est la plus étroite que ses règles permettent. Elle lit les faits
// des pages précédentes, jamais ceux de la branche. Ces fonctions ne lisent que
// les questions validées.

import type { Validated } from "../../socle";
import type { Fait } from "../../socle/decision-engine/publicodes";
import { AUCUN_FAIT, type Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";
import { cible } from "./evaluation-des-regles";
import { faitsAvantLaBranche } from "./faits-avant-la-branche";

type Valides = Validated<Questions>;

/**
 * Q2.13 (le départ) se pose-t-elle ? Une entrée en établissement de santé qui
 * laisse `fait_transfert_article80` absent envoie à la caisse : la nature du
 * départ dit si l'entrée est simple.
 */
export function departAPoser(validated: Valides): boolean {
  if (validated["Q2.1.g"]?.answer !== "1_ENTREE") return false;
  const faits = faitsAvantLaBranche(validated);
  return (
    faits.fait_hospitalisation.value === true &&
    faits.fait_transfert_article80.value === undefined &&
    brancheDecisive(faits)
  );
}

/**
 * Q2.14.2 (le rattachement d'un HTNM) se pose-t-elle ? Q2.2.1.b déclare un
 * HTNM, dont le rattachement à l'Engagement maternité reste inconnu.
 */
export function rattachementAPoser(validated: Valides): boolean {
  return (
    (validated["Q2.2.1.b"]?.answer?.includes("5_HTNM") ?? false) &&
    brancheDecisive(faitsAvantLaBranche(validated))
  );
}

/**
 * Q2.14.1 (le dispositif établi) se pose-t-elle ? Q2.1 dit la maternité,
 * Q2.2.1.b la signale, ou le HTNM se dit dans l'Engagement maternité.
 */
export function dispositifAPoser(validated: Valides): boolean {
  const signalee =
    validated["Q2.1"]?.answer === "13_MATERNITE" ||
    (validated["Q2.2.1.b"]?.answer?.includes("4_MATERNITE_ELOIGNEE") ??
      false) ||
    validated["Q2.14.2"]?.answer === "1_DANS_L_ENGAGEMENT";
  return signalee && brancheDecisive(faitsAvantLaBranche(validated));
}

/**
 * Q2.12 se pose-t-elle ? C'est la garde de l'éditeur pour l'urgence,
 * `cible_question_urgence_a_afficher`, lue sur tous les faits de P2, ceux de la
 * branche compris. Une condition que la branche vient d'établir (le dispositif
 * maternité) dévoile alors la question que la page du trajet avait masquée.
 * Sans réponse à Q2.3.4 : l'urgence ne se redemande jamais.
 */
export function urgenceDevoilee(validated: Valides): boolean {
  if (validated["Q2.3.4"] !== undefined) return false;
  const faits = {
    ...faitsAvantLaBranche(validated),
    ...faitsDeLaBranche(validated),
    // La garde ne lit pas l'urgence : sa propre réponse ne doit pas la retirer.
    fait_urgence_attestee: AUCUN_FAIT.fait_urgence_attestee,
    fait_urgence_repondue: AUCUN_FAIT.fait_urgence_repondue,
  };
  return cible(faits, "cible_question_urgence_a_afficher") === true;
}

/** Les faits que la page de branche établit, hors l'urgence de Q2.12. */
export function faitsDeLaBranche(validated: Valides): Partial<Faits> {
  return {
    ...faitsDuDepart(validated),
    ...faitsDuRattachement(validated),
    ...faitsDuDispositif(validated),
  };
}

// ---- implémentation ----

// Les départs d'une entrée simple : hors du champ du I de D.162-17. Les trois
// autres (établissement, EHPAD, USLD) ouvrent le transfert ; un autre lieu ne
// se qualifie pas sur une description libre. Le fait reste alors absent.
const DEPARTS_D_UNE_ENTREE_SIMPLE: readonly string[] = [
  "1_DOMICILE",
  "5_HEBERGEMENT_NON_MEDICALISE",
  "6_ETABLISSEMENT_PENITENTIAIRE",
];

function oui(provenance: string): Fait {
  return { value: true, provenance };
}

function non(provenance: string): Fait {
  return { value: false, provenance };
}

// Le trajet a-t-il quelque chose à décider, une fois les pages précédentes
// posées ? Le mode se tient, et aucune orientation prioritaire n'est établie :
// ni l'exclusion du transport, ni un transfert, une permission à charge du
// patient, une pension ou un point à la caisse.
function brancheDecisive(faits: Faits): boolean {
  return (
    cible(faits, "cible_mode_coherent") === true &&
    cible(faits, "cible_orientation_sans_urgence_deja_etablie") !== true
  );
}

function faitsDuDepart(validated: Valides): Partial<Faits> {
  const depart = validated["Q2.13.depart"]?.answer;
  if (depart === undefined || !DEPARTS_D_UNE_ENTREE_SIMPLE.includes(depart))
    return {};
  return {
    fait_transfert_article80: non(
      `Q2.13 : « ${depart} » ; une entrée simple est hors du champ du I de D.162-17.`,
    ),
    fait_centre15_interetablissements: non(
      `Q2.13 : « ${depart} » ; aucun transfert entre établissements.`,
    ),
  };
}

// Dans l'Engagement maternité, le HTNM n'est pas hors du dispositif. Hors de
// l'Engagement, il va à la caisse : son segment n'est pas vérifié.
function faitsDuRattachement(validated: Valides): Partial<Faits> {
  const rattachement = validated["Q2.14.2"]?.answer;
  if (rattachement === "1_DANS_L_ENGAGEMENT") {
    return {
      fait_htnm_hors_maternite: non(`Q2.14.2 : « ${rattachement} ».`),
    };
  }
  if (rattachement !== "2_HORS_ENGAGEMENT") return {};
  const source = `Q2.14.2 : « ${rattachement} ».`;
  return {
    fait_htnm_hors_maternite: oui(source),
    fait_htnm_segment_verifie: non(
      `${source} Le segment du HTNM hors Engagement n'est pas vérifié.`,
    ),
  };
}

// Le dispositif établi confirme l'admission, et le rattachement du séjour à
// l'Engagement. Refusé, il écarte l'admission.
function faitsDuDispositif(validated: Valides): Partial<Faits> {
  const dispositif = validated["Q2.14.1"]?.answer;
  const source = `Q2.14.1 : « ${dispositif} ».`;
  if (dispositif === "1_OUI") {
    return {
      fait_dap_maternite: oui(source),
      fait_htnm_hors_maternite: non(
        `${source} Le rattachement à l'Engagement maternité est établi.`,
      ),
    };
  }
  if (dispositif !== "2_NON") return {};
  return { fait_dap_maternite: non(source) };
}
