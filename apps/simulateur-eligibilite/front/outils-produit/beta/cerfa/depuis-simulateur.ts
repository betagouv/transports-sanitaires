// Traduction d'une situation du simulateur en saisies CERFA.
//
// C'est ici que se lit la faisabilité réelle du pré-remplissage. La Partie 1
// (médical) alimente les rubriques ❶ et ❷ ; la Partie 2 (administratif) alimente
// le trajet, l'urgence et l'accident causé par un tiers. Ce qui reste hors de
// portée est recensé dans `RESTE_A_SAISIR` — c'est le cahier des charges du module.

import type Engine from "publicodes";
import type { Situation } from "publicodes";
import type { CleDeRegle } from "../../../simulateur/contrat-regles-publicodes.ts";
import type { ChampCase } from "./champs-cerfa.ts";
import {
  MODE_TRANSPORT,
  PRESCRIPTION,
  SITUATION,
  TRAJET,
} from "./champs-cerfa.ts";
import { saisiesLieux } from "./lieux-du-trajet.ts";
import type { Saisie } from "./remplir-cerfa.ts";

/** Levée quand la situation ne conduit pas à ce CERFA (autre document, ou aucun). */
export class CerfaNonApplicable extends Error {
  readonly casFinal: unknown;

  constructor(casFinal: unknown) {
    super(
      `Ce CERFA ne s'applique pas : le simulateur conclut à « ${String(casFinal)} », ` +
        `et non à « prescription médicale de transport ».`,
    );
    this.name = "CerfaNonApplicable";
    this.casFinal = casFinal;
  }
}

/**
 * Déduit les saisies CERFA que le simulateur sait justifier, pour `situation`.
 *
 * Ne rend **que** ce qui est déduit des règles : aucune valeur inventée, aucun
 * défaut arbitraire. Un champ absent du résultat est un champ que le prescripteur
 * doit renseigner lui-même.
 *
 * @throws {CerfaNonApplicable} si le cas final n'est pas une prescription médicale
 * de transport — un accord préalable relève du formulaire S3139, une prise en
 * charge par l'établissement ne donne pas lieu à ce CERFA du tout.
 */
export function saisiesDepuisSituation(
  moteur: Engine<string>,
  situation: Situation<string>,
): Saisie[] {
  const évalué = moteur.setSituation(situation);
  const vrai = (règle: CleDeRegle) => évalué.evaluate(règle).nodeValue === true;
  const valeur = (règle: CleDeRegle) => évalué.evaluate(règle).nodeValue;

  const casFinal = valeur("cible_cas_final");
  if (casFinal !== "prescription médicale de transport")
    throw new CerfaNonApplicable(casFinal);

  return [
    ...saisiesSituation(vrai),
    ...saisiesModeTransport(
      vrai,
      valeur("cible_transport_sanitaire_prescrit") as ModePrescrit,
    ),
    ...saisiesTrajet(valeur),
  ];
}

/**
 * Champs du CERFA qu'aucune règle ne permet de déduire, groupés par origine.
 * C'est la part qui reste à saisir — et elle détermine où le remplissage doit
 * tourner (cf. README).
 *
 * @public Cahier des charges du module : ce qu'il ne sait pas déduire est
 * énuméré ici, et c'est ce qui interdit au remplissage de quitter le navigateur.
 */
export const RESTE_A_SAISIR = {
  /** Données de santé nominatives — absentes du simulateur, anonyme par construction. */
  patient: [
    "N et P bénéficiaire",
    "N° immat bénéf",
    "clé",
    "Date Nais",
    "adresse",
    "Nom et num centre paiement",
    "N et P assuré",
    "N° immat assuré",
    "clé 1",
  ],
  /**
   * Le trajet est intégralement déduit depuis la v9.1 : type de lieu, nom de la
   * structure et adresse. Rien n'y reste à saisir.
   */
  trajet: [],
  /**
   * Le référentiel d'identification ne porte aujourd'hui que des libellés
   * (`{ id, libelle }`) : ni RPPS, ni FINESS/SIRET, ni adresse de structure.
   * Pré-remplir ce bloc suppose d'étendre le référentiel.
   */
  prescripteur: [
    "N et P prescript",
    "raison sociale prescript",
    "identifiant",
    "adresse precript",
    "AM FINESS ou SIRET",
    "date",
  ],
  /** Distinctions que les règles ne portent pas (encore). */
  horsRègles: [
    "ALD exo", // exonérante vs non exonérante : non modélisé
    "date accident", // date de l'accident causé par un tiers
    "date accid ATMP",
    "oui1", // exonération du ticket modérateur
    "oui2", // pension militaire d'invalidité
    "comm évent", // éléments d'ordre médical : rédaction libre du prescripteur
  ],
} as const;

