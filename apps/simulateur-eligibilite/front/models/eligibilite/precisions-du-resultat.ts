// Les précisions éditoriales de la trace : ce que le texte de R2 sait dire en
// plus de l'issue, quand une réponse le prouve (D-111).
//
// Les clés et les valeurs sont celles de l'éditeur (README, « Précisions
// éditoriales utiles »). Une précision qu'aucune réponse ne prouve n'a pas de
// clé : le texte prend alors son repli générique, et rien n'est jamais
// deviné. Ces fonctions ne lisent que les questions validées.

import type { Validated } from "../../socle";
import type { Questions } from "./declarations/questions";

type Valides = Validated<Questions>;

/**
 * Un contexte de scénario du catalogue : les seuls paramètres non nuls que
 * les réponses prouvent. Le `kind` est toujours prouvé ; les autres, quand
 * une réponse les dit.
 */
type Contexte = {
  kind: string;
  duration?: "temporary" | "permanent";
  place?: "same-site";
  extra?: string;
  device?: string;
};

/**
 * Les précisions que les réponses prouvent. Sans réponse qui les prouve : la
 * clé manque. `lineType`, `camspType`, `eventFinalityClarified` et
 * `transportExclusionRule` n'ont aucune question qui les pose : elles restent
 * absentes.
 */
export type Precisions = {
  hospitalisation?: string;
  atmp?: "ATMP";
  lineType?: "avion" | "bateau" | "both";
  camspType?: "CAMSP" | "CMPP";
  careFamily?: number;
  aldRecognized?: boolean;
  aldRelated?: boolean;
  dialysisType?: "non-hemodialyse" | "inconnu";
  deviceCategory?: "hors-categories";
  repeatedTripsPlanned?: boolean;
  eventFinalityClarified?: boolean;
  transportExclusionRule?: {
    reference: string;
    version: string;
    conditionsVerified: true;
  };
  article80Context?: Contexte;
  permissionContext?: Contexte;
  convocationContext?: Contexte;
};

/** Les précisions que ces questions validées prouvent. */
export function precisionsDuResultat(validated: Valides): Precisions {
  return {
    ...cle("hospitalisation", hospitalisation(validated)),
    ...cle("atmp", atmp(validated)),
    ...cle("careFamily", familleDeSoin(validated)),
    ...cle("dialysisType", typeDeDialyse(validated)),
    ...cle("deviceCategory", categorieDAppareil(validated)),
    ...cle("repeatedTripsPlanned", seriePrevue(validated)),
    ...aldDeQ13(validated),
    ...cle("article80Context", contexteDeLArticle80(validated)),
    ...cle("permissionContext", contexteDeLaPermission(validated)),
    ...cle("convocationContext", contexteDeLaConvocation(validated)),
  };
}

// ---- implémentation ----

// Une clé n'existe que si sa valeur est prouvée : jamais `undefined`.
function cle<K extends keyof Precisions>(
  nom: K,
  valeur: Precisions[K],
): Partial<Precisions> {
  return valeur === undefined ? {} : { [nom]: valeur };
}

// La famille de séances retenues, dans l'ordre du lexique : CH, RA, HE. Une
// hémodialyse demande Q1.3.a. Plusieurs séances demandent que Q2.1.f les dise
// vers le même lieu de soins.
function seancesRetenues(validated: Valides): readonly string[] {
  const cas = validated["Q1.3"]?.answer ?? [];
  const seances = [
    cas.includes("3_CHIMIOTHERAPIE") && "CH",
    cas.includes("4_RADIOTHERAPIE") && "RA",
    cas.includes("5_DIALYSE") &&
      validated["Q1.3.a"]?.answer === "1_OUI" &&
      "HE",
  ].filter((seance) => seance !== false);
  const memeDeplacement = validated["Q2.1.f"]?.answer === "1_OUI";
  return seances.length >= 2 && !memeDeplacement ? [] : seances;
}

// Un séjour réel : une entrée ou une sortie d'établissement (Q2.1.g), ou
// « déjà hospitalisé » coché (Q2.2.1). L'admission en HAD à domicile n'en est pas un.
function sejourReel(validated: Valides): boolean {
  const sousType = validated["Q2.1.g"]?.answer;
  return (
    sousType === "1_ENTREE" ||
    sousType === "2_SORTIE" ||
    (validated["Q2.2.1"]?.answer?.includes("1_HOSPITALISATION") ?? false)
  );
}

// L'identifiant du lexique : le séjour ou les séances, puis leurs familles.
function hospitalisation(validated: Valides): string | undefined {
  const seances = seancesRetenues(validated);
  const sejour = sejourReel(validated);
  if (!sejour && seances.length === 0) return undefined;
  return [sejour ? "H-SEJOUR" : "H-SEANCE", ...seances].join("-");
}

