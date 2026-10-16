// Le mode de transport : les faits que les réponses de P1 établissent, et le
// mode que les règles en tirent avant la fin du questionnaire.
//
// Chaque fait suit `CONTRAT_REPONSES_FAITS.json` et
// `CORRECTIF_FAITS_SANS_REPONSE.md` du paquet de l'éditeur : ce qui le met à
// « oui », ce qui le met à « non », et ce qui le laisse absent. Il ne lit que
// les questions validées.

import { answerAbsent, answerPresent, type Validated } from "../../socle";
import type { Fait } from "../../socle/decision-engine/publicodes";
import type { Cibles } from "./declarations/cibles";
import { AUCUN_FAIT, type Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";
import { cible } from "./evaluation-des-regles";
import { sansProfessionnel } from "./reponses";

type Valides = Validated<Questions>;
type Critere = Questions["Q1.2"][number];

/** Les faits que Q1.1 à Q1.4 établissent, ou laissent absents. */
export function faitsDuMode(validated: Valides) {
  return {
    ...faitsDeQ11(validated),
    ...faitsDesCriteres(validated),
    ...faitsDeQ13(validated),
    fait_prefere_transport_commun: prefereLeTransportCommun(validated),
  } satisfies Partial<Faits>;
}

/**
 * Le mode que les règles retiennent pour ces réponses. Elles ne le rendent
 * qu'une fois P1 complète : elle est tenue pour telle, le temps de la poser.
 */
export function modeDe(validated: Valides): Cibles["cible_mode_id"] {
  return cible(
    {
      ...AUCUN_FAIT,
      ...faitsDuMode(validated),
      fait_p1_complete: { value: true, provenance: "P1 en cours." },
    },
    "cible_mode_id",
  );
}

// ---- implémentation ----

const PROFESSIONNEL = "3_AVEC_UN_PROFESSIONNEL";

// Les options de Q1.2 qui donnent chaque critère.
const CRITERES = {
  fait_critere_tap: [
    "1_PAS_AUTONOME",
    "2_AIDE_TECHNIQUE",
    "3_TRANSMISSION_PAR_UN_PROFESSIONNEL",
    "4_HYGIENE",
    "5_RISQUE_DE_MALAISE",
  ],
  fait_critere_fauteuil: ["6_FAUTEUIL_SANS_TRANSFERT"],
  fait_critere_allonge: ["7_ALLONGE"],
  fait_critere_brancard: ["8_BRANCARDAGE"],
  fait_critere_surveillance: ["9_SURVEILLANCE"],
  fait_critere_oxygene: ["10_OXYGENE"],
  fait_critere_asepsie: ["11_ASEPSIE"],
} as const satisfies Record<string, readonly Critere[]>;

function oui(provenance: string): Fait {
  return { value: true, provenance };
}

function non(provenance: string): Fait {
  return { value: false, provenance };
}

function absent(provenance: string): Fait {
  return { provenance };
}

// Q1.1 dit qui aide le patient : personne, un proche, ou un professionnel.
function faitsDeQ11(validated: Valides) {
  const reponse = validated["Q1.1"]?.answer;
  if (answerAbsent(reponse)) {
    const attente = absent("Q1.1 n'est pas encore validée.");
    return {
      fait_autonomie_professionnel: attente,
      fait_accompagnant: attente,
    };
  }
  const source = `Q1.1 : « ${reponse} ».`;
  return {
    fait_autonomie_professionnel:
      reponse === PROFESSIONNEL ? oui(source) : non(source),
    fait_accompagnant:
      reponse === "2_AVEC_UN_PROCHE" ? oui(source) : non(source),
  };
}

// Un critère de Q1.2 est coché, ou ne l'est pas. Q1.2 ne se pose pas sans
// professionnel : aucun critère ne vaut alors.
function faitsDesCriteres(validated: Valides) {
  const qui = validated["Q1.1"]?.answer;
  const coches = validated["Q1.2"]?.answer;
  const critere = (options: readonly Critere[]): Fait => {
    if (coches) {
      const coche = options.find((option) => coches.includes(option));
      return coche
        ? oui(`Q1.2 : « ${coche} » coché.`)
        : non(`Q1.2 validée sans « ${options.join(" », « ")} ».`);
    }
    if (sansProfessionnel(qui))
      return non("Q1.2 ne se pose pas : aucun professionnel n'intervient.");
    return absent("Q1.2 n'est pas encore validée.");
  };
  return Object.fromEntries(
    Object.entries(CRITERES).map(([fait, options]) => [fait, critere(options)]),
  ) as Record<keyof typeof CRITERES, Fait>;
}

// Q1.3 : les cas particuliers. Les séances ne donnent ici que leur « oui » :
// leur « non » attend Q2.1.g, en P2.
function faitsDeQ13(validated: Valides) {
  const cas = validated["Q1.3"]?.answer;
  if (answerAbsent(cas)) {
    const attente = absent("Q1.3 n'est pas encore validée.");
    return {
      fait_partage_incompatible: attente,
      fait_bariatrique: attente,
      fait_ald_liee: attente,
      fait_ald_exonerante_3_ou_4: attente,
      fait_mineur_soins_prolonges_reconnus: attente,
      fait_situation_soins_qualifiante: attente,
      fait_hospitalisation: attente,
    };
  }
  const coche = (option: (typeof cas)[number]) =>
    cas.includes(option)
      ? oui(`Q1.3 : « ${option} » coché.`)
      : non(`Q1.3 validée sans « ${option} ».`);
  const seance = seanceQualifiante(validated, cas);
  return {
    fait_partage_incompatible: coche("6_PARTAGE_INCOMPATIBLE"),
    fait_bariatrique: coche("1_FORTE_CORPULENCE"),
    ...faitsDeLAldEtDuMineur(validated, cas),
    fait_situation_soins_qualifiante: seance,
    fait_hospitalisation: seance,
  };
}

// L'ALD et le mineur en soins continus (CONTRAT_Q13_ALD_MINEUR.json). Cochée,
// la réponse 2 dit le 100 % ; non cochée, elle ne dit rien du statut de
// l'ALD, qui reste absent. Le lien de l'ALD, comme la reconnaissance du
// mineur, demande en plus la preuve clinique de P1.
function faitsDeLAldEtDuMineur(validated: Valides, cas: Questions["Q1.3"]) {
  const preuve = preuveClinique(validated);
  const fondement = (option: (typeof cas)[number]): Fait => {
    if (!cas.includes(option)) return non(`Q1.3 validée sans « ${option} ».`);
    return {
      ...preuve,
      provenance: `Q1.3 : « ${option} » coché. ${preuve.provenance}`,
    };
  };
  return {
    fait_ald_liee: fondement("2_ALD"),
    fait_ald_exonerante_3_ou_4: cas.includes("2_ALD")
      ? oui("Q1.3 : « 2_ALD » coché, pris en charge à 100 %.")
      : absent(
          "Q1.3 validée sans « 2_ALD » : le statut de l'ALD reste inconnu.",
        ),
    fait_mineur_soins_prolonges_reconnus: fondement("8_MINEUR_SOINS_CONTINUS"),
  };
}

// L'aide nécessaire d'un proche (Q1.1 réponse 2), ou un critère de Q1.2. Le
// patient qui se déplace seul n'a pas de déficience. Une Q1.2 qui ne se pose
// pas, après un proche, n'en dit pas l'absence.
function preuveClinique(validated: Valides): Fait {
  const qui = validated["Q1.1"]?.answer;
  if (qui === "2_AVEC_UN_PROCHE")
    return oui("Q1.1 : l'aide d'un proche est nécessaire.");
  if (qui === "1_SEUL") return non("Q1.1 : le patient se déplace seul.");
  const critere = validated["Q1.2"]?.answer?.[0];
  if (qui === PROFESSIONNEL && critere)
    return oui(`Q1.2 : « ${critere} » coché.`);
  return absent("Ni Q1.1 ni Q1.2 n'établissent encore une déficience.");
}

// Une chimiothérapie, une radiothérapie, ou une hémodialyse confirmée par
// Q1.3.a. Une autre dialyse, ou une dialyse non précisée, ne suffit pas.
function seanceQualifiante(validated: Valides, cas: Questions["Q1.3"]): Fait {
  const seance = (["3_CHIMIOTHERAPIE", "4_RADIOTHERAPIE"] as const).find(
    (option) => cas.includes(option),
  );
  if (seance) return oui(`Q1.3 : « ${seance} » coché.`);
  if (validated["Q1.3.a"]?.answer === "1_OUI")
    return oui("Q1.3.a : une séance d'hémodialyse.");
  return absent("Aucune séance qualifiante en P1 : Q2.1.g décidera.");
}

// Q1.4 ne se pose qu'au patient qui se passe d'un professionnel. Sinon, la
// préférence est sans objet : elle vaut « non ».
function prefereLeTransportCommun(validated: Valides): Fait {
  const preference = validated["Q1.4"]?.answer;
  if (answerPresent(preference)) {
    const source = `Q1.4 : « ${preference} ».`;
    return preference === "2_TRANSPORTS_EN_COMMUN" ? oui(source) : non(source);
  }
  if (validated["Q1.1"]?.answer === PROFESSIONNEL)
    return non("Q1.4 ne se pose pas : un professionnel intervient.");
  return absent("Q1.4 n'est pas encore validée.");
}
