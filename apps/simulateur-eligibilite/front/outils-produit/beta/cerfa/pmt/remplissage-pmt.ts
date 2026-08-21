// Comment se remplit chaque champ du CERFA n° 11574*07 « Prescription médicale de
// transport » (réf. S3138g, 4 pages : notice p1-p2, Volet 1 p3, Volet 2 p4).
//
// **Un champ, une ligne.** La clé est le nom brut du champ AcroForm — avec ses
// fautes et ses abréviations d'origine (« aseptie », « dadministration doxygène »,
// « entré sortie hosp ») : ce sont des clés, pas de la prose, et les recopier
// permet de chercher un champ du PDF et de tomber sur la règle qui le remplit. La
// valeur est une fonction des réponses de la simulation, et rien d'autre : pour
// savoir d'où sort une case, il suffit de lire sa ligne.
//
// C'est délibérément coûteux — le moteur est réinterrogé pour chaque champ, une
// cinquantaine de fois par document — et délibérément lisible. Un formulaire se
// remplit une fois, au clic ; sa correction, elle, se relit à chaque livraison du
// modèle.
//
// Les 53 champs y figurent tous, y compris ceux que le simulateur ne sait pas
// déduire : le tableau dit alors qui les remplira, et pourquoi. C'est le cahier
// des charges du module, et `tests/cerfa/remplissage.test.ts` le confronte au
// gabarit — aucun champ ne peut être oublié ni inventé.
//
// Deux pièges du gabarit, sans lesquels le remplissage est silencieusement faux :
//
//  1. `ALD exo`, `oui1` et `oui2` sont des **boutons radio déguisés** en case à
//     cocher (cf. `ÉtatCoché` dans `remplir-cerfa.ts`).
//  2. `entré sortie hosp` a pour état d'export `/NON` alors que la cocher signifie
//     « oui, entrée ou sortie d'hospitalisation ». L'état d'export n'est pas la
//     sémantique : ne jamais l'inférer du nom.

import { adresseArrivée, adresseDépart } from "./lieux-du-trajet.ts";
import type { ÉtatCoché } from "./remplir-cerfa.ts";
import {
  ALLER_RETOUR,
  ARRIVEE,
  DEPART,
  MODE,
  type Reponses,
  URGENCE,
} from "./reponses.ts";

/** Qui remplira un champ que le simulateur ne déduit pas. */
type Qui = "le prescripteur" | "le transporteur";

/**
 * Ce qu'un champ reçoit, la situation lue :
 *
 *  - `{ texte }` / `{ coché }` — le simulateur a déduit quoi y écrire ;
 *  - `undefined` — il sait le déduire, mais cette situation ne l'appelle pas ;
 *  - `{ laisséÀ }` — il ne sait pas, et dit qui s'en chargera.
 *
 * Les deux derniers cas laissent le champ vierge de la même façon. Les distinguer
 * n'est pas pour le PDF : c'est pour qui lit le tableau.
 */
export type Valeur =
  | { readonly texte: string }
  | { readonly coché: ÉtatCoché }
  | { readonly laisséÀ: Qui; readonly raison: string }
  | undefined;

/** Comment un champ se remplit : une fonction des réponses, et rien d'autre. */
export type Remplissage = (réponses: Reponses) => Valeur;

