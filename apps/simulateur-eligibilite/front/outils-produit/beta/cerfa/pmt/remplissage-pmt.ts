// Comment se remplit chaque champ du CERFA n° 11574*07 « Prescription médicale de
// transport » (réf. S3138g, 4 pages : notice p1-p2, Volet 1 p3, Volet 2 p4).
//
// **Un champ, une ligne.** La clé est le nom brut du champ AcroForm — avec ses
// fautes et ses abréviations d'origine (« aseptie », « dadministration doxygène »,
// « entré sortie hosp ») : ce sont des clés, pas de la prose. La valeur nomme un
// id de la feuille de mapping documentaire (`front/simulateur/secretariat/`), lu
// par `depuisLeMapping` : c'est elle qui porte la condition, la cible et la
// raison d'un champ vierge. Ce tableau n'est plus qu'une table de
// correspondance entre le PDF et la feuille — cf. spec 0007.
//
// Les 53 champs y figurent tous, y compris ceux que le simulateur ne sait pas
// déduire : le tableau dit alors qui les remplira, et pourquoi — la feuille le
// dit désormais, plutôt qu'une raison écrite à la main ici. C'est le cahier des
// charges du module, et `tests/cerfa/remplissage.test.ts` le confronte au
// gabarit — aucun champ ne peut être oublié ni inventé.
//
// Trois pièges du gabarit, sans lesquels le remplissage est silencieusement
// faux — aucune feuille ne les porte, ils restent donc écrits ici :
//
//  1. `ALD exo`, `oui1` et `oui2` sont des **boutons radio déguisés** en case à
//     cocher (cf. `ÉtatCoché` dans `remplir-cerfa.ts`) : chacun vise deux ids de
//     la feuille, et le premier vrai l'emporte (`premierVrai`, dans
//     `mapping.ts` — la DAP en a besoin aussi, pour ses champs à quatre cases).
//  2. `entré sortie hosp` a pour état d'export `/NON` alors que la cocher signifie
//     « oui, entrée ou sortie d'hospitalisation ». L'état d'export n'est pas la
//     sémantique : ne jamais l'inférer du nom.
//  3. Rubrique ④ : la précision de l'urgence (`urgence_precision` sur la feuille)
//     n'a pas de champ AcroForm sur ce gabarit — elle s'écrit sur un trait
//     imprimé, à la main. `autres` reste la seule case de la rubrique.

import { dateDePrescription } from "../../../../simulateur/secretariat/date-de-prescription.ts";
import { RUBRIQUES_PMT } from "../../../../simulateur/secretariat/rubriques/rubriques-du-pmt.ts";
import { dateSurLeChamp } from "../dates.ts";
import { depuisLeMapping, premierVrai as premierVraiSur } from "../mapping.ts";
import type { ÉtatCoché } from "../remplir-cerfa.ts";
import { type Remplissage, type Tableau, écrit } from "../remplissage.ts";

