// Le vocabulaire des scénarios v9.7 : les réponses qu'on cite constamment, et la
// façon d'amorcer un moteur dessus. Partagé par les fichiers qui rejouent la
// matrice du livrable — la liste nommée et les familles engendrées.

import type { Situation } from "publicodes";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { moteurDeTest } from "./moteur";

/**
 * Les trois réponses de Q1, mot pour mot. La v9.5.0 en avait ajouté une
 * quatrième, l'urgence vitale qui qualifiait un SMUR ; la v9.7 l'a retirée, avec
 * le cas final qui allait avec. L'urgence se recueille désormais en Partie 2.
 */
export const AUTONOME =
  "'Peut se déplacer seul, sans aide technique ou humaine et sans besoin particulier sur l’entièreté du trajet.'";
export const PROCHE =
  "'Nécessite l’accompagnement d’un proche pour se déplacer ou transmettre les informations nécessaires à l’équipe soignante, sans intervention d’un professionnel pendant le transport.'";
export const PRO =
  "'Nécessite une prise en charge spécifique pendant le trajet, une aide d’un professionnel pour se déplacer ou, en l’absence d’un proche accompagnant, pour transmettre les informations nécessaires à l’équipe soignante.'";

/**
 * Le motif ouvrant droit le plus banal. La v9.5.1 le cochait dans la mosaïque des
 * contextes administratifs ; la v9.7 en fait une **raison principale**, à choix
 * unique — il n'y a donc plus d'option exclusive à décocher.
 */
export const HOSPITALISATION = {
  p2_raison_principale: "'Entrée en hospitalisation'",
};

/** Les deux mosaïques dont on décoche l'option exclusive. */
export const ALD = { p1_m0_ald: "oui", p1_m0_aucun: "non" };
export const CRITERES = { p1_critere_aucun: "non" };

/**
 * Valeurs de cibles citées par les attendus. Le mode non professionnalisé s'est
 * scindé en deux en v9.7 : le prescripteur choisit entre le véhicule personnel et
 * les transports en commun, là où la v9.5.1 rendait les deux d'un seul tenant.
 */
export const VEHICULE_PERSONNEL = "véhicule personnel";
export const TRANSPORT_EN_COMMUN = "transport en commun terrestre";
export const VSL = "VSL (Véhicule Sanitaire Léger) ou taxi conventionné";
export const TPMR =
  "VSL (Véhicule Sanitaire Léger) TPMR (Transport de Personnes à Mobilité Réduite) ou taxi conventionné TPMR (Transport de Personnes à Mobilité Réduite)";
export const PMT = "prescription médicale de transport";
export const DAP = "demande d’accord préalable";
export const S3141 = "prescription S3141";
export const CHARGE_ETABLISSEMENT = "transport à la charge de l’établissement";
export const NON_ELIGIBLE =
  "non éligible à une prise en charge par l’Assurance Maladie";
export const CONVOCATION = "convocation ou avis d’audience";
/** Cas final ajouté par la v9.7.1 : une convocation en avion ou en bateau que le modèle ne sait pas rattacher à une sous-situation de DAP. */
export const ORIENTATION_CAISSE =
  "orientation vers la caisse pour accord préalable";

/**
 * Réponses d'un scénario, surchargées sur la base neutre. `null` **retire** la
 * clé : c'est ainsi qu'un scénario laisse une question sans réponse, ce qu'aucune
 * surcharge ne saurait exprimer.
 */
export type Reponses = Record<string, string | null>;

/**
 * L'applicabilité d'une règle, telle que le modèle la déclare. `null` quand elle
 * dépend d'une question sans réponse : le moteur ne tranche alors ni dans un
 * sens ni dans l'autre, et une question qu'il ne dit pas applicable n'est pas
 * posée pour autant.
 */
export function estApplicable(
  moteur: ReturnType<typeof evalue>,
  regle: string,
): boolean | null {
  return moteur.evaluate({ "est applicable": regle }).nodeValue as
    | boolean
    | null;
}

/** Moteur amorcé sur la base neutre, surchargée par `reponses`. */
export function evalue(reponses: Reponses) {
  const situation: Situation<string> = { ...BASE_NEUTRE };
  for (const [cle, valeur] of Object.entries(reponses)) {
    if (valeur === null) delete situation[cle];
    else situation[cle] = valeur;
  }
  return moteurDeTest(situation);
}