export const REMPLISSAGE_PMT: Readonly<Record<string, Remplissage>> = {
  // ---- En-tête des deux volets : bénéficiaire, assuré, organisme ----------
  //
  // Le simulateur est anonyme par construction : il ne connaît aucune de ces
  // données, et c'est ce qui interdit au remplissage de quitter le navigateur.
  "N et P bénéficiaire": auPrescripteur(
    "donnée nominative, hors du simulateur",
  ),
  "N° immat bénéf": auPrescripteur("donnée nominative, hors du simulateur"),
  clé: auPrescripteur("clé du NIR du bénéficiaire"),
  "Date Nais": auPrescripteur("donnée nominative, hors du simulateur"),
  adresse: auPrescripteur("adresse du bénéficiaire, donnée nominative"),
  "Nom et num centre paiement": auPrescripteur("organisme de rattachement"),
  "N et P assuré": auPrescripteur("donnée nominative, hors du simulateur"),
  "N° immat assuré": auPrescripteur("donnée nominative, hors du simulateur"),
  "clé 1": auPrescripteur("clé du NIR de l’assuré"),

  // ---- ❶ Situation permettant la prise en charge -------------------------
  //
  // Plusieurs choix possibles, sauf les deux cases d'accident causé par un tiers,
  // mutuellement exclusives : A4.6 étant un oui/non, elles suivent le booléen.
  oui: coche((r) => r.valeur("p2_accident_cause_par_tiers") === true, "OUI"),
  non: coche((r) => r.valeur("p2_accident_cause_par_tiers") === false, "NON"),
  "date accident": auPrescripteur(
    "date de l’accident : le modèle ne la demande pas",
  ),

  // Le CERFA réunit sur une seule case l'hospitalisation et les séances (dialyse,
  // radiothérapie, chimiothérapie) que le simulateur distingue.
  "entré sortie hosp": coche(
    (r) => r.vrai("p2_contexte_hospitalisation") || r.vrai("p1_m0_seance"),
    "NON", // piège n° 2 : cocher s'écrit `/NON` sur ce champ
  ),

  // Jamais cochée en pratique : le dispositif Engagement maternité (A2.4) conduit
  // toujours à une demande d'accord préalable, donc à l'autre formulaire. La règle
  // est écrite quand même — si le modèle change, la case suivra.
  "transport Engagement maternité du lieu de résidence vers la maternité ou lhébergement temporaire non médicalisé":
    coche((r) => r.vrai("p2_engagement_maternite_entree")),

  "transport lié à un accident du travail ou une maladie professionnelle":
    coche((r) => r.vrai("p2_contexte_at_mp")),
  "date accid ATMP": auPrescripteur(
    "date de l’AT/MP : le modèle ne la demande pas",
  ),

  // ---- ❷ Mode de transport prescrit --------------------------------------
  //
  // Une ambulance ne se prescrit pas sans dire pourquoi : le CERFA exige au moins
  // une des cinq justifications, et ce sont les critères cochés en Q1.1. Chacune
  // vérifie le mode retenu, quoique le modèle le garantisse déjà — n'importe
  // lequel de ces critères conclut à l'ambulance (`p1_critere_ambulance`).
  "position allongée ou demiassise": coche(
    (r) =>
      r.transport === MODE.ambulance &&
      r.vrai("p1_critere_position_allongee_demi_assise"),
  ),
  "surveillance par une personne qualifiée": coche(
    (r) =>
      r.transport === MODE.ambulance &&
      r.vrai("p1_critere_surveillance_constante"),
  ),
  "dadministration doxygène": coche(
    (r) => r.transport === MODE.ambulance && r.vrai("p1_critere_oxygene"),
  ),
  "brancardage ou dun portage": coche(
    (r) =>
      r.transport === MODE.ambulance &&
      r.vrai("p1_critere_brancardage_portage"),
  ),
  "aseptie rigoureuse": coche(
    (r) =>
      r.transport === MODE.ambulance && r.vrai("p1_critere_isolement_asepsie"),
  ),

  "transport assis professionnalisé VSL taxi conventionné": coche(
    (r) => r.transport === MODE.assis || r.transport === MODE.assisTPMR,
  ),
  // La cible ne vaut vrai que sur les deux modes assis : le modèle porte déjà la
  // restriction, la répéter ici serait la réimplémenter.
  "létat de santé du patient nest pas compatible avec un transport partagé cochez la case":
    coche((r) => r.vrai("cible_transport_partage_incompatible")),
  "un transport pour patient à mobilité réduite dans son fauteuil roulant est adapté cochez la case":
    coche((r) => r.transport === MODE.assisTPMR),

  // Le CERFA sépare deux cases là où le simulateur n'en a qu'une (« véhicule
  // personnel ou transport en commun ») : on ne peut pas trancher à sa place.
  "transp indiv": auPrescripteur(
    "le modèle ne sépare pas individuel et commun",
  ),
  "transp terres": auPrescripteur(
    "le modèle ne sépare pas individuel et commun",
  ),
  "dans ce cas si létat du patient nécessite une personne accompagnante cochez la case":
    coche(
      (r) =>
        r.transport === MODE.véhiculePersonnel &&
        r.vrai("cible_accompagnant_necessaire"),
    ),

  // ---- ❸ Trajet -----------------------------------------------------------
  //
  // Un domicile se coche ; une structure de soins ou un autre lieu se nomment, sur
  // l'unique ligne que le formulaire leur donne (cf. `lieux-du-trajet.ts`).
  domicile: coche((r) => r.texte("p2_trajet_depart") === DEPART.domicile),
  "départ struct soins": écrit((r) =>
    r.texte("p2_trajet_depart") === DEPART.structure ? adresseDépart(r) : "",
  ),
  "départ autre lieu": écrit((r) =>
    r.texte("p2_trajet_depart") === DEPART.autre ? adresseDépart(r) : "",
  ),
  domicile_2: coche((r) => r.texte("p2_trajet_arrivee") === ARRIVEE.domicile),
  "arrivée struct soins": écrit((r) =>
    r.texte("p2_trajet_arrivee") === ARRIVEE.structure ? adresseArrivée(r) : "",
  ),
  "arrivée autre lieu": écrit((r) =>
    r.texte("p2_trajet_arrivee") === ARRIVEE.autre ? adresseArrivée(r) : "",
  ),

  "transp aller-retour": coche((r) => {
    const sens = r.texte("p2_trajet_aller_retour");
    return sens === ALLER_RETOUR.identique || sens === ALLER_RETOUR.différent;
  }),
  "nbr transp": écrit(transportsItératifs),

  // ---- ❹ Urgence, ❺ éléments médicaux, ❻ exonérations --------------------
  //
  // Les deux cases d'urgence sont mutuellement exclusives.
  "Urg SAMU centre 15": coche(
    (r) => r.texte("p2_transport_urgence") === URGENCE.samu,
  ),
  autres: coche((r) => r.texte("p2_transport_urgence") === URGENCE.autre),

  /** ❺ Volet 1 **uniquement** — donnée médicale, absente du Volet 2. */
  "comm évent": auPrescripteur("éléments d’ordre médical : rédaction libre"),
  "transp autre cent": auPrescripteur(
    "orientation en centre de référence maladies rares : hors modèle",
  ),
  "ALD exo": auPrescripteur(
    "le modèle ne dit pas l’ALD exonérante ou non, seule distinction demandée ici",
  ),
  oui1: auPrescripteur("exonération du ticket modérateur : hors modèle"),
  oui2: auPrescripteur("pension militaire d’invalidité : hors modèle"),

  // ---- Prescripteur -------------------------------------------------------
  //
  // Le référentiel d'identification ne porte aujourd'hui que des libellés
  // (`{ id, libelle }`) : ni RPPS, ni FINESS/SIRET, ni adresse de structure.
  // Pré-remplir ce bloc suppose de l'étendre.
  "N et P prescript": auPrescripteur(
    "le référentiel ne porte que des libellés",
  ),
  "raison sociale prescript": auPrescripteur("hors référentiel"),
  identifiant: auPrescripteur("RPPS : hors référentiel"),
  "adresse precript": auPrescripteur("adresse de structure : hors référentiel"),
  date: auPrescripteur("date de signature : au moment de prescrire"),
  "AM FINESS ou SIRET": auPrescripteur("FINESS/SIRET : hors référentiel"),

  // ---- Bloc transporteur, Volet 2 uniquement -----------------------------
  //
  // Rempli à la main par le transporteur, après le transport. Le simulateur n'a
  // rien à y écrire — il est listé pour qu'on sache que c'est délibéré.
  "raison sociale VSL": auTransporteur("bloc réservé au transporteur"),
  "adresse VSL": auTransporteur("bloc réservé au transporteur"),
  "fait à": auTransporteur("bloc réservé au transporteur"),
  date1: auTransporteur("bloc réservé au transporteur"),
  "n° ident": auTransporteur("bloc réservé au transporteur"),
};

