// Comment se remplit chaque champ de la DAP — CERFA n° 11575*08 « Demande
// d'accord préalable de transport valant prescription médicale » (réf. S3139h,
// 4 pages : notice p1, Volet 1 p2 au contrôle médical, Volet 2 p3, Volet 3 p4 au
// transporteur).
//
// Même convention que `pmt/remplissage-pmt.ts` : un champ AcroForm par clé, la
// valeur nomme un id de la feuille de mapping documentaire
// (`front/simulateur/secretariat/`), lue par `depuisLeMapping` — c'est elle qui
// porte la condition, la cible et la raison d'un champ vierge. Ce tableau n'est
// plus qu'une table de correspondance entre le PDF et la feuille — cf. spec 0008.
//
// Les 56 champs y figurent tous, y compris ceux que le simulateur ne sait pas
// déduire : la feuille dit alors qui les remplira, et pourquoi.
// `tests/cerfa/remplissage.test.ts` confronte ce tableau à son gabarit — aucun
// champ ne peut être oublié ni inventé.
//
// Un piège de plus qu'au PMT, et il est structurel : quatre champs portent
// **plusieurs cases visibles sur un même nom**. Cocher, c'est écrire une
// valeur, donc une seule case du groupe à la fois — `premierVrai`, dans
// `mapping.ts`, prend la première ligne vraie d'une liste ordonnée d'ids.
//
//   `km`  : 150 km (`/Oui`), série (`/non`), CAMSP-CMPP (`/camsp`), Engagement
//           maternité (`/engag`) — quatre motifs de DAP que le modèle sait
//           cumuler et que le formulaire ne sait pas dire ensemble.
//   `sit` : hospitalisation (`/Oui`), ALD exonérante (`/non`), ALD non
//           exonérante (`/ald`), AT-MP (`/atmp`) — la sous-situation liée à
//           l'avion ou au bateau, décisions 1 et 3 de la spec.
//   `ti`  : moyen individuel (`/Oui`), transport en commun (`/non`).
//   `ald` : lien avec une ALD exonérante (`/Oui`), lien avec un AT-MP (`/non`).
//
// Les états ont été relevés par introspection : leurs noms ne disent pas leur
// sens (`/non` vaut « ALD exonérante » dans `sit`), et `tests/cerfa/remplissage.test.ts`
// les fige.

import { dateDePrescription } from "../../../../simulateur/secretariat/date-de-prescription.ts";
import { RUBRIQUES_DAP } from "../../../../simulateur/secretariat/rubriques-de-la-dap.ts";
import { dateSurLeChamp } from "../dates.ts";
import { depuisLeMapping, premierVrai as premierVraiSur } from "../mapping.ts";
import type { ÉtatCoché } from "../remplir-cerfa.ts";
import { type Remplissage, type Tableau, écrit } from "../remplissage.ts";

