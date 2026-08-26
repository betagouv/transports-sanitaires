// Comment se remplit chaque champ de la DAP — CERFA n° 11575*08 « Demande
// d'accord préalable de transport valant prescription médicale » (réf. S3139h,
// 4 pages : notice p1, Volet 1 p2 au contrôle médical, Volet 2 p3, Volet 3 p4 au
// transporteur).
//
// Même convention que `pmt/remplissage-pmt.ts` : un champ AcroForm par clé, une
// fonction des réponses par valeur, les 56 champs présents — y compris ceux que
// le simulateur ne déduit pas, dont la ligne dit alors qui les remplira.
//
// Ce gabarit-ci pose un piège de plus, et il est structurel. Quatre de ses champs
// portent **plusieurs cases visibles sur un même nom** : cocher, c'est écrire une
// valeur, donc une seule case du groupe à la fois.
//
//   `km`  : 150 km (`/Oui`), série (`/non`), CAMSP-CMPP (`/camsp`), Engagement
//           maternité (`/engag`) — quatre motifs de DAP que le modèle sait
//           cumuler et que le formulaire ne sait pas dire ensemble.
//   `sit` : hospitalisation (`/Oui`), ALD exonérante (`/non`), ALD non exonérante
//           (`/ald`), AT-MP (`/atmp`) — la notice les donne pour exclusifs.
//   `ti`  : moyen individuel (`/Oui`), transport en commun (`/non`).
//   `ald` : ALD exonérante (`/Oui`), AT-MP (`/non`).
//
// Les états ont été relevés par introspection puis vérifiés sur le rendu : leurs
// noms ne disent pas leur sens (`/non` vaut « ALD exonérante » dans `sit`), et il
// ne faut jamais l'inférer du nom.

import { adresseArrivée, adresseDépart } from "../lieux-du-trajet.ts";
import type { ÉtatCoché } from "../remplir-cerfa.ts";
import {
  auPrescripteur,
  auTransporteur,
  coche as cocheEn,
  type Tableau,
  àLaCaisse,
  écrit,
} from "../remplissage.ts";
import {
  ALLER_RETOUR,
  ARRIVEE,
  DEPART,
  MODE,
  type Reponses,
  URGENCE,
} from "../reponses.ts";

