// Traduction d'une situation du simulateur en saisies CERFA.
//
// C'est ici que se lit la faisabilité réelle du pré-remplissage. La Partie 1
// (médical) alimente les rubriques ❶ et ❷ ; la Partie 2 (administratif) alimente
// le trajet, l'urgence et l'accident causé par un tiers. Ce qui reste hors de
// portée est recensé dans `RESTE_A_SAISIR` — c'est le cahier des charges du module.

import type Engine from "publicodes";
import type { Situation } from "publicodes";
import {
  MODE_TRANSPORT,
  PRESCRIPTION,
  SITUATION,
  TRAJET,
} from "./champs-cerfa.ts";
import type { Saisie } from "./remplir-cerfa.ts";

type ModePrescrit =
  | "aucun"
  | "véhicule personnel ou transport en commun"
  | "VSL ou taxi conventionné"
  | "VSL TPMR ou taxi conventionné TPMR"
  | "ambulance"
  | "transport par équipe SMUR";

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
  const vrai = (règle: string) => évalué.evaluate(règle).nodeValue === true;
  const valeur = (règle: string) => évalué.evaluate(règle).nodeValue;

  const casFinal = valeur("cible_cas_final");
  if (casFinal !== "prescription médicale de transport")
    throw new CerfaNonApplicable(casFinal);

  const saisies: Saisie[] = [];

  // ❶ Situation permettant la prise en charge (plusieurs choix possibles).
  if (
    vrai("p1_motif_hospitalisation") ||
    vrai("p1_motif_seance_chimio_radio_hemodialyse")
  ) {
    // Le CERFA réunit sur une seule case l'hospitalisation et les séances
    // (chimio / radio / hémodialyse) que le simulateur distingue.
    saisies.push({ case: SITUATION.entréeSortieHospitalisation });
  }
  if (vrai("p1_motif_accident_travail_maladie_professionnelle")) {
    saisies.push({ case: SITUATION.accidentTravailMaladiePro });
  }
  // `p1_motif_ald` ne dit rien du caractère **exonérant** de l'ALD, seule
  // distinction que le CERFA demande : la case reste au prescripteur.

  // ❷ Mode de transport. `cible_transport_sanitaire_prescrit` est la conclusion du
  // moteur ; les critères cochés en sont la justification, exigée par le CERFA.
  const mode = valeur("cible_transport_sanitaire_prescrit") as ModePrescrit;

  if (mode === "ambulance") {
    const justifications = [
      [
        "p1_critere_position_allongee_demi_assise",
        MODE_TRANSPORT.positionAllongéeDemiAssise,
      ],
      ["p1_critere_brancardage_portage", MODE_TRANSPORT.brancardagePortage],
      [
        "p1_critere_surveillance_personne_qualifiee",
        MODE_TRANSPORT.surveillancePersonneQualifiée,
      ],
      ["p1_critere_oxygene", MODE_TRANSPORT.oxygène],
      ["p1_critere_asepsie", MODE_TRANSPORT.asepsieRigoureuse],
    ] as const;
    for (const [règle, champ] of justifications) {
      if (vrai(règle)) saisies.push({ case: champ });
    }
  }

  if (
    mode === "VSL ou taxi conventionné" ||
    mode === "VSL TPMR ou taxi conventionné TPMR"
  ) {
    saisies.push({ case: MODE_TRANSPORT.assisProfessionnalisé });
    if (mode === "VSL TPMR ou taxi conventionné TPMR") {
      saisies.push({ case: MODE_TRANSPORT.fauteuilRoulantTPMR });
    }
    if (vrai("cible_transport_partage_incompatible")) {
      saisies.push({ case: MODE_TRANSPORT.transportPartagéIncompatible });
    }
  }

  if (mode === "véhicule personnel ou transport en commun") {
    // Le CERFA sépare deux cases (véhicule individuel / transports en commun) là
    // où le simulateur n'en a qu'une : on ne peut pas trancher à sa place.
    if (vrai("cible_accompagnant_necessaire")) {
      saisies.push({ case: MODE_TRANSPORT.accompagnantNécessaire });
    }
  }

  saisies.push(...saisiesTrajet(valeur));
  return saisies;
}

type Lecteur = (règle: string) => unknown;

/** Rubriques du trajet, de l'urgence et de l'accident — issues de la Partie 2. */
function saisiesTrajet(valeur: Lecteur): Saisie[] {
  const saisies: Saisie[] = [];

  if (valeur("p2_trajet_aller_retour") === "Aller-retour") {
    saisies.push({ case: TRAJET.allerRetour });
  }

  // Seul le **type** de lieu est modélisé. « Domicile » se coche ; « structure de
  // soins » et « autre lieu » ouvrent un champ d'adresse que le simulateur ne
  // connaît pas — d'où leur présence dans `RESTE_A_SAISIR.trajet`.
  if (valeur("p2_trajet_depart") === "Domicile")
    saisies.push({ case: TRAJET.départDomicile });
  if (valeur("p2_trajet_arrivee") === "Domicile")
    saisies.push({ case: TRAJET.arrivéeDomicile });

  const urgence = valeur("p2_transport_urgence");
  if (urgence === "Appel SAMU - Centre 15")
    saisies.push({ case: PRESCRIPTION.urgenceSamu });
  if (urgence === "Autre urgence")
    saisies.push({ case: PRESCRIPTION.urgenceAutre });

  if (
    valeur("p2_accident_cause_par_tiers") ===
    "Oui, en rapport avec un accident causé par un tiers"
  ) {
    saisies.push({ case: SITUATION.accidentTiersOui });
  } else if (valeur("p2_accident_cause_par_tiers") === "Non") {
    saisies.push({ case: SITUATION.accidentTiersNon });
  }

  // La notice réserve « nombre de transports itératifs » aux transports répétés
  // **ne correspondant pas** à la définition du transport en série (≥ 4 transports
  // sur deux mois, chacun à plus de 50 km). Y reporter le compte d'une série
  // remplirait une rubrique que la notice interdit dans ce cas.
  //
  // Le garde `CerfaNonApplicable` ne suffit pas à l'écarter : une série n'exige un
  // accord préalable que si l'ALD n'est pas validée (`p2_transport_serie_declenche_dap`),
  // si bien qu'une série sous ALD validée reste bien une prescription — et arrive ici.
  const nombre = valeur("p2_nombre_transports_prevus");
  if (
    typeof nombre === "number" &&
    nombre > 1 &&
    valeur("p2_transport_en_serie") !== true
  ) {
    saisies.push({
      champ: TRAJET.nombreTransportsItératifs,
      texte: String(nombre),
    });
  }

  return saisies;
}

/**
 * Champs du CERFA qu'aucune règle ne permet de déduire, groupés par origine.
 * C'est la part qui reste à saisir — et elle détermine où le remplissage doit
 * tourner (cf. README).
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
  /** Le type de lieu est déduit ; l'adresse ou le nom de la structure, jamais. */
  trajet: [
    "départ autre lieu",
    "départ struct soins",
    "arrivée autre lieu",
    "arrivée struct soins",
  ],
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
