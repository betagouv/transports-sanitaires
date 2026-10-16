// Le transfert et l'article 80 : quand Q2.5 et Q2.6 se posent, et les faits
// que leurs pages établissent (D-106).
//
// Chaque fait suit `CONTRAT_REPONSES_FAITS.json` et `CONTRAT_NEGATIONS_PROUVEES.json`
// du paquet de l'éditeur. Sans Q2.6 validée, les huit exceptions restent
// absentes. Une exception proposée vaut « oui » cochée, « non » sinon. Une
// exception qui ne s'est pas proposée prend un prédicat structurel, tracé dans
// sa provenance. Ces fonctions ne lisent que les questions validées.

import { answerAbsent, type Validated } from "../../socle";
import type { Fait } from "../../socle/decision-engine/publicodes";
import type { Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";
import { sortieVersLaPrison } from "./retour-penitentiaire";

type Valides = Validated<Questions>;
type Exception = Questions["Q2.6"][number];
type TypeDuTransfert = Questions["Q2.6.a"];

/**
 * Q2.5 se pose-t-elle ? Q2.1 dit un transfert, ou Q2.2.1.a écarte la
 * permission : un déplacement pendant l'hospitalisation, au type à préciser.
 * Une sortie définitive vers la prison n'en est pas un (TS1012-04).
 */
export function transfertAPoser(validated: Valides): boolean {
  return (
    (validated["Q2.1"]?.answer === "9_TRANSFERT" ||
      validated["Q2.2.1.a"]?.answer === "2_NON") &&
    !sortieVersLaPrison(validated)
  );
}

/** Q2.5 dit-elle un transfert entre établissements ? Q2.6.a se pose alors. */
export function typeAPoser(validated: Valides): boolean {
  return validated["Q2.5"]?.answer === "1_TRANSFERT";
}

/**
 * Le champ I de l'article 80 est-il ouvert ? Un transfert, un autre
 * déplacement pendant un séjour coché, ou une admission en HAD que Q2.1.g
 * établit : Q2.6 se pose alors.
 */
export function champIOuvert(validated: Valides): boolean {
  const deplacement = validated["Q2.5"]?.answer;
  return (
    deplacement === "1_TRANSFERT" ||
    (deplacement === "2_AUTRE_DEPLACEMENT" && sejourCoche(validated)) ||
    admissionHad(validated)
  );
}

/**
 * Une exception de Q2.6 se propose-t-elle ? `type` est la réponse en cours de
 * Q2.6.a, sur la page. Q2.6 s'ouvre directement, sans Q2.5, pour une admission
 * en HAD : les options 2, 3 et 8 ne s'y proposent pas.
 */
export function exceptionAProposer(
  exception: Exception,
  type: TypeDuTransfert | undefined,
  validated: Valides,
): boolean {
  const transfert = typeAPoser(validated);
  switch (exception) {
    case "2_ADMISSION_SANS_SEJOUR":
      return transfert && type === "1_DEFINITIF" && !sejourCoche(validated);
    case "3_CENTRE_QUINZE":
      return transfert;
    case "4_AIR_MER":
      return validated["Q2.3.2"]?.answer !== true;
    case "8_RADIOTHERAPIE":
      return (
        (transfert && type === "2_PROVISOIRE") ||
        validated["Q2.5"]?.answer === "2_AUTRE_DEPLACEMENT"
      );
    default:
      return true;
  }
}

/** Les faits que les pages du transfert et des exceptions établissent. */
export function faitsDuTransfert(validated: Valides): Partial<Faits> {
  return {
    ...faitsDeQ25(validated),
    ...faitsDeLAdmissionHad(validated),
    ...faitsDesExceptions(validated),
    ...faitsDuCentre15(validated),
  };
}

// ---- implémentation ----

/** Le séjour est-il coché en Q2.2.1 (« déjà hospitalisé ») ? */
function sejourCoche(validated: Valides): boolean {
  return validated["Q2.2.1"]?.answer?.includes("1_HOSPITALISATION") ?? false;
}

// Le fait de chaque exception. L'option 3 n'en a pas : elle établit le
// Centre 15, et « Aucune » n'établit rien.
const FAIT_DE_L_EXCEPTION: Record<
  Exclude<Exception, "3_CENTRE_QUINZE" | "11_AUCUNE">,
  keyof Faits
> = {
  "2_ADMISSION_SANS_SEJOUR": "fait_exception_article80_admission_sans_sejour",
  "4_AIR_MER": "fait_exception_article80_air_mer",
  "5_HAD": "fait_exception_article80_had_intercurrent",
  "6_USLD": "fait_exception_article80_usld",
  "7_EHPAD": "fait_exception_article80_ehpad",
  "8_RADIOTHERAPIE": "fait_exception_article80_radiotherapie",
  "9_DIALYSE_A_DOMICILE": "fait_exception_article80_dialyse_domicile",
  "10_ADMISSION_HAD": "fait_exception_article80_admission_had",
};

function oui(provenance: string): Fait {
  return { value: true, provenance };
}

function non(provenance: string): Fait {
  return { value: false, provenance };
}

function absent(provenance: string): Fait {
  return { provenance };
}

// Q2.1.g établit une admission en HAD à domicile : Q2.6 s'ouvre sans Q2.5.
function admissionHad(validated: Valides): boolean {
  return validated["Q2.1.g"]?.answer === "3_ADMISSION_HAD";
}

// Q2.6 est-elle validée ? Ses options proposées, et ce qui y est coché.
function exceptionsValidees(validated: Valides) {
  const { offered = [], answer } = validated["Q2.6"] ?? {};
  if (answerAbsent(answer)) return undefined;
  return { offered, cochees: answer };
}

// Un transfert depuis les urgences n'établit pas de séjour : seul le séjour
// coché le fait. Le centre 15 attend Q2.6, et écrase le « non » de Q2.2.1.
function faitsDeQ25(validated: Valides): Partial<Faits> {
  const reponse = validated["Q2.5"]?.answer;
  if (reponse === "1_TRANSFERT") return faitsDuTransfertEntreEtablissements();
  if (reponse !== "2_AUTRE_DEPLACEMENT") return {};
  const source = "Q2.5 : « 2_AUTRE_DEPLACEMENT ».";
  return {
    fait_centre15_interetablissements: non(
      `${source} Ce n'est pas un transfert entre établissements.`,
    ),
    fait_hospitalisation: oui(source),
    ...(exceptionsValidees(validated) && {
      fait_transfert_article80: oui(
        "Q2.5 et Q2.6 : déplacement provisoire pendant le séjour.",
      ),
    }),
  };
}

function faitsDuTransfertEntreEtablissements(): Partial<Faits> {
  return {
    fait_transfert_article80: oui("Q2.5 : « 1_TRANSFERT »."),
    fait_centre15_interetablissements: absent(
      "Q2.5 : transfert entre établissements ; Q2.6 dira si le Centre 15 l'a demandé.",
    ),
  };
}

// Le séjour coché prouve l'hospitalisation d'un transfert.
function faitsDuSejourDuTransfert(validated: Valides): Partial<Faits> {
  if (!typeAPoser(validated) || !sejourCoche(validated)) return {};
  return {
    fait_hospitalisation: oui("Q2.2.1 : séjour coché, Q2.5 : « 1_TRANSFERT »."),
  };
}

// Q2.6 validée pour une admission en HAD : le champ I est établi.
function faitsDeLAdmissionHad(validated: Valides): Partial<Faits> {
  return {
    ...faitsDuSejourDuTransfert(validated),
    ...(admissionHad(validated) &&
      exceptionsValidees(validated) && {
        fait_transfert_article80: oui(
          "Q2.1.g : « 3_ADMISSION_HAD », Q2.6 validée.",
        ),
      }),
  };
}

// Les huit exceptions, toutes définies une fois Q2.6 validée.
function faitsDesExceptions(validated: Valides): Partial<Faits> {
  const reponse = exceptionsValidees(validated);
  if (!reponse) return {};
  return Object.fromEntries(
    Object.entries(FAIT_DE_L_EXCEPTION).map(([exception, fait]) => [
      fait,
      faitDeLException(
        exception as keyof typeof FAIT_DE_L_EXCEPTION,
        validated,
      ),
    ]),
  );
}

function faitDeLException(
  exception: keyof typeof FAIT_DE_L_EXCEPTION,
  validated: Valides,
): Fait {
  const { offered = [], answer = [] } = validated["Q2.6"] ?? {};
  if (!offered.includes(exception)) return structurel(exception, validated);
  return answer.includes(exception)
    ? oui(`Q2.6 : « ${exception} » cochée.`)
    : non(`Q2.6 : « ${exception} » proposée, non cochée.`);
}

// Ce qu'une exception vaut quand Q2.6 ne l'a pas proposée.
function structurel(
  exception: keyof typeof FAIT_DE_L_EXCEPTION,
  validated: Valides,
): Fait {
  switch (exception) {
    case "2_ADMISSION_SANS_SEJOUR":
      return non(
        `Q2.6 : « ${exception} » ne s'est pas proposée : ${raisonSansAdmission(validated)}.`,
      );
    case "4_AIR_MER":
      return oui("Q2.3.2 : ligne régulière, réutilisée sans revote.");
    case "8_RADIOTHERAPIE":
      return non(
        `Q2.6 : « ${exception} » ne s'est pas proposée : ${raisonSansRadiotherapie(validated)}.`,
      );
    default:
      return absent(`Q2.6 : « ${exception} » ne s'est pas proposée.`);
  }
}

function raisonSansAdmission(validated: Valides): string {
  if (sejourCoche(validated)) return "un séjour initial est coché en Q2.2.1";
  if (validated["Q2.5"]?.answer === "2_AUTRE_DEPLACEMENT")
    return "Q2.5 : autre déplacement, pas un transfert";
  if (validated["Q2.6.a"]?.answer === "2_PROVISOIRE")
    return "Q2.6.a : transfert provisoire, avec retour à l'établissement d'origine";
  return "une admission en HAD n'est pas un transfert entre établissements";
}

function raisonSansRadiotherapie(validated: Valides): string {
  return validated["Q2.6.a"]?.answer === "1_DEFINITIF"
    ? "Q2.6.a : transfert définitif"
    : "une admission en HAD n'est pas un transfert provisoire";
}

// L'option 3 : le Centre 15 a-t-il demandé le transport ? Non proposée, les
// deux faits restent comme ils étaient.
function faitsDuCentre15(validated: Valides): Partial<Faits> {
  const reponse = exceptionsValidees(validated);
  if (!reponse?.offered.includes("3_CENTRE_QUINZE")) return {};
  const centre15 = reponse.cochees.includes("3_CENTRE_QUINZE")
    ? oui("Q2.6 : « 3_CENTRE_QUINZE » cochée.")
    : non("Q2.6 : « 3_CENTRE_QUINZE » proposée, non cochée.");
  return {
    fait_centre15_interetablissements: centre15,
    fait_appel_centre15: centre15,
  };
}
