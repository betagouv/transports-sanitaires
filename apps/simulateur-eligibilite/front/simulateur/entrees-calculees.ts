// Les quatorze entrées que l'application calcule et verse au modèle.
//
// Le contrat d'interface de la v9.7 les marque `owner: application`. Leur nom
// commence par `p1_` ou `p2_` comme celui d'une question, mais elles n'en sont
// pas une : le modèle attend d'elles une durée en heures, un rang de jour, la
// validité d'un format d'adresse — des choses qu'il ne sait pas calculer et
// qu'on ne demande pas à un prescripteur.
//
// Sans elles, le questionnaire les réclame comme le reste : `computeNextFields`
// rend toutes les variables manquantes, sans distinguer celles qui ont un énoncé
// de celles qui n'en ont pas. Le parcours s'ouvrait donc sur « p2_permission_
// duree_heures », une saisie sans question. Les verser à chaque recalcul est ce
// qui les retire du questionnaire, puisqu'une variable renseignée ne manque plus.
//
// C'est aussi ce que fait l'adaptateur de référence du livrable
// (`technicalSituation()`) : il recalcule ces entrées à chaque tour, et n'accepte
// jamais qu'elles viennent d'une réponse.

import type { Situation } from "publicodes";
import { datesDePermission } from "./dates-de-permission";
import { exceptionSansLieu } from "./exception-sans-lieu";
import { jourAParis } from "./heure-de-paris";
import { lecteurs, texteBrut } from "./lecture-de-situation";
import { lieuEffectif } from "./lieu-effectif";
import { causeDeRefus } from "./nombre-permission-dap";
import { validationsDocumentaires } from "./validations-documentaires";

/**
 * La situation, augmentée de ce que l'application calcule. Les valeurs déjà
 * présentes sont **écrasées** : le modèle ne doit jamais recevoir d'une réponse
 * ce qu'il attend d'un calcul.
 */
export function avecEntreesCalculees(
  situation: Situation<string>,
  maintenant: Date = new Date(),
): Situation<string> {
  const aujourdhui = jourAParis(maintenant.getTime());
  const dates = datesDePermission(situation, aujourdhui);
  return {
    ...situation,
    p0_date_reference_yyyymmdd: String(dateDeReference(maintenant)),
    p1_verrou_medical_valide: "oui",
    p2_permission_duree_heures: String(dates.heures),
    p2_permission_rang_jour: String(dates.rangDuJour),
    p2_permission_dates_valides: oui(dates.valides),
    p2_permission_calendrier_valide: oui(dates.calendrierValide),
    p2_depart_format_valide: oui(formatValide(situation, "depart")),
    p2_arrivee_format_valide: oui(formatValide(situation, "arrivee")),
    p2_adresses_strictement_identiques: oui(adressesIdentiques(situation)),
    p2_types_lieux_valides: oui(typesLieuxValides(situation)),
    p2_qualification_declarations_valides: oui(
      qualificationDeclarationsValide(situation),
    ),
    p2_exceptions_trajet_valides: oui(exceptionsTrajetValides(situation)),
    p2_nombre_permission_dap_valide: oui(causeDeRefus(situation) === undefined),
    p2_validations_documentaires: oui(
      validationsDocumentaires(situation, aujourdhui),
    ),
  };
}

// ---- implémentation ----

function oui(vrai: boolean): string {
  return vrai ? "oui" : "non";
}

/** La date du jour à Paris, au format `YYYYMMDD` que le modèle compare. */
function dateDeReference(maintenant: Date): number {
  const [jour, mois, annee] = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(maintenant)
    .split("/");
  return Number(`${annee}${mois}${jour}`);
}

// Un lieu est bien formé quand sa voie, sa commune et son code postal sont
// renseignés, et que le code postal a la forme attendue du pays. Le modèle ne
// vérifie aucun format : il reçoit le verdict.
function formatValide(
  situation: Situation<string>,
  lieu: "depart" | "arrivee",
): boolean {
  const lu = (suffixe: string) => texteBrut(situation[`p2_${lieu}_${suffixe}`]);
  const codePostal = lu("code_postal");
  const etranger = lu("pays") !== "";
  if (lu("adresse") === "" || lu("commune") === "") return false;
  return etranger ? codePostal !== "" : /^\d{5}$/.test(codePostal);
}

// Deux adresses comparées sur type, nom, voie, complément, code postal, ville et
// pays normalisés — accents, casse et espaces effacés. Deux structures de noms
// distincts à une même adresse ne sont pas identiques : c'est le contrat.
//
// Tant qu'un des deux lieux n'est pas décrit, la question ne se pose pas : deux
// adresses vides ont la même empreinte, et les déclarer identiques ferait croire
// au modèle à un trajet sur place avant même qu'on l'ait saisi.
function adressesIdentiques(situation: Situation<string>): boolean {
  if (!decrit(situation, "depart") || !decrit(situation, "arrivee"))
    return false;
  const empreinte = (lieu: "depart" | "arrivee") =>
    [
      texteBrut(situation[`p2_trajet_${lieu}`]),
      "nom_lieu",
      "adresse",
      "complement_adresse",
      "code_postal",
      "commune",
      "pays",
    ]
      .map((cle, rang) =>
        rang === 0 ? cle : texteBrut(situation[`p2_${lieu}_${cle}`]),
      )
      .map(normalise)
      .join("|");
  return empreinte("depart") === empreinte("arrivee");
}

