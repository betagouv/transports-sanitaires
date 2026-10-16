// La prestation : ce qui motive le déplacement (Q2.1), et les faits que sa page
// établit, avec ses sous-questions f, g et h.
//
// Chaque fait suit `CONTRAT_REPONSES_FAITS.json` et son correctif. Il ne lit que
// les questions validées. Les sous-questions a à e et i à l, et le régime, ne
// changent aucune sortie : elles ne sont pas posées (D-102).

import { answerAbsent, type Unanswered, type Validated } from "../../socle";
import type { Fait } from "../../socle/decision-engine/publicodes";
import { AUCUN_FAIT, type Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";
import { cible } from "./evaluation-des-regles";
import { faitsDuMode } from "./mode-de-transport";

type Valides = Validated<Questions>;
type Motif = Questions["Q2.1"];

/**
 * P1 prouve-t-elle déjà un motif de transport ? L'ambulance, une séance
 * qualifiante, une ALD à 100 % liée au soin, ou le mineur reconnu en soins
 * continus. Q2.1 n'est alors pas posée (D-102), et son saut ne donne aucun
 * « non ».
 */
export function motifDeP1(validated: Valides): boolean {
  const mode = { ...AUCUN_FAIT, ...faitsDuMode(validated) };
  if (mode.fait_situation_soins_qualifiante.value === true) return true;
  return MOTIFS_DE_P1.some((motif) => cible(mode, motif) === true);
}

/** Plusieurs séances de familles différentes sont-elles cochées en Q1.3 ? */
export function plusieursSeances(validated: Valides): boolean {
  const cas = validated["Q1.3"]?.answer ?? [];
  return SEANCES.filter((seance) => cas.includes(seance)).length >= 2;
}

/**
 * Les faits que la page de Q2.1 établit. L'hospitalisation n'y figure que si
 * Q2.1.g la prouve : sinon, P1 garde la sienne.
 */
export function faitsDeLaPrestation(validated: Valides) {
  const motif = validated["Q2.1"]?.answer;
  return {
    fait_permission: permission(motif),
    fait_evenement_sans_soin: evenementSansSoin(motif),
    fait_motif_camsp: camsp(motif, validated["Q2.1.h"]?.answer),
    ...hospitalisation(validated["Q2.1.g"]?.answer),
    ...sansSeanceNiSejour(validated),
  } satisfies Partial<Faits>;
}

// ---- implémentation ----

// Les cibles qui, à la fin de P1, prouvent déjà un motif de transport.
const MOTIFS_DE_P1 = [
  "cible_mode_ambulance",
  "cible_ald_qualifiante",
  "cible_mineur_soins_prolonges",
] as const;

const SEANCES = ["3_CHIMIOTHERAPIE", "4_RADIOTHERAPIE", "5_DIALYSE"] as const;

// Les soins et examens ordinaires : ils ne sont pas un événement autonome.
const SOINS: readonly Motif[] = [
  "1_CONSULTATION",
  "2_DENTISTE_OU_SAGE_FEMME",
  "3_IMAGERIE",
  "4_BIOLOGIE",
  "5_PARAMEDICAL",
  "6_SEANCE",
  "7_PSYCHOLOGUE",
  "8_HOSPITALISATION",
  "9_TRANSFERT",
  "10_CAMSP",
  "14_AUTRE",
];

function oui(provenance: string): Fait {
  return { value: true, provenance };
}

function non(provenance: string): Fait {
  return { value: false, provenance };
}

function absent(provenance: string): Fait {
  return { provenance };
}

// Q2.1 = 11 prouve la permission. Sans elle, Q2.2.1 peut encore l'établir.
function permission(motif: Motif | Unanswered): Fait {
  if (motif === "11_PERMISSION") return oui("Q2.1 : « 11_PERMISSION ».");
  return absent("Ni Q2.1, ni Q2.2.1 n'établissent encore de permission.");
}

// Un soin ordinaire n'est pas un événement autonome. Une permission, une
// convocation ou la maternité ne le deviennent qu'une fois leur branche
// qualifiée (Q2.7, Q2.10, Q2.14).
function evenementSansSoin(motif: Motif | Unanswered): Fait {
  if (answerAbsent(motif)) return absent("Q2.1 n'est pas validée.");
  if (SOINS.includes(motif)) return non(`Q2.1 : « ${motif} », un soin.`);
  return absent(`Q2.1 : « ${motif} », à qualifier dans sa branche.`);
}

// Q2.1 = 10, puis Q2.1.h : la séance est-elle dans le parcours de l'enfant ?
function camsp(
  motif: Motif | Unanswered,
  rattachement: Questions["Q2.1.h"] | Unanswered,
): Fait {
  if (motif !== "10_CAMSP" || answerAbsent(rattachement))
    return absent("Ni Q2.1.h, ni Q2.2.1 n'établissent encore le CAMSP.");
  const source = `Q2.1.h : « ${rattachement} ».`;
  if (rattachement === "1_OUI") return oui(source);
  return rattachement === "2_NON" ? non(source) : absent(source);
}

// Une entrée ou une sortie d'établissement prouve l'hospitalisation réelle.
// L'admission en HAD à domicile ne la prouve pas seule.
function hospitalisation(sousType: Questions["Q2.1.g"] | Unanswered) {
  if (sousType !== "1_ENTREE" && sousType !== "2_SORTIE") return {};
  const sejour = oui(`Q2.1.g : « ${sousType} ».`);
  return {
    fait_hospitalisation: sejour,
    fait_situation_soins_qualifiante: sejour,
  };
}

// Ni séance qualifiante en Q1.3, ni séjour en Q2.1 : le soin ne qualifie pas
// le transport. Q2.1 est un choix unique : un autre motif écarte
// l'hospitalisation, et l'admission en HAD (Q2.1.g) n'est pas un séjour
// (`negation_precise_v1002` de `fait_situation_soins_qualifiante`).
function sansSeanceNiSejour(validated: Valides): Partial<Faits> {
  const motif = validated["Q2.1"]?.answer;
  const sousType = validated["Q2.1.g"]?.answer;
  if (answerAbsent(motif) || !q13SansSeance(validated)) return {};
  if (motif === "8_HOSPITALISATION" && sousType !== "3_ADMISSION_HAD")
    return {};
  const source =
    motif === "8_HOSPITALISATION"
      ? `Q2.1.g : « ${sousType} », pas un séjour ; Q1.3 sans séance.`
      : `Q2.1 : « ${motif} », pas une hospitalisation ; Q1.3 sans séance.`;
  return {
    fait_situation_soins_qualifiante: non(source),
    ...sansSejourEnCours(validated, motif, source),
  };
}

// Une simple consultation, l'HAD à domicile ou un autre motif, sans séjour en
// cours, ne sont pas une hospitalisation (`non_ou_absence` du contrat). Il faut
// que Q2.2.1 ait proposé « déjà hospitalisé » et qu'il soit écarté. Le
// transfert et la permission se qualifient dans leur branche.
function sansSejourEnCours(
  validated: Valides,
  motif: Motif,
  source: string,
): Partial<Faits> {
  if (motif === "9_TRANSFERT" || motif === "11_PERMISSION") return {};
  const { offered = [], answer = [] } = validated["Q2.2.1"] ?? {};
  const ecarte =
    offered.includes("1_HOSPITALISATION") &&
    !answer.includes("1_HOSPITALISATION");
  if (!ecarte || answerAbsent(validated["Q2.2.1"]?.answer)) return {};
  return {
    fait_hospitalisation: non(
      `${source} Q2.2.1 : « déjà hospitalisé » écarté.`,
    ),
  };
}

// Q1.3 validée sans séance qualifiante : ni chimiothérapie, ni radiothérapie,
// ni hémodialyse (Q1.3.a). Une séance cochée, `faitsDuMode` la prouve déjà.
function q13SansSeance(validated: Valides): boolean {
  const cas = validated["Q1.3"]?.answer;
  if (answerAbsent(cas)) return false;
  return (
    !cas.includes("3_CHIMIOTHERAPIE") &&
    !cas.includes("4_RADIOTHERAPIE") &&
    validated["Q1.3.a"]?.answer !== "1_OUI"
  );
}