// ---- implémentation ----

/**
 * Les six valeurs de `cible_transport_sanitaire_prescrit`, recopiées mot pour mot
 * du modèle. Nommées plutôt qu'écrites au point d'appel — seule exception à la
 * règle du contrat de règles : depuis la v9.1 chaque abréviation traîne sa
 * définition, et la variante TPMR pèse à elle seule 150 caractères.
 * `tests/regles-front.test.ts` les confronte aux possibilités du modèle.
 */
const MODE = {
  aucun: "aucun",
  véhiculePersonnel: "véhicule personnel ou transport en commun",
  assis: "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
  assisTPMR:
    "VSL (Véhicule Sanitaire Léger) TPMR (Transport de Personnes à Mobilité Réduite) ou taxi conventionné TPMR (Transport de Personnes à Mobilité Réduite)",
  ambulance: "ambulance",
  smur: "transport par une équipe SMUR (Structure Mobile d’Urgence et de Réanimation)",
} as const;

type ModePrescrit = (typeof MODE)[keyof typeof MODE];

const JUSTIFICATIONS_AMBULANCE = [
  [
    "p1_critere_position_allongee_demi_assise",
    MODE_TRANSPORT.positionAllongéeDemiAssise,
  ],
  ["p1_critere_brancardage_portage", MODE_TRANSPORT.brancardagePortage],
  [
    "p1_critere_surveillance_constante",
    MODE_TRANSPORT.surveillancePersonneQualifiée,
  ],
  ["p1_critere_oxygene", MODE_TRANSPORT.oxygène],
  ["p1_critere_isolement_asepsie", MODE_TRANSPORT.asepsieRigoureuse],
] as const satisfies ReadonlyArray<readonly [CleDeRegle, ChampCase]>;

type Lecteur = (règle: CleDeRegle) => unknown;
type Predicat = (règle: CleDeRegle) => boolean;

/** ❶ Situation permettant la prise en charge (plusieurs choix possibles). */
function saisiesSituation(vrai: Predicat): Saisie[] {
  const saisies: Saisie[] = [];
  if (vrai("p2_contexte_hospitalisation") || vrai("p1_m0_seance")) {
    // Le CERFA réunit sur une seule case l'hospitalisation et les séances
    // (dialyse / radiothérapie / chimiothérapie) que le simulateur distingue.
    saisies.push({ case: SITUATION.entréeSortieHospitalisation });
  }
  if (vrai("p2_contexte_at_mp")) {
    saisies.push({ case: SITUATION.accidentTravailMaladiePro });
  }
  // `p1_m0_ald` ne dit rien du caractère **exonérant** de l'ALD, seule
  // distinction que le CERFA demande : la case reste au prescripteur.
  return saisies;
}

/**
 * ❷ Mode de transport. `cible_transport_sanitaire_prescrit` est la conclusion du
 * moteur ; les critères cochés en sont la justification, exigée par le CERFA.
 * Nommé `transport` comme partout ailleurs : `mode` désigne, dans les pages de
 * résultat, `cible_article_80_mode` — dont les valeurs ne diffèrent que d'un « s »
 * (« transports en commun »). Deux règles distinctes, un seul nom de variable :
 * l'ambiguïté ne survit pas ici.
 */
function saisiesModeTransport(
  vrai: Predicat,
  transport: ModePrescrit,
): Saisie[] {
  if (transport === MODE.ambulance) return justificationsAmbulance(vrai);
  if (transport === MODE.assis || transport === MODE.assisTPMR)
    return transportAssis(vrai, transport);
  if (transport === MODE.véhiculePersonnel) return véhiculePersonnel(vrai);
  return [];
}