export const REMPLISSAGE_DAP: Tableau = {
  // ---- En-tête des trois volets : bénéficiaire, assuré ---------------------
  //
  // Le simulateur est anonyme par construction : il ne connaît aucune de ces
  // données, et c'est ce qui interdit au remplissage de quitter le navigateur.
  "n et p": auPrescripteur("donnée nominative, hors du simulateur"),
  "num immat": auPrescripteur("donnée nominative, hors du simulateur"),
  clé: auPrescripteur("clé du NIR du bénéficiaire"),
  "date naiss": auPrescripteur("donnée nominative, hors du simulateur"),
  ad: auPrescripteur("adresse du bénéficiaire, donnée nominative"),
  "n et p ass": auPrescripteur("donnée nominative, hors du simulateur"),
  "num immat ass": auPrescripteur("donnée nominative, hors du simulateur"),
  "clé ass": auPrescripteur("clé du NIR de l’assuré"),

  // Accident causé par un tiers : A4.6 est un oui/non, les deux états suivent.
  "rap acc": étatSelon((r) => {
    const tiers = r.valeur("p2_accident_cause_par_tiers");
    if (tiers === true) return "Oui";
    return tiers === false ? "non" : undefined;
  }),
  "DATE AT": auPrescripteur("date de l’accident : le modèle ne la demande pas"),

  // ---- ❶ Situation justifiant l'accord préalable --------------------------
  //
  // Quatre motifs, un seul champ : cf. l'en-tête de ce fichier et `motifUnique`.
  km: étatSelon(motifUnique),
  "bat ou av": coche((r) => r.vrai(MOTIF_DU_CHAMP_BATEAU)),
  // La case d'accompagnant propre à l'avion ou au bateau — le formulaire en porte
  // une seconde, plus bas, pour le moyen individuel ou le transport en commun.
  "pers acc": coche(
    (r) =>
      r.vrai(MOTIF_DU_CHAMP_BATEAU) && r.vrai("cible_accompagnant_necessaire"),
  ),
  // « Indiquez à quelle situation est liée le transport par avion ou par bateau » :
  // la notice réserve ce bloc à ce seul cas, et n'en admet qu'une situation. Les
  // deux cases d'ALD restent au prescripteur — le modèle ne dit pas l'ALD
  // exonérante ou non, seule distinction que le formulaire demande ici.
  sit: étatSelon((r) => {
    if (!r.vrai(MOTIF_DU_CHAMP_BATEAU)) return undefined;
    if (r.vrai("p2_contexte_hospitalisation") || r.vrai("p1_m0_seance"))
      return "Oui";
    return r.vrai("p2_contexte_at_mp") ? "atmp" : undefined;
  }),
  "dat at": auPrescripteur("date de l’AT/MP : le modèle ne la demande pas"),

  // ---- ❷ Mode de transport prescrit ---------------------------------------
  //
  // « hormis l'avion ou le bateau » : la DAP vaut prescription médicale, ces cases
  // sont donc celles de la PMT, et se déduisent de la même façon.
  "pos all": coche(
    (r) =>
      r.transport === MODE.ambulance &&
      r.vrai("p1_critere_position_allongee_demi_assise"),
  ),
  surv: coche(
    (r) =>
      r.transport === MODE.ambulance &&
      r.vrai("p1_critere_surveillance_constante"),
  ),
  oxy: coche(
    (r) => r.transport === MODE.ambulance && r.vrai("p1_critere_oxygene"),
  ),
  branc: coche(
    (r) =>
      r.transport === MODE.ambulance &&
      r.vrai("p1_critere_brancardage_portage"),
  ),
  asep: coche(
    (r) =>
      r.transport === MODE.ambulance && r.vrai("p1_critere_isolement_asepsie"),
  ),

  vsl: coche(
    (r) => r.transport === MODE.assis || r.transport === MODE.assisTPMR,
  ),
  // La cible ne vaut vrai que sur les deux modes assis : le modèle porte déjà la
  // restriction, la répéter ici serait la réimplémenter.
  "trans part": coche((r) => r.vrai("cible_transport_partage_incompatible")),
  "faut adapt": coche((r) => r.transport === MODE.assisTPMR),

  // Le formulaire sépare le moyen individuel du transport en commun là où le
  // modèle n'en a qu'un (« véhicule personnel ou transport en commun ») : on ne
  // peut pas trancher à sa place, et les deux cases partagent un champ.
  ti: auPrescripteur("le modèle ne sépare pas individuel et commun"),
  "pat acc": coche(
    (r) =>
      r.transport === MODE.véhiculePersonnel &&
      r.vrai("cible_accompagnant_necessaire"),
  ),
  ald: auPrescripteur(
    "ALD exonérante ou AT/MP : le modèle ne dit pas l’ALD exonérante, et ce bloc suit un mode qu’il ne tranche pas",
  ),
  "date atmp 2": auPrescripteur(
    "date de l’AT/MP : le modèle ne la demande pas",
  ),

  // ---- ❸ Trajet -----------------------------------------------------------
  //
  // Un domicile se coche ; une structure de soins ou un autre lieu se nomment, sur
  // l'unique ligne que le formulaire leur donne (cf. `lieux-du-trajet.ts`).
  dép: coche((r) => r.texte("p2_trajet_depart") === DEPART.domicile),
  "struct soins": écrit((r) =>
    r.texte("p2_trajet_depart") === DEPART.structure ? adresseDépart(r) : "",
  ),
  "autre lieu": écrit((r) =>
    r.texte("p2_trajet_depart") === DEPART.autre ? adresseDépart(r) : "",
  ),
  arr: coche((r) => r.texte("p2_trajet_arrivee") === ARRIVEE.domicile),
  "struct soins 2": écrit((r) =>
    r.texte("p2_trajet_arrivee") === ARRIVEE.structure ? adresseArrivée(r) : "",
  ),
  "autre lieu 2": écrit((r) =>
    r.texte("p2_trajet_arrivee") === ARRIVEE.autre ? adresseArrivée(r) : "",
  ),
  alret: coche((r) => {
    const sens = r.texte("p2_trajet_aller_retour");
    return sens === ALLER_RETOUR.identique || sens === ALLER_RETOUR.différent;
  }),
  // « nombre de transports », sans réserve : contrairement aux « transports
  // itératifs » de la PMT, cette rubrique-ci vaut aussi pour une série — c'est
  // même l'un des motifs qui amènent à ce formulaire.
  "nom tra": écrit((r) => {
    const nombre = r.valeur("p2_nombre_transports_prevus");
    return typeof nombre === "number" ? String(nombre) : "";
  }),

  // ---- ❹ Urgence, ❺ éléments médicaux, ❻ exonération ---------------------
  samu: étatSelon((r) => {
    const urgence = r.texte("cible_type_urgence");
    if (urgence === URGENCE.samu) return "Oui";
    return urgence === URGENCE.autre ? "non" : undefined;
  }),
  préc: auPrescripteur("nature de l’autre urgence : rédaction libre"),

  /** ❺ Volet 1 **uniquement** — donnée médicale, absente des volets suivants. */
  elmedic: auPrescripteur("éléments d’ordre médical : rédaction libre"),
  malrare: auPrescripteur(
    "orientation en centre de référence maladies rares : hors modèle",
  ),
  ETM: auPrescripteur("exonération du ticket modérateur : hors modèle"),

  // ---- Prescripteur -------------------------------------------------------
  //
  // Le référentiel d'identification ne porte aujourd'hui que des libellés
  // (`{ id, libelle }`) : ni RPPS, ni FINESS/SIRET, ni adresse de structure.
  "ident med": auPrescripteur("le référentiel ne porte que des libellés"),
  "ident struct": auPrescripteur("raison sociale : hors référentiel"),
  "num ident med": auPrescripteur("RPPS : hors référentiel"),
  "ad struct": auPrescripteur("adresse de structure : hors référentiel"),
  "date id": auPrescripteur("date de signature : au moment de prescrire"),
  "num struct": auPrescripteur("FINESS/SIRET : hors référentiel"),

  // ---- Avis médical et avis administratif --------------------------------
  //
  // Le propre de ce formulaire : la caisse le complète à réception. Rien ne s'y
  // écrit ici, et c'est ce qui distingue une demande d'une prescription.
  acc: àLaCaisse("avis médical : accord, refus total ou refus partiel"),
  motif: àLaCaisse("motif du refus"),
  "date avis": àLaCaisse("date de l’avis médical"),
  "ac ad": àLaCaisse("avis administratif : accord ou refus"),
  "date avis ad": àLaCaisse("date de l’avis administratif"),

  // ---- Volet 3, transporteur ---------------------------------------------
  "raison soc": auTransporteur("bloc réservé au transporteur"),
  adresse: auTransporteur("bloc réservé au transporteur"),
  "num ident": auTransporteur("bloc réservé au transporteur"),
  "fait à": auTransporteur("bloc réservé au transporteur"),
  "date fait": auTransporteur("bloc réservé au transporteur"),
};