export const REMPLISSAGE_PMT: Tableau = {
  // ---- En-tête des deux volets : bénéficiaire, assuré, organisme ----------
  "N et P bénéficiaire": mapping("beneficiaire_nom_prenom"),
  "N° immat bénéf": mapping("beneficiaire_nir"),
  clé: mapping("beneficiaire_nir"), // même id que ci-dessus : le PDF sépare le NIR de sa clé
  "Date Nais": mapping("beneficiaire_naissance"),
  adresse: mapping("beneficiaire_adresse"),
  "Nom et num centre paiement": mapping("organisme"),
  "N et P assuré": mapping("assure_nom_prenom"),
  "N° immat assuré": mapping("assure_nir"),
  "clé 1": mapping("assure_nir"),

  // ---- ❶ Situation permettant la prise en charge -------------------------
  oui: mapping("tiers_oui", "OUI"),
  non: mapping("tiers_non", "NON"),
  "date accident": dateDeLaFeuille("tiers_date"),
  "entré sortie hosp": mapping("hospitalisation", "NON"), // piège n° 2
  "ALD exo": premierVrai(["ald_exo", "OUI"], ["ald_non_exo", "NON"]),
  "transport lié à un accident du travail ou une maladie professionnelle":
    mapping("atmp"),
  "date accid ATMP": dateDeLaFeuille("atmp_date"),
  "transport Engagement maternité du lieu de résidence vers la maternité ou lhébergement temporaire non médicalisé":
    mapping("maternite"),

  // ---- ❷ Mode de transport prescrit --------------------------------------
  "position allongée ou demiassise": mapping(
    "ambulance_position_allongee_demi_assise",
  ),
  "surveillance par une personne qualifiée": mapping(
    "ambulance_surveillance_constante",
  ),
  "dadministration doxygène": mapping("ambulance_oxygene"),
  "brancardage ou dun portage": mapping("ambulance_brancardage_portage"),
  "aseptie rigoureuse": mapping("ambulance_isolement_asepsie"),
  "transport assis professionnalisé VSL taxi conventionné":
    mapping("mode_tap_ou_tpmr"),
  "létat de santé du patient nest pas compatible avec un transport partagé cochez la case":
    mapping("partage_incompatible"),
  "un transport pour patient à mobilité réduite dans son fauteuil roulant est adapté cochez la case":
    mapping("fauteuil"),
  "transp indiv": mapping("mode_individual"),
  "transp terres": mapping("mode_public"),
  "dans ce cas si létat du patient nécessite une personne accompagnante cochez la case":
    mapping("accompagnant"),

  // ---- ❸ Trajet -----------------------------------------------------------
  domicile: mapping("depart_domicile"),
  "départ struct soins": mapping("depart_structure"),
  "départ autre lieu": mapping("depart_autre"),
  domicile_2: mapping("arrivee_domicile"),
  "arrivée struct soins": mapping("arrivee_structure"),
  "arrivée autre lieu": mapping("arrivee_autre"),
  "transp aller-retour": mapping("aller_retour"),
  "nbr transp": horsSérie(mapping("nombre")), // décision 5 : dérivation conservée

  // ---- ❹ Urgence, ❺ éléments médicaux, ❻ exonérations --------------------
  "Urg SAMU centre 15": mapping("urgence_appel15"),
  autres: mapping("urgence_autre"), // pas de champ pour la précision, cf. piège n° 3
  "comm évent": mapping("elements_medicaux"),
  "transp autre cent": mapping("centre_rare"),
  oui1: premierVrai(["exoneration_oui", "OUI"], ["exoneration_non", "NON"]),
  oui2: premierVrai(
    ["pension_militaire_oui", "OUI"],
    ["pension_militaire_non", "NON"],
  ),

  // ---- Prescripteur -------------------------------------------------------
  "N et P prescript": mapping("prescripteur_nom_prenom"),
  identifiant: mapping("prescripteur_rpps"),
  "raison sociale prescript": mapping("structure_nom"),
  "adresse precript": mapping("structure_adresse"),
  "AM FINESS ou SIRET": mapping("structure_identifiant"),
  // La feuille n'a pas de source pour `date_prescription` : le moteur ne pose
  // jamais de date système (`date-de-prescription.ts`). L'application la
  // calcule donc elle-même, hors mapping, au moment de générer le document.
  date: écrit(() => dateDePrescription().replaceAll("/", "")),

  // ---- Bloc transporteur, Volet 2 uniquement -----------------------------
  "raison sociale VSL": mapping("cadre_transporteur"),
  "adresse VSL": mapping("cadre_transporteur"),
  "fait à": mapping("cadre_transporteur"),
  date1: mapping("cadre_transporteur"),
  "n° ident": mapping("cadre_transporteur"),
};

// ---- implémentation ----

// Raccourci sur `depuisLeMapping`, toujours contre `RUBRIQUES_PMT` : ce tableau
// ne lit qu'une feuille.
function mapping(id: string, état: ÉtatCoché = "On"): Remplissage {
  return depuisLeMapping(RUBRIQUES_PMT, id, état);
}

// Raccourci sur `premierVrai` de `mapping.ts`, toujours contre `RUBRIQUES_PMT` —
// décision 2 de la spec 0007, généralisée par la 0008 dans `mapping.ts` pour
// que la DAP la partage plutôt que d'en garder une copie.
function premierVrai(
  ...paires: ReadonlyArray<readonly [id: string, état: ÉtatCoché]>
): Remplissage {
  return premierVraiSur(RUBRIQUES_PMT, ...paires);
}

/**
 * Une date de la feuille, reformatée pour le champ peigné du gabarit qui la
 * reçoit. `depuisLeMapping` rend l'ISO brut du modèle ; `dateSurLeChamp` sait
 * seule combien de cases le champ propose — ici toujours huit, relevé sur le
 * gabarit PMT (`tiers_date` pour « date accident », `atmp_date` pour
 * « date accid ATMP »).
 */
function dateDeLaFeuille(id: string): Remplissage {
  return (réponses) => {
    const valeur = mapping(id)(réponses);
    return valeur && "texte" in valeur
      ? { texte: dateSurLeChamp(valeur.texte, 8) }
      : valeur;
  };
}

/**
 * La ligne `nombre` du mapping, qui laisse vide un trajet unique (son `when`,
 * `cible_nombre_transports_document > 1`, TS973-13).
 *
 * La notice réserve en plus « nombre de transports itératifs » aux transports
 * répétés **ne correspondant pas** à la définition du transport en série (≥ 4
 * sur deux mois, chacun à plus de 50 km). Y reporter le compte d'une série
 * remplirait une rubrique que la notice interdit dans ce cas.
 *
 * Le garde `CerfaNonApplicable` ne suffit pas à l'écarter : une série n'exige un
 * accord préalable que si l'ALD n'est pas validée, si bien qu'une série sous ALD
 * validée reste une prescription — et arrive ici. C'est une règle de la notice
 * papier, absente de la feuille, et la seule dérivation que ce tableau conserve.
 */
function horsSérie(remplissage: Remplissage): Remplissage {
  return (réponses) =>
    réponses.vrai("p2_transport_en_serie") ? undefined : remplissage(réponses);
}
