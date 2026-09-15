// Les réponses de la simulation, telles que le remplissage du CERFA les lit — et
// le vocabulaire du modèle qu'il compare.
//
// Une situation évaluée, et rien d'autre : chaque règle de `remplissage-pmt.ts`
// ne reçoit que cet objet. C'est ce qui permet de lire un champ du formulaire
// isolément — sa ligne dit tout ce dont il dépend, sans qu'il faille remonter
// une chaîne d'appels.
//
// Le moteur est interrogé à la demande, une lecture par champ : le même
// `cible_transport_sanitaire_prescrit` est ainsi évalué une dizaine de fois pour
// un seul document. C'est assumé — publicodes met ses évaluations en cache, et
// un formulaire se remplit une fois, au clic.

import type Engine from "publicodes";
import type { Situation } from "publicodes";
import type { CleDeRegle } from "../../../simulateur/contrat-regles-publicodes.ts";

export type Reponses = {
  /** La valeur brute d'une règle, telle que le moteur l'évalue. */
  readonly valeur: (règle: CleDeRegle) => unknown;
  /** La règle s'évalue-t-elle à vrai ? */
  readonly vrai: (règle: CleDeRegle) => boolean;
  /** La valeur d'une règle, en texte ; vide quand le modèle ne tranche pas. */
  readonly texte: (règle: CleDeRegle) => string;
  /** Le transport prescrit, tel que le modèle le nomme (cf. `MODE`). */
  readonly transport: ModePrescrit;
};

/**
 * Les cinq valeurs de `cible_transport_sanitaire_prescrit`, recopiées mot pour mot
 * du modèle. Ni le PMT ni la DAP ne branchent plus dessus depuis les specs 0007
 * et 0008 — les deux lisent les cibles du mapping documentaire plutôt que ce
 * libellé —, mais `VALEURS_COMPAREES` continue de la comparer au modèle : un
 * champ recommencerait à en dépendre sans prévenir si le mapping venait à
 * manquer une valeur.
 */
const MODE = {
  // La v9.7 a scindé le mode non professionnalisé en deux, et retiré les deux
  // sorties qui n'en étaient pas : « aucun », que la Partie 1 ne rend plus — elle
  // conclut toujours sur un mode —, et le SMUR, dont la réponse a disparu de Q1.
  véhiculePersonnel: "véhicule personnel",
  transportEnCommun: "transport en commun terrestre",
  assis: "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
  assisTPMR:
    "VSL (Véhicule Sanitaire Léger) TPMR (Transport de Personnes à Mobilité Réduite) ou taxi conventionné TPMR (Transport de Personnes à Mobilité Réduite)",
  ambulance: "ambulance",
} as const;

type ModePrescrit = (typeof MODE)[keyof typeof MODE];

/** Positionne le moteur sur `situation` et en fait un lecteur de réponses. */
export function reponsesDe(
  moteur: Engine<string>,
  situation: Situation<string>,
): Reponses {
  const évalué = moteur.setSituation(situation);
  const valeur = (règle: CleDeRegle) => évalué.evaluate(règle).nodeValue;
  return {
    valeur,
    vrai: (règle) => valeur(règle) === true,
    texte: (règle) => String(valeur(règle) ?? ""),
    transport: String(
      valeur("cible_transport_sanitaire_prescrit") ?? "",
    ) as ModePrescrit,
  };
}

/**
 * Les possibilités des deux types de lieu, mot pour mot.
 *
 * La v9.5.1 les libellait différemment aux deux bouts — l'arrivée disait « un
 * domicile différent du lieu de départ ». La v9.7 leur donne la même liste, plus
 * longue de trois entrées : EHPAD, USLD et établissement pénitentiaire, que le
 * modèle distinguait jusque-là par des exceptions. Comme `MODE`, plus lue
 * directement par aucun tableau de remplissage depuis que le trajet passe par
 * `rubriques-trajet.ts` — gardée pour `VALEURS_COMPAREES`.
 */
const LIEU = {
  domicile: "Domicile",
  ehpad: "EHPAD",
  usld: "USLD",
  structure: "Structure de soins",
  autre: "Autre lieu",
  penitentiaire: "Établissement pénitentiaire",
} as const;

/**
 * Les possibilités de `cible_type_urgence`, la cible que la v9.5.1 expose. C'est
 * elle qu'on lit plutôt que la réponse brute d'A4.5 : le modèle y range aussi
 * l'exception d'aide médicale urgente, qu'aucune réponse d'A4.5 ne porte, et
 * c'est à lui de dire ce qui vaut urgence attestée. Même sort que `MODE` et
 * `LIEU`.
 */
const URGENCE = {
  samu: "appel SAMU - Centre 15",
  autre: "autre urgence médicale attestée",
  aucune: "aucune",
} as const;

/**
 * Les raisons de déplacement et natures de transfert que la composition des
 * éléments d'ordre médical compare littéralement (contrat EM-1, spec 0005) :
 * elle ne lit pas de cible dédiée pour ces cas-là, contrairement à `MODE`,
 * `LIEU` et `URGENCE`.
 */
const RAISON_HOSPITALISATION_OU_TRANSFERT = {
  entree: "Entrée en hospitalisation",
  sortie: "Sortie d’hospitalisation",
  transfert:
    "Transfert d’un patient hospitalisé vers un autre établissement de santé",
} as const;
const NATURE_TRANSFERT = {
  provisoire: "Provisoire",
  definitif: "Définitif",
} as const;

/** Les deux types de lieu qui qualifient un centre de soins, cf. `blocCentreRare`. */
const TYPE_LIEU_CENTRE_DE_SOINS = {
  structure: "Structure de soins",
  usld: "USLD",
} as const;

/** Les lieux que `p2_maternite_lieu` et `p2_htnm_lieu` proposent chacun. */
const LIEU_MATERNITE = {
  depart: "Départ",
  arrivee: "Arrivée",
  distincte: "Adresse distincte",
} as const;
const LIEU_HTNM = {
  non: "Non",
  depart: "Adresse de départ",
  arrivee: "Adresse d’arrivée",
  distincte: "Adresse distincte",
} as const;

/**
 * Les valeurs du modèle que le tableau compare, recopiées mot pour mot.
 * `tests/cerfa/remplissage.test.ts` les confronte aux possibilités déclarées : un
 * libellé reformulé par une livraison de règles y échoue au lieu de laisser une
 * case durablement décochée.
 */
export const VALEURS_COMPAREES: ReadonlyArray<
  readonly [CleDeRegle, readonly string[]]
> = [
  ["cible_transport_sanitaire_prescrit", Object.values(MODE)],
  ["p2_trajet_depart", Object.values(LIEU)],
  ["p2_trajet_arrivee", Object.values(LIEU)],
  ["cible_type_urgence", Object.values(URGENCE)],
  ["p2_raison_principale", Object.values(RAISON_HOSPITALISATION_OU_TRANSFERT)],
  ["p2_nature_transfert", Object.values(NATURE_TRANSFERT)],
  ["cible_lieu_depart_type", Object.values(TYPE_LIEU_CENTRE_DE_SOINS)],
  ["cible_lieu_arrivee_type", Object.values(TYPE_LIEU_CENTRE_DE_SOINS)],
  ["p2_maternite_lieu", Object.values(LIEU_MATERNITE)],
  ["p2_htnm_lieu", Object.values(LIEU_HTNM)],
];
