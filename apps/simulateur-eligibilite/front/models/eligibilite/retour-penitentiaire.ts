// Le retour vers un établissement pénitentiaire (option 10 de Q2.2.1.b) : ce
// qui qualifie son circuit avant R2 (TS1012-04, `CONTRAT_CONTEXTES_V1012.json`).
//
// Cocher l'option ne donne aucun fait, ni aucun financeur. Le livrable demande
// de qualifier le circuit avec les réponses déjà données, sans nouvelle
// question. Il ne dit pas lesquelles : ce qui suit est notre lecture, en
// attente de l'éditeur (D-118).
//
// - Sans soin (Q2.1 = 15) ou sans professionnel pendant le trajet (Q1.1 = 1
//   ou 2), le retour est un mouvement administratif : il suit le circuit
//   pénitentiaire, sans aucune des dix issues.
// - Une sortie d'hospitalisation (Q2.1.g = 2), hors permission, est une sortie
//   définitive vers la prison : ni transfert de l'article 80, ni permission, ni
//   Centre 15 entre établissements. Q2.5 ne se pose pas.
// - Une permission suit sa branche (Q2.7, Q2.8), un transfert Q2.5 et Q2.6. Un
//   transfert entre établissements ne mène pas à une prison : il se refuse.
// - Pour tout autre soin, la prison n'est que l'adresse d'arrivée, en P3.

import type { Answers, Validated } from "../../socle";
import type { Fait } from "../../socle/decision-engine/publicodes";
import type { Faits } from "./declarations/faits";
import type { Questions } from "./declarations/questions";
import { sansProfessionnel } from "./reponses";

type Valides = Validated<Questions>;

/** Le message qui arrête un mouvement administratif sur la page des contextes. */
export const CIRCUIT_PENITENTIAIRE =
  "Sans soin ni professionnel pendant le trajet, le retour vers un établissement pénitentiaire relève du circuit pénitentiaire : il ne se prescrit pas comme un transport sanitaire. Le simulateur ne donne pas de résultat pour ce trajet.";

/** Le message qui refuse un transfert entre établissements vers la prison. */
export const TRANSFERT_VERS_LA_PRISON =
  "Un transfert entre établissements de santé ne mène pas à un établissement pénitentiaire. Corrigez cette réponse, ou retirez le retour pénitentiaire des situations particulières.";

/**
 * Q2.2.1.b, sur sa page, coche-t-elle le retour pénitentiaire d'un mouvement
 * administratif ? Q1.1 et Q2.1 sont validées avant elle.
 */
export function mouvementAdministratif(
  answers: Answers<Questions>,
  validated: Valides,
): boolean {
  return (
    retourCoche(answers["Q2.2.1"], answers["Q2.2.1.b"]) &&
    (validated["Q2.1"]?.answer === "15_AUCUN" ||
      sansProfessionnel(validated["Q1.1"]?.answer))
  );
}

/** Le retour pénitentiaire est-il une sortie définitive d'hospitalisation ? */
export function sortieVersLaPrison(validated: Valides): boolean {
  return (
    retourCoche(validated["Q2.2.1"]?.answer, validated["Q2.2.1.b"]?.answer) &&
    validated["Q2.1.g"]?.answer === "2_SORTIE" &&
    validated["Q2.2.1.a"]?.answer !== "1_OUI"
  );
}

/** Le retour pénitentiaire est-il coché, une fois sa page validée ? */
export function retourPenitentiaireValide(validated: Valides): boolean {
  return retourCoche(
    validated["Q2.2.1"]?.answer,
    validated["Q2.2.1.b"]?.answer,
  );
}

/** Les faits qu'une sortie définitive vers la prison établit. */
export function faitsDuRetourPenitentiaire(validated: Valides): Partial<Faits> {
  if (!sortieVersLaPrison(validated)) return {};
  const source =
    "Q2.1.g : « 2_SORTIE », Q2.2.1.b : « 10_RETOUR_PENITENTIAIRE » ; sortie définitive vers la prison.";
  const deduit = non("fait_permission vaut « non » : aucune permission.");
  return {
    fait_transfert_article80: non(source),
    fait_centre15_interetablissements: non(source),
    fait_permission: non(source),
    fait_permission_charge_patient: deduit,
    fait_permission_mineur_admissible: deduit,
  };
}

// ---- implémentation ----

function retourCoche(
  groupes: Questions["Q2.2.1"] | undefined,
  contextes: Questions["Q2.2.1.b"] | undefined,
): boolean {
  return (
    (groupes?.includes("3_AUTRE_CADRE") ?? false) &&
    (contextes?.includes("10_RETOUR_PENITENTIAIRE") ?? false)
  );
}

function non(provenance: string): Fait {
  return { value: false, provenance };
}