// Une ambulance ne se prescrit pas sans dire pourquoi : le CERFA exige au moins
// une des cinq justifications, et ce sont les critères cochés en Q1.1.
function justificationsAmbulance(vrai: Predicat): Saisie[] {
  return JUSTIFICATIONS_AMBULANCE.filter(([règle]) => vrai(règle)).map(
    ([, champ]) => ({ case: champ }),
  );
}

function transportAssis(vrai: Predicat, transport: ModePrescrit): Saisie[] {
  const saisies: Saisie[] = [{ case: MODE_TRANSPORT.assisProfessionnalisé }];
  if (transport === MODE.assisTPMR)
    saisies.push({ case: MODE_TRANSPORT.fauteuilRoulantTPMR });
  if (vrai("cible_transport_partage_incompatible"))
    saisies.push({ case: MODE_TRANSPORT.transportPartagéIncompatible });
  return saisies;
}

// Le CERFA sépare deux cases (véhicule individuel / transports en commun) là où
// le simulateur n'en a qu'une : on ne peut pas trancher à sa place. Seul
// l'accompagnant se déduit.
function véhiculePersonnel(vrai: Predicat): Saisie[] {
  return vrai("cible_accompagnant_necessaire")
    ? [{ case: MODE_TRANSPORT.accompagnantNécessaire }]
    : [];
}

/** Rubriques du trajet, de l'urgence et de l'accident — issues de la Partie 2. */
function saisiesTrajet(valeur: Lecteur): Saisie[] {
  const allerRetour = valeur("p2_trajet_aller_retour");
  return [
    ...(allerRetour === "aller-retour identique" ||
    allerRetour === "aller-retour différent"
      ? [{ case: TRAJET.allerRetour }]
      : []),
    ...saisiesLieux(valeur),
    ...saisiesUrgence(valeur),
    ...saisiesAccidentTiers(valeur),
    ...saisieTransportsItératifs(valeur),
  ];
}

/** ❹ Urgence : deux cases, mutuellement exclusives. */
function saisiesUrgence(valeur: Lecteur): Saisie[] {
  const urgence = valeur("p2_transport_urgence");
  if (urgence === "Appel au SAMU (Service d’Aide Médicale Urgente) - Centre 15")
    return [{ case: PRESCRIPTION.urgenceSamu }];
  if (urgence === "Autre situation d’urgence attestée par le prescripteur")
    return [{ case: PRESCRIPTION.urgenceAutre }];
  return [];
}

// La v9.1 pose A4.6 en oui/non : les deux cases du CERFA (elles aussi
// mutuellement exclusives) suivent directement le booléen.
function saisiesAccidentTiers(valeur: Lecteur): Saisie[] {
  const tiers = valeur("p2_accident_cause_par_tiers");
  if (tiers === true) return [{ case: SITUATION.accidentTiersOui }];
  if (tiers === false) return [{ case: SITUATION.accidentTiersNon }];
  return [];
}

// La notice réserve « nombre de transports itératifs » aux transports répétés
// **ne correspondant pas** à la définition du transport en série (≥ 4 transports
// sur deux mois, chacun à plus de 50 km). Y reporter le compte d'une série
// remplirait une rubrique que la notice interdit dans ce cas.
//
// Le garde `CerfaNonApplicable` ne suffit pas à l'écarter : une série n'exige un
// accord préalable que si l'ALD n'est pas validée (`p2_transport_serie_declenche_dap`),
// si bien qu'une série sous ALD validée reste bien une prescription — et arrive ici.
function saisieTransportsItératifs(valeur: Lecteur): Saisie[] {
  const nombre = valeur("p2_nombre_transports_prevus");
  const enSérie = valeur("p2_transport_en_serie") === true;
  if (typeof nombre !== "number" || nombre <= 1 || enSérie) return [];
  return [{ champ: TRAJET.nombreTransportsItératifs, texte: String(nombre) }];
}