/**
 * Les quatre motifs que le champ `km` doit dire à lui seul, dans l'ordre où la
 * notice les énumère (situations a, b, c puis e).
 *
 * Le modèle sait les cumuler — une série sans ALD au-delà de 150 km, un CAMSP et
 * une maternité éloignée cochés ensemble en A3.4 —, le formulaire non : un champ,
 * une valeur. Cocher un motif vrai vaut mieux que n'en cocher aucun, ce qui
 * laisserait la demande sans motif. Le prescripteur voit les autres sur le
 * document remis au patient, qui les liste tous.
 */
export const MOTIFS_DU_CHAMP_KM = [
  ["cible_dap_motif_longue_distance", "Oui"],
  ["cible_dap_motif_serie", "non"],
  ["cible_dap_motif_camsp_cmpp", "camsp"],
  ["cible_dap_motif_engagement_maternite", "engag"],
] as const;

/**
 * Le motif qui a son propre champ, et celui que le formulaire ne sait pas dire :
 * la S3139h n'a pas de case pour le SAMSAH. Une demande fondée sur lui part donc
 * avec la rubrique ❶ vierge — le prescripteur l'écrit à la main.
 *
 * Ces listes ne servent qu'à `tests/cerfa/depuis-simulateur-dap.test.ts`, qui
 * vérifie qu'elles couvrent, avec `MOTIFS_DU_CHAMP_KM`, tous les motifs que le
 * modèle porte : un septième motif livré plus tard y échouera, au lieu de
 * disparaître sans bruit du formulaire.
 */
export const MOTIF_DU_CHAMP_BATEAU = "cible_dap_motif_avion_bateau";

export const MOTIFS_SANS_CASE = ["cible_dap_motif_samsah"] as const;

// ---- implémentation ----

// Les cases simples de ce gabarit s'exportent en `/Oui`, là où celles de la PMT
// s'exportent en `/On`. Rien ne le laisse deviner : on le dit une fois ici plutôt
// qu'à chaque ligne, et `remplirCerfa` refuse d'écrire un état que le champ visé
// ne connaît pas.
function coche(quand: (réponses: Reponses) => boolean): Tableau[string] {
  return cocheEn(quand, "Oui");
}

// Un champ dont plusieurs cases partagent le nom : la fonction rend l'état à
// écrire, ou rien. `coche` ne conviendrait pas — elle ne connaît qu'un état.
function étatSelon(
  lequel: (réponses: Reponses) => ÉtatCoché | undefined,
): Tableau[string] {
  return (réponses) => {
    const coché = lequel(réponses);
    return coché === undefined ? undefined : { coché };
  };
}

function motifUnique(réponses: Reponses): ÉtatCoché | undefined {
  return MOTIFS_DU_CHAMP_KM.find(([motif]) => réponses.vrai(motif))?.[1];
}