export const REMPLISSAGE_DAP: Tableau = {
  // ---- En-tête des trois volets : bénéficiaire, assuré ---------------------
  "n et p": mapping("beneficiaire_nom_prenom"),
  "num immat": mapping("beneficiaire_nir"),
  clé: mapping("beneficiaire_nir"), // même id que ci-dessus : le PDF sépare le NIR de sa clé
  "date naiss": mapping("beneficiaire_naissance"),
  ad: mapping("beneficiaire_adresse"),
  "n et p ass": mapping("assure_nom_prenom"),
  "num immat ass": mapping("assure_nir"),
  "clé ass": mapping("assure_nir"),
  "rap acc": premierVrai(["tiers_oui", "Oui"], ["tiers_non", "non"]),
  "DATE AT": dateDeLaFeuille("tiers_date"),

  // ---- ❶ Situation justifiant l'accord préalable --------------------------
  km: premierVrai(
    ["longue_distance", "Oui"],
    ["serie", "non"],
    ["camsp_cmpp", "camsp"],
    ["engagement_maternite", "engag"],
  ),
  "bat ou av": mapping("avion_bateau", "Oui"),
  // La personne accompagnante propre à la ligne avion ou bateau : la cible
  // dédiée (`cible_avion_bateau_accompagnant`), pas la cible générique
  // d'accompagnement qui vaut aussi pour le moyen individuel — bug corrigé n° 1
  // de la spec 0008.
  "pers acc": mapping("air_accompagnant", "Oui"),
  // Décisions 1 et 3 : quatre sous-situations, la première vraie l'emporte, et
  // aucune ne l'étant, `sit` part vierge sans que la génération ne bloque — cf.
  // le README du mapping documentaire, dont l'application s'écarte sciemment
  // sur ce seul point.
  sit: premierVrai(
    ["air_hospitalisation", "Oui"],
    ["air_ald_exo", "non"],
    ["air_ald_non_exo", "ald"],
    ["air_atmp", "atmp"],
  ),
  "dat at": dateDeLaFeuille("air_atmp_date"),

  // ---- ❷ Mode de transport prescrit ---------------------------------------
  //
  // « hormis l'avion ou le bateau » : la DAP vaut prescription médicale, ces
  // cases sont donc celles du PMT.
  "pos all": mapping("ambulance_position_allongee_demi_assise", "Oui"),
  surv: mapping("ambulance_surveillance_constante", "Oui"),
  oxy: mapping("ambulance_oxygene", "Oui"),
  branc: mapping("ambulance_brancardage_portage", "Oui"),
  asep: mapping("ambulance_isolement_asepsie", "Oui"),
  vsl: mapping("mode_tap_ou_tpmr", "Oui"),
  "trans part": mapping("partage_incompatible", "Oui"),
  "faut adapt": mapping("fauteuil", "Oui"),
  ti: premierVrai(["mode_individual", "Oui"], ["mode_public", "non"]),
  "pat acc": mapping("accompagnant", "Oui"),
  // Le lien avec le droit qui ouvre la prise en charge, redéclaré ici
  // indépendamment de la sous-situation avion ou bateau — sans `quand`, à la
  // différence de `air_ald_exo` : ces deux ids restent vrais hors avion/bateau.
  ald: premierVrai(["lien_ald", "Oui"], ["lien_atmp", "non"]),
  "date atmp 2": dateDeLaFeuille("lien_atmp_date"),

  // ---- ❸ Trajet -----------------------------------------------------------
  dép: mapping("depart_domicile", "Oui"),
  "struct soins": mapping("depart_structure", "Oui"),
  "autre lieu": mapping("depart_autre", "Oui"),
  arr: mapping("arrivee_domicile", "Oui"),
  "struct soins 2": mapping("arrivee_structure", "Oui"),
  "autre lieu 2": mapping("arrivee_autre", "Oui"),
  alret: mapping("aller_retour", "Oui"),
  // « nombre de transports » : la cible propre au document, pas les transports
  // prévus par le prescripteur — bug corrigé n° 2 de la spec 0008. Sans la
  // réserve « transports itératifs » du PMT : la série est l'un des motifs qui
  // amènent à ce formulaire, la rubrique la porte donc dans tous les cas.
  "nom tra": mapping("nombre"),

  // ---- ❹ Urgence, ❺ éléments médicaux, ❻ exonération ---------------------
  samu: premierVrai(["urgence_appel15", "Oui"], ["urgence_autre", "non"]),
  préc: mapping("urgence_precision"),
  elmedic: mapping("elements_medicaux"),
  malrare: mapping("centre_rare", "Oui"),
  ETM: premierVrai(["exoneration_oui", "Oui"], ["exoneration_non", "NON"]),

  // ---- Prescripteur -------------------------------------------------------
  "ident med": mapping("prescripteur_nom_prenom"),
  "num ident med": mapping("prescripteur_rpps"),
  "ident struct": mapping("structure_nom"),
  "ad struct": mapping("structure_adresse"),
  "num struct": mapping("structure_identifiant"),
  // La feuille n'a pas de source pour `date_prescription` : comme sur le PMT,
  // l'application la calcule hors mapping (`date-de-prescription.ts`). Ce champ
  // fait dix cases et attend `JJ/MM/AAAA` — le format que la fonction rend déjà,
  // sans qu'il faille passer par `dateSurLeChamp`.
  "date id": écrit(() => dateDePrescription()),

  // ---- Avis médical et avis administratif --------------------------------
  //
  // Le propre de ce formulaire : la caisse le complète à réception. Rien ne s'y
  // écrit ici, et c'est ce qui distingue une demande d'une prescription.
  acc: mapping("avis_caisse"),
  motif: mapping("avis_caisse"),
  "date avis": mapping("avis_caisse"),
  "ac ad": mapping("avis_caisse"),
  "date avis ad": mapping("avis_caisse"),

  // ---- Volet 3, transporteur ---------------------------------------------
  "raison soc": mapping("cadre_transporteur"),
  adresse: mapping("cadre_transporteur"),
  "num ident": mapping("cadre_transporteur"),
  "fait à": mapping("cadre_transporteur"),
  "date fait": mapping("cadre_transporteur"),
};

// ---- implémentation ----

// Les cases simples de ce gabarit s'exportent en `/Oui`, là où celles du PMT
// s'exportent en `/On` : `depuisLeMapping` prend donc `"Oui"` par défaut, pas le
// `"On"` qu'il propose pour le cas courant.
function mapping(id: string, état: ÉtatCoché = "Oui"): Remplissage {
  return depuisLeMapping(RUBRIQUES_DAP, id, état);
}

// Raccourci sur `premierVrai` de `mapping.ts`, toujours contre `RUBRIQUES_DAP`.
function premierVrai(
  ...paires: ReadonlyArray<readonly [id: string, état: ÉtatCoché]>
): Remplissage {
  return premierVraiSur(RUBRIQUES_DAP, ...paires);
}

/**
 * Une date de la feuille, reformatée pour l'un des trois champs peignés à huit
 * cases de ce gabarit (`tiers_date` pour « DATE AT », `air_atmp_date` pour
 * « dat at », `lien_atmp_date` pour « date atmp 2 »). `date_prescription`, le
 * quatrième champ de date, n'est pas de la feuille — cf. plus bas.
 */
function dateDeLaFeuille(id: string): Remplissage {
  return (réponses) => {
    const valeur = mapping(id)(réponses);
    return valeur && "texte" in valeur
      ? { texte: dateSurLeChamp(valeur.texte, 8) }
      : valeur;
  };
}
