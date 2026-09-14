// Comment se remplit chaque champ du CERFA n° 16184*01 « Prescription pour
// permission de sortie » (réf. S3141, 2 pages : notice p1, formulaire p2 — un
// seul volet, contrairement au PMT et à la DAP).
//
// Même convention que ses deux voisins : la clé est le nom brut du champ
// AcroForm, la valeur nomme un id de la feuille de mapping documentaire
// (`front/simulateur/secretariat/`), lue par `depuisLeMapping` — c'est elle qui
// porte la condition, la cible et la raison d'un champ vierge. Ce tableau n'est
// plus qu'une table de correspondance entre le PDF et la feuille — cf. spec 0009.
//
// Les 46 champs y figurent tous, y compris ceux que le simulateur ne sait pas
// déduire. `tests/cerfa/remplissage.test.ts` confronte ce tableau à son
// gabarit — aucun champ ne peut être oublié ni inventé.
//
// Trois pièges du gabarit, relevés par introspection :
//
//  1. `all` porte quatre widgets à quatre états, `/Oui`, `/non`, `/mti` et
//     `/mtt`, et trois d'entre eux **chevauchent exactement** les widgets
//     d'autres champs : `/non` la case d'`assis`, `/mti` et `/mtt` celles de
//     `mt`. Écrire `all` en un autre état que `/Oui` cocherait donc, sous un
//     autre nom de champ, une case déjà couverte par ailleurs — deux valeurs
//     pour une case, sans que rien ne le signale. `all` ne s'écrit donc **qu'en
//     `/Oui`**, pour la position allongée ou demi-assise ; les trois autres
//     états ne sont jamais écrits, `assis` et `mt` portant seuls leur case.
//  2. `tr mois` reste **délibérément vierge** : le modèle sait calculer
//     `cible_s3141_nombre_trajets_mois`, mais son unité — trajets ou
//     allers-retours — n'est pas confirmée par la CNAM (README de la feuille).
//     Inscrire un nombre dont on ignore ce qu'il compte serait pire que de
//     laisser la case au prescripteur.
//  3. `pério traj` n'a **aucune ligne** dans la feuille : ni source, ni
//     condition, ni raison. Le champ reste vierge en le disant plutôt qu'en
//     l'omettant du tableau.

import { dateDePrescription } from "../../../../simulateur/secretariat/date-de-prescription.ts";
import { RUBRIQUES_S3141 } from "../../../../simulateur/secretariat/rubriques-du-s3141.ts";
import { dateSurLeChamp } from "../dates.ts";
import { depuisLeMapping, premierVrai as premierVraiSur } from "../mapping.ts";
import type { ÉtatCoché } from "../remplir-cerfa.ts";
import {
  auPrescripteur,
  type Remplissage,
  type Tableau,
  écrit,
} from "../remplissage.ts";

