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
 * Les six valeurs de `cible_transport_sanitaire_prescrit`, recopiées mot pour mot
 * du modèle. Nommées plutôt qu'écrites au point d'appel : depuis la v9.1 chaque
 * abréviation traîne sa définition, et la variante TPMR pèse à elle seule 150
 * caractères.
 */
export const MODE = {
  aucun: "aucun",
  véhiculePersonnel: "véhicule personnel ou transport en commun",
  assis: "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
  assisTPMR:
    "VSL (Véhicule Sanitaire Léger) TPMR (Transport de Personnes à Mobilité Réduite) ou taxi conventionné TPMR (Transport de Personnes à Mobilité Réduite)",
  ambulance: "ambulance",
  smur: "transport par une équipe SMUR (Structure Mobile d’Urgence et de Réanimation)",
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

/** Les possibilités de `p2_trajet_depart` (A4.2), mot pour mot. */
export const DEPART = {
  domicile: "Domicile",
  structure: "Structure de soins",
  autre: "Autre lieu",
} as const;

/** Les possibilités de `p2_trajet_arrivee` (A4.3), mot pour mot. */
export const ARRIVEE = {
  domicile: "Un domicile différent du lieu de départ.",
  structure: "Une structure de soins différente du lieu de départ.",
  autre: "Un autre lieu différent du lieu de départ.",
} as const;

/** Les possibilités de `p2_trajet_aller_retour` (A4.1), mot pour mot. */
export const ALLER_RETOUR = {
  identique: "aller-retour identique",
  différent: "aller-retour différent",
} as const;

/** Les deux possibilités d'urgence de `p2_transport_urgence` (A4.5). */
export const URGENCE = {
  samu: "Appel au SAMU (Service d’Aide Médicale Urgente) - Centre 15",
  autre: "Autre situation d’urgence attestée par le prescripteur",
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
  ["p2_trajet_depart", Object.values(DEPART)],
  ["p2_trajet_arrivee", Object.values(ARRIVEE)],
  ["p2_trajet_aller_retour", Object.values(ALLER_RETOUR)],
  ["p2_transport_urgence", Object.values(URGENCE)],
];