// « Accident du travail ou maladie professionnelle » : Q2.2.1.b ne les
// sépare pas, seul l'identifiant commun est prouvé.
function atmp(validated: Valides): "ATMP" | undefined {
  return validated["Q2.2.1.b"]?.answer?.includes("1_ATMP") ? "ATMP" : undefined;
}

// Le numéro de l'option de Q2.1, pour les soins qui ont une phrase de famille.
const FAMILLES_DE_SOIN = [1, 2, 3, 4, 5, 6, 7, 14, 15];

function familleDeSoin(validated: Valides): number | undefined {
  const motif = validated["Q2.1"]?.answer;
  if (motif === undefined) return undefined;
  const numero = Number.parseInt(motif, 10);
  return FAMILLES_DE_SOIN.includes(numero) ? numero : undefined;
}

// Q1.3.a dit une dialyse qui n'est pas de l'hémodialyse, ou ne le dit pas.
function typeDeDialyse(validated: Valides): Precisions["dialysisType"] {
  const reponse = validated["Q1.3.a"]?.answer;
  if (reponse === "2_AUTRE_DIALYSE") return "non-hemodialyse";
  return reponse === "3_NE_SAIT_PAS" ? "inconnu" : undefined;
}

// Q2.10.b : un appareillage qui n'est pas l'un des trois que vise R.322-10 2°.
function categorieDAppareil(validated: Valides): "hors-categories" | undefined {
  return validated["Q2.10.b"]?.answer === "4_AUTRE"
    ? "hors-categories"
    : undefined;
}

// Q2.3.3 « Oui » prouve des transports répétés. « Non » ne dit pas quelle
// condition de la série manque : rien n'en est inféré.
function seriePrevue(validated: Valides): true | undefined {
  return validated["Q2.3.3"]?.answer === "1_OUI" ? true : undefined;
}

// Q1.3 option 2 dit les deux à la fois : l'ALD est reconnue, et les soins de
// ce déplacement y sont liés. Non cochée, elle ne dit rien de l'ALD.
function aldDeQ13(
  validated: Valides,
): Pick<Precisions, "aldRecognized" | "aldRelated"> {
  return validated["Q1.3"]?.answer?.includes("2_ALD")
    ? { aldRecognized: true, aldRelated: true }
    : {};
}

// Q2.5 dit le genre du déplacement, Q2.6.a sa durée. Le même site, l'USLD et
// l'EHPAD n'ont pas de question qui les prouve. Un autre déplacement pendant
// le séjour est provisoire (D-106). L'admission en HAD à domicile prouve le
// genre « had » seul.
function contexteDeLArticle80(validated: Valides): Contexte | undefined {
  const deplacement = validated["Q2.5"]?.answer;
  if (deplacement === "2_AUTRE_DEPLACEMENT")
    return { kind: "inpatient", duration: "temporary" };
  if (deplacement === "1_TRANSFERT") {
    const type = validated["Q2.6.a"]?.answer;
    if (type === "1_DEFINITIF")
      return { kind: "transfer", duration: "permanent" };
    return type === "2_PROVISOIRE"
      ? { kind: "transfer", duration: "temporary" }
      : { kind: "transfer" };
  }
  return validated["Q2.1.g"]?.answer === "3_ADMISSION_HAD"
    ? { kind: "had" }
    : undefined;
}

// Q2.7 option 4 : un transport exceptionnel demandé par écrit par le patient.
function contexteDeLaPermission(validated: Valides): Contexte | undefined {
  return validated["Q2.7"]?.answer === "4_ADULTE_A_SA_CHARGE"
    ? { kind: "adult-explicit" }
    : undefined;
}

const GENRE_DE_CONVOCATION: Partial<Record<Questions["Q2.10"], string>> = {
  "1_CONTROLE_MEDICAL": "control",
  "2_EXPERT_JURIDICTION": "expert",
  "3_AUDIENCE_CONSULTATION": "audience",
  "4_EXPERT_CONTESTATION": "dispute",
  "5_COMMISSION_RECOURS": "commission",
  "6_APPAREILLAGE": "equipment",
};

const APPAREIL: Partial<Record<string, string>> = {
  "1_PROTHESE_OCULAIRE_FACIALE": "prothèse oculaire ou faciale",
  "2_PODO_ORTHESE": "podo-orthèse",
  "3_ORTHOPROTHESE": "orthoprothèse",
};

// Q2.10 dit le genre ; Q2.10.b l'appareil, pour un appareillage seulement.
function contexteDeLaConvocation(validated: Valides): Contexte | undefined {
  const categorie = validated["Q2.10"]?.answer;
  const kind = categorie && GENRE_DE_CONVOCATION[categorie];
  if (!kind) return undefined;
  const device = APPAREIL[validated["Q2.10.b"]?.answer ?? ""];
  return categorie === "6_APPAREILLAGE" && device ? { kind, device } : { kind };
}