// Un lieu est décrit dès qu'une de ses saisies porte quelque chose.
function decrit(
  situation: Situation<string>,
  lieu: "depart" | "arrivee",
): boolean {
  return ["adresse", "code_postal", "commune"].some(
    (cle) => texteBrut(situation[`p2_${lieu}_${cle}`]) !== "",
  );
}

function normalise(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Deux combinaisons de types que le contrat interdit, et que le modèle ne
// porte pas : un domicile aux deux bouts, et une permission qui ne relie pas
// une structure à un lieu de vie. Les autres contraintes de trajet dépendent
// du motif, et le modèle les porte lui-même.
// Les types lus sont les types effectifs, déduits compris (`lieu-effectif.ts`).
function typesLieuxValides(situation: Situation<string>): boolean {
  const depart = lieuEffectif(situation, "depart").type;
  const arrivee = lieuEffectif(situation, "arrivee").type;
  if (depart === "" || arrivee === "") return true;
  if (depart === "Domicile" && arrivee === "Domicile") return false;
  return permissionEntreStructureEtLieuDeVie(depart, arrivee, situation);
}

// Branche permission de `routeTypesValid` (v9.7.3) : une permission part d'une
// structure vers un lieu de vie, ou en revient seule, sans aller-retour
// identique (ROUTE-PERMISSION-HOSP-HOSP-REFUSED, PERM-TRAJET-INVALIDE-*).
function permissionEntreStructureEtLieuDeVie(
  depart: string,
  arrivee: string,
  situation: Situation<string>,
): boolean {
  const { lu } = lecteurs(situation);
  if (lu("p2_raison_principale") !== "Permission temporaire de sortie")
    return true;
  const structure = (type: string) =>
    ["Structure de soins", "USLD"].includes(type);
  const lieuDeVie = (type: string) =>
    ["Domicile", "Autre lieu", "EHPAD"].includes(type);
  const allerRetour =
    lu("p2_organisation_transports") === "aller-retour identique";
  return (
    (structure(depart) && lieuDeVie(arrivee)) ||
    (structure(arrivee) && lieuDeVie(depart) && !allerRetour)
  );
}

// Cohérence des déclarations brutes, indépendante des lieux : une contradiction
// entre la raison principale et une exception cochée ne doit produire aucune
// issue précoce. Réencodage TypeScript de `qualificationDeclarationsValid`
// (v9.7.3, `src/application.mjs`).
//
// Le contrôle générique du livrable — une mosaïque dont « Aucun » et une
// option sont tous deux cochés, notamment via une option devenue masquée —
// n'est pas porté ici : nos mosaïques ne permettent pas aujourd'hui cette
// combinaison, et l'introduire suppose le catalogue de groupes que les
// tickets de filtrage (masquage d'options) apportent.
function qualificationDeclarationsValide(
  situation: Situation<string>,
): boolean {
  const { lu, vrai } = lecteurs(situation);
  const raison = lu("p2_raison_principale");
  const retourPenitentiaire =
    vrai("p2_exception_retour_penitentiaire") ||
    vrai("p2_contexte_retour_penitentiaire");
  const raisonsIncompatiblesAvecLePenitentiaire = [
    "Entrée en hospitalisation",
    "Permission temporaire de sortie",
    "Transport vers un service d’urgences",
  ];
  if (
    retourPenitentiaire &&
    raisonsIncompatiblesAvecLePenitentiaire.includes(raison)
  )
    return false;
  if (
    vrai("p2_exception_admission_had") &&
    (retourPenitentiaire || raison === "Transport vers un service d’urgences")
  )
    return false;
  if (
    vrai("p2_exception_radiotherapie_moins_48h") &&
    (lu("p2_nature_transfert") !== "Provisoire" ||
      !vrai("p1_m0_seance_radiotherapie"))
  )
    return false;
  return true;
}

// Réencodage TypeScript de `exceptionsRouteValid` (v9.7.3,
// `src/application.mjs`). Les exceptions EHPAD/USLD se comparent aux types de
// lieu effectifs, déduits compris (`exception-sans-lieu.ts`, que l'écran de
// résultat relit pour nommer la réponse à corriger).
//
// La destination urgences, elle, se compare à l'arrivée **répondue** : c'est
// justement une réponse restée en arrière-plan qu'elle doit attraper.
//
// TS973-04 (famille AUD-ROUTE-URG-DEST) : une arrivée urgences déduit toujours
// « Structure de soins » (`p2_type_arrivee_deduit`, regles.publicodes), donc
// une réponse contraire ne peut venir que d'avant un changement de raison
// principale : un domicile, un EHPAD, une USLD, un autre lieu ou un
// établissement pénitentiaire laissé en arrière-plan. Cinq des sept
// contradictions de la famille ; les deux autres (retour pénitentiaire,
// admission HAD) sont déjà couvertes par `qualificationDeclarationsValide`.
function exceptionsTrajetValides(situation: Situation<string>): boolean {
  if (!qualificationDeclarationsValide(situation)) return false;
  if (exceptionSansLieu(situation)) return false;
  const { lu } = lecteurs(situation);
  const arrivee = lu("p2_trajet_arrivee");
  if (
    lu("p2_raison_principale") === "Transport vers un service d’urgences" &&
    arrivee !== "" &&
    arrivee !== "Structure de soins"
  )
    return false;
  return true;
}
