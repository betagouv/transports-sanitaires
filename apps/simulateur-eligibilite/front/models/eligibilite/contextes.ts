// Les contextes du trajet : les situations particulières de Q2.2.1, et leurs
// précisions sur la même page, la permission (Q2.2.1.a), l'autre cadre
// (Q2.2.1.b) et l'étranger (Q2.2.5).
//
// Chaque fait suit `CONTRAT_REPONSES_FAITS.json` et `CONTRAT_NEGATIONS_PROUVEES.json`
// du paquet de l'éditeur. Une situation proposée et écartée vaut « non ». Une
// situation qui ne se propose pas laisse son fait absent, et un groupe coché
// n'établit rien avant sa précision. Ils ne lisent que les questions validées.

import { answerAbsent, type Validated } from "../../socle";
import type { Fait } from "../../socle/decision-engine/publicodes";
import type { Faits } from "./declarations/faits";
import { OPTIONS, type Questions } from "./declarations/questions";

type Valides = Validated<Questions>;
type Motif = Questions["Q2.1"];
type Contexte = Questions["Q2.2.1.b"][number];

/**
 * Le groupe « déjà hospitalisé » se propose-t-il ? Ni une permission déjà
 * indiquée en Q2.1, ni une entrée en hospitalisation ne le laissent (D-98).
 * Coché, il n'établit pas l'hospitalisation : il inclut la HAD (TS1012-02).
 */
export function sejourAProposer(validated: Valides): boolean {
  return (
    validated["Q2.1"]?.answer !== "11_PERMISSION" &&
    validated["Q2.1.g"]?.answer !== "1_ENTREE"
  );
}

/**
 * Les situations de l'autre cadre qui se proposent, en Q2.2.1.b comme dans
 * l'aide de Q2.2.1. Une situation déjà indiquée en Q2.1 en est retirée (D-98).
 */
export function contextesAProposer(validated: Valides): readonly Contexte[] {
  const motif = validated["Q2.1"]?.answer;
  const retires = (motif && RETIRES_PAR_Q21[motif]) || [];
  return CONTEXTES.filter((contexte) => !retires.includes(contexte));
}

/** Les faits que la page des contextes établit. Absents : rien n'y figure. */
export function faitsDesContextes(validated: Valides): Partial<Faits> {
  if (answerAbsent(validated["Q2.2.1"]?.answer)) return {};
  return {
    ...faitsDuSejour(validated),
    ...faitsDeLEtranger(validated),
    ...faitsDuCadre(validated),
  };
}

// ---- implémentation ----

const CONTEXTES = Object.keys(OPTIONS["Q2.2.1.b"]) as Contexte[];

// Les situations que Q2.1 indique déjà. Elles sont retirées sans rappel
// (TS1012-01). Le groupe « déjà hospitalisé », que la permission retire, se lit
// dans `sejourAProposer`.
const RETIRES_PAR_Q21: Partial<Record<Motif, readonly Contexte[]>> = {
  "10_CAMSP": ["6_CAMSP"],
  "11_PERMISSION": [],
  "12_CONVOCATION": ["13_CONVOCATION"],
  "13_MATERNITE": ["4_MATERNITE_ELOIGNEE", "5_HTNM"],
};

// Le fait de chaque situation de l'autre cadre, et si la cocher le met à
// « oui ». Les autres attendent la page de leur branche (Q2.10, Q2.13, Q2.14) ;
// le retour pénitentiaire n'a pas de fait (S3).
const FAIT_DU_CONTEXTE: Record<
  Contexte,
  { fait: keyof Faits; positif: boolean } | undefined