export const REMPLISSAGE_S3141: Tableau = {
  // ---- En-tête : bénéficiaire, assuré, accident causé par un tiers --------
  "nom ben": mapping("beneficiaire_nom_prenom"),
  "immat ben": mapping("beneficiaire_nir"),
  "clé ben": mapping("beneficiaire_nir"), // même id : le PDF sépare le NIR de sa clé
  "naiss ben": mapping("beneficiaire_naissance"),
  "adress ben": mapping("beneficiaire_adresse"),
  "nom ass": mapping("assure_nom_prenom"),
  "immat ass": mapping("assure_nir"),
  "clé ass": mapping("assure_nir"),
  rct: premierVrai(["tiers_oui", "Oui"], ["tiers_non", "non"]),
  "date acc": dateDeLaFeuille("tiers_date"),

  // ---- ① hospitalisation ---------------------------------------------------
  "date deb hosp": dateDeLaFeuille("debut_hospitalisation"),

  // ---- ② mode de transport prescrit ---------------------------------------
  all: mapping("ambulance_position_allongee_demi_assise"), // piège n° 1 : `/Oui` seul
  surv: mapping("ambulance_surveillance_constante"),
  oxy: mapping("ambulance_oxygene"),
  branc: mapping("ambulance_brancardage_portage"),
  asep: mapping("ambulance_isolement_asepsie"),
  assis: mapping("mode_tap_ou_tpmr"),
  partage: mapping("partage_incompatible"),
  "mob réd": mapping("fauteuil"),
  mt: premierVrai(["mode_individual", "Oui"], ["mode_public", "non"]),
  accomp: mapping("accompagnant"),

  // ---- ③ trajet -------------------------------------------------------------
  "dép dom": mapping("depart_domicile"),
  "dép struct soin": mapping("depart_structure"),
  "dép aut lieu": mapping("depart_autre"),
  "arr dom": mapping("arrivee_domicile"),
  "arr struct soin": mapping("arrivee_structure"),
  "arr aut lieu": mapping("arrivee_autre"),
  "a/r": mapping("aller_retour"),

  // ---- ④ périodicité des permissions ---------------------------------------
  "tr mois": auPrescripteur(
    "unité non confirmée par la CNAM (trajets ou allers-retours), cf. le " +
      "README de la feuille de mapping — décision 4 de la spec 0009",
  ), // piège n° 2
  "dat freq per": dateDeLaFeuille("periode_fin"),
  "pério traj": auPrescripteur(
    "aucune ligne « pério traj » dans le mapping documentaire : ce champ " +
      "n'y est pas décrit, cf. les écarts de la spec 0009",
  ), // piège n° 3

  // ---- ⑤ lien avec une ALD ou un accident du travail -----------------------
  "ald exo": mapping("lien_ald"),
  etm: mapping("lien_atmp"),
  "dat AT/MP": dateDeLaFeuille("lien_atmp_date"),

  // ---- ⑥ exonération du ticket modérateur -----------------------------------
  exo: premierVrai(["exoneration_oui", "Oui"], ["exoneration_non", "non"]),

  // ---- Prescripteur et structure --------------------------------------------
  "nom med": mapping("prescripteur_nom_prenom"),
  rpps: mapping("prescripteur_rpps"),
  "rais soc": mapping("structure_nom"),
  "adress struct": mapping("structure_adresse"),
  siret: mapping("structure_identifiant"),
  // La feuille n'a pas de source pour `date_prescription` : comme sur le PMT et
  // la DAP, l'application la calcule hors mapping (`date-de-prescription.ts`).
  // Ce champ fait huit cases, comme sur le PMT.
  "dat pmt": écrit(() => dateDePrescription().replaceAll("/", "")),

  // ---- Cadre transporteur ----------------------------------------------------
  "raison sociale": mapping("cadre_transporteur"),
  adresse: mapping("cadre_transporteur"),
  "fait lieu": mapping("cadre_transporteur"),
  "dat fait le": mapping("cadre_transporteur"),
  "num ident transport": mapping("cadre_transporteur"),
};

// ---- implémentation ----

// Raccourci sur `depuisLeMapping`, toujours contre `RUBRIQUES_S3141` : ce
// tableau ne lit qu'une feuille. Les cases simples de ce gabarit s'exportent en
// `/Oui`, comme la DAP et non comme le PMT.
function mapping(id: string, état: ÉtatCoché = "Oui"): Remplissage {
  return depuisLeMapping(RUBRIQUES_S3141, id, état);
}

// Raccourci sur `premierVrai` de `mapping.ts`, toujours contre `RUBRIQUES_S3141`.
function premierVrai(
  ...paires: ReadonlyArray<readonly [id: string, état: ÉtatCoché]>
): Remplissage {
  return premierVraiSur(RUBRIQUES_S3141, ...paires);
}

/**
 * Une date de la feuille, reformatée pour l'un des champs peignés à huit cases
 * de ce gabarit — le seul format qu'il emploie, relevé par introspection sur les
 * cinq champs de date (`tiers_date`, `debut_hospitalisation`, `periode_fin`,
 * `lien_atmp_date`, et `date_prescription` hors mapping ci-dessus).
 */
function dateDeLaFeuille(id: string): Remplissage {
  return (réponses) => {
    const valeur = mapping(id)(réponses);
    return valeur && "texte" in valeur
      ? { texte: dateSurLeChamp(valeur.texte, 8) }
      : valeur;
  };
}