// ---- implémentation ----

/** Une case cochée quand la situation le justifie, dans l'état d'export voulu. */
function coche(
  quand: (réponses: Reponses) => boolean,
  coché: ÉtatCoché = "On",
): Remplissage {
  return (réponses) => (quand(réponses) ? { coché } : undefined);
}

/** Un texte écrit dans le champ. La chaîne vide le laisse vierge. */
function écrit(quoi: (réponses: Reponses) => string): Remplissage {
  return (réponses) => {
    const texte = quoi(réponses);
    return texte === "" ? undefined : { texte };
  };
}

function auPrescripteur(raison: string): Remplissage {
  return () => ({ laisséÀ: "le prescripteur", raison });
}

function auTransporteur(raison: string): Remplissage {
  return () => ({ laisséÀ: "le transporteur", raison });
}

/**
 * La notice réserve « nombre de transports itératifs » aux transports répétés **ne
 * correspondant pas** à la définition du transport en série (≥ 4 sur deux mois,
 * chacun à plus de 50 km). Y reporter le compte d'une série remplirait une
 * rubrique que la notice interdit dans ce cas.
 *
 * Le garde `CerfaNonApplicable` ne suffit pas à l'écarter : une série n'exige un
 * accord préalable que si l'ALD n'est pas validée, si bien qu'une série sous ALD
 * validée reste une prescription — et arrive ici.
 */
function transportsItératifs(réponses: Reponses): string {
  const nombre = réponses.valeur("p2_nombre_transports_prevus");
  if (typeof nombre !== "number" || nombre <= 1) return "";
  return réponses.vrai("p2_transport_en_serie") ? "" : String(nombre);
}