> = {
  "1_ATMP": { fait: "fait_atmp_lie", positif: true },
  "4_MATERNITE_ELOIGNEE": { fait: "fait_dap_maternite", positif: false },
  "5_HTNM": { fait: "fait_htnm_hors_maternite", positif: false },
  "6_CAMSP": { fait: "fait_motif_camsp", positif: true },
  "7_SAMSAH": { fait: "fait_motif_samsah", positif: true },
  "9_PENSION_MILITAIRE": { fait: "fait_motif_pension", positif: true },
  "10_RETOUR_PENITENTIAIRE": undefined,
  "13_CONVOCATION": { fait: "fait_convocation", positif: false },
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

// Le groupe que Q2.2.1 a proposé, et s'il est coché.
function groupe(validated: Valides, valeur: Questions["Q2.2.1"][number]) {
  const { offered = [], answer = [] } = validated["Q2.2.1"] ?? {};
  return { propose: offered.includes(valeur), coche: answer.includes(valeur) };
}

// Le séjour en cours, y compris en HAD. Écarté, il exclut le transfert, le
// centre 15 et la permission. Coché, seule Q2.2.1.a dit la permission.
function faitsDuSejour(validated: Valides): Partial<Faits> {
  const { propose, coche } = groupe(validated, "1_HOSPITALISATION");
  if (!propose) return faitsDeLEntree(validated);
  if (!coche) {
    const ecarte = non("Q2.2.1 : « déjà hospitalisé » proposé, non coché.");
    return {
      fait_transfert_article80: ecarte,
      fait_centre15_interetablissements: ecarte,
      ...sansPermission(ecarte),
    };
  }
  const reponse = validated["Q2.2.1.a"]?.answer;
  if (answerAbsent(reponse)) return {};
  const source = `Q2.2.1.a : « ${reponse} ».`;
  return reponse === "1_OUI"
    ? { fait_permission: oui(source) }
    : sansPermission(non(source));
}

// Une entrée en établissement de santé ne se propose pas en séjour (D-98) :
// aucun séjour n'est en cours, donc aucune permission.
function faitsDeLEntree(validated: Valides): Partial<Faits> {
  if (validated["Q2.1.g"]?.answer !== "1_ENTREE") return {};
  return sansPermission(
    non(
      "Q2.1.g : « 1_ENTREE » ; aucun séjour en cours, donc aucune permission.",
    ),
  );
}

// Sans permission, ni sa charge par le patient, ni la règle du mineur.
function sansPermission(preuve: Fait): Partial<Faits> {
  const deduit = non("fait_permission vaut « non » : aucune permission.");
  return {
    fait_permission: preuve,
    fait_permission_charge_patient: deduit,
    fait_permission_mineur_admissible: deduit,
  };
}

// Une extrémité à l'étranger, et non le seul lieu des soins (Q2.2.5).
function faitsDeLEtranger(validated: Valides): Partial<Faits> {
  const { propose, coche } = groupe(validated, "2_ETRANGER");
  if (!propose) return {};
  if (!coche)
    return {
      fait_trajet_etranger: non("Q2.2.1 : « l'étranger » proposé, non coché."),
    };
  const lieux = validated["Q2.2.5"]?.answer;
  if (answerAbsent(lieux)) return {};
  const source = `Q2.2.5 : « ${lieux.join(" », « ")} ».`;
  const extremite = lieux.some((lieu) => lieu !== "3_LIEU_DES_SOINS");
  return { fait_trajet_etranger: extremite ? oui(source) : non(source) };
}

// L'autre cadre : écarté, chaque situation que son aide montrait vaut « non ».
// Coché, Q2.2.1.b dit lesquelles concernent le trajet, parmi celles proposées.
function faitsDuCadre(validated: Valides): Partial<Faits> {
  const { propose, coche } = groupe(validated, "3_AUTRE_CADRE");
  if (!propose) return {};
  const precision = validated["Q2.2.1.b"];
  if (coche && answerAbsent(precision?.answer)) return {};
  const proposes = coche
    ? (precision?.offered ?? [])
    : contextesAProposer(validated);
  const coches: readonly string[] = (coche && precision?.answer) || [];
  return Object.fromEntries(
    CONTEXTES.filter((contexte) => proposes.includes(contexte)).flatMap(
      (contexte) => faitDuContexte(contexte, coches.includes(contexte), coche),
    ),
  );
}

function faitDuContexte(
  contexte: Contexte,
  cochee: boolean,
  detaille: boolean,
) {
  const lien = FAIT_DU_CONTEXTE[contexte];
  if (!lien) return [];
  if (!cochee) {
    const ecarte = detaille
      ? `Q2.2.1.b : « ${contexte} » proposée, non cochée.`
      : "Q2.2.1 : « autre situation » proposée, non cochée.";
    return [[lien.fait, non(ecarte)]];
  }
  const source = `Q2.2.1.b : « ${contexte} ».`;
  return [
    [
      lien.fait,
      lien.positif
        ? oui(source)
        : absent(`${source} À qualifier dans sa branche.`),
    ],
  ];
}
