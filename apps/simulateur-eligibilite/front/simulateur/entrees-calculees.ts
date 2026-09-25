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
import type { CleDeRegle } from "./contrat-regles-publicodes";
import { exceptionSansLieu } from "./exception-sans-lieu";
import { lecteurs, texteBrut } from "./lecture-de-situation";

/**
 * La situation, augmentée de ce que l'application calcule. Les valeurs déjà
 * présentes sont **écrasées** : le modèle ne doit jamais recevoir d'une réponse
 * ce qu'il attend d'un calcul.
 */
export function avecEntreesCalculees(
  situation: Situation<string>,
  maintenant: Date = new Date(),
): Situation<string> {
  const lu = (cle: CleDeRegle) => texteBrut(situation[cle]);
  const debut = lu("p2_permission_debut");
  const fin = lu("p2_permission_fin");
  const heures = dureeEnHeures(debut, fin);
  return {
    ...situation,
    p0_date_reference_yyyymmdd: String(dateDeReference(maintenant)),
    p1_verrou_medical_valide: "oui",
    p2_permission_duree_heures: String(heures),
    p2_permission_rang_jour: String(
      rangDuJour(lu("p2_permission_debut_hospitalisation"), debut),
    ),
    p2_permission_dates_valides: oui(debut !== "" && fin !== "" && heures > 0),
    p2_permission_calendrier_valide: oui(
      dansLesSixMois(lu("p2_permission_debut_hospitalisation"), debut),
    ),
    p2_depart_format_valide: oui(formatValide(situation, "depart")),
    p2_arrivee_format_valide: oui(formatValide(situation, "arrivee")),
    p2_adresses_strictement_identiques: oui(adressesIdentiques(situation)),
    p2_types_lieux_valides: oui(typesLieuxValides(situation)),
    p2_qualification_declarations_valides: oui(
      qualificationDeclarationsValide(situation),
    ),
    p2_exceptions_trajet_valides: oui(exceptionsTrajetValides(situation)),
    p2_nombre_permission_dap_valide: NOMBRE_PERMISSION_DAP_VALIDE_PAR_DEFAUT,
    p2_validations_documentaires: "oui",
  };
}

// ---- implémentation ----

// TS973-09 (à porter) : le total déclaré n'est pas encore confronté à la
// période, la fréquence et les sens couverts de la permission. En attendant,
// aucune quantité n'est refusée — le comportement d'avant la v9.7.3, où ce
// contrôle n'existait pas.
const NOMBRE_PERMISSION_DAP_VALIDE_PAR_DEFAUT = "oui";

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

/** Les heures entre deux instants ISO, `0` si l'une des deux manque. */
function dureeEnHeures(debut: string, fin: string): number {
  const depuis = Date.parse(debut);
  const jusqua = Date.parse(fin);
  if (Number.isNaN(depuis) || Number.isNaN(jusqua)) return 0;
  return Math.max(0, (jusqua - depuis) / 3_600_000);
}

/**
 * Le rang du jour de la permission dans l'hospitalisation : les jours
 * calendaires écoulés, plus un. Le premier jour d'hospitalisation porte donc le
 * rang 1, et le S3141 s'ouvre au quatorzième.
 *
 * C'est la convention que le livrable dit **provisoire** : R.322-10-8 parle du
 * quatorzième jour, le formulaire de « plus de 14 jours », et l'éditeur attend
 * une confirmation de la CNAM. Elle est donc écrite ici, à un seul endroit.
 */
function rangDuJour(
  debutHospitalisation: string,
  debutPermission: string,
): number {
  const depuis = Date.parse(debutHospitalisation);
  const jusqua = Date.parse(debutPermission);
  if (Number.isNaN(depuis) || Number.isNaN(jusqua)) return 0;
  return Math.floor((jusqua - depuis) / 86_400_000) + 1;
}

/** La permission tombe-t-elle dans les six mois suivant le début d'hospitalisation ? */
function dansLesSixMois(debutHospitalisation: string, debutPermission: string) {
  const depuis = new Date(debutHospitalisation);
  const jusqua = new Date(debutPermission);
  if (Number.isNaN(depuis.getTime()) || Number.isNaN(jusqua.getTime()))
    return false;
  const limite = new Date(depuis);
  limite.setMonth(limite.getMonth() + 6);
  return jusqua >= depuis && jusqua <= limite;
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

// La seule combinaison de types que le contrat interdit d'emblée : un domicile
// aux deux bouts. Les autres contraintes de trajet dépendent du motif, et le
// modèle les porte lui-même.
function typesLieuxValides(situation: Situation<string>): boolean {
  const depart = texteBrut(situation.p2_trajet_depart);
  const arrivee = texteBrut(situation.p2_trajet_arrivee);
  if (depart === "" || arrivee === "") return true;
  return !(depart === "Domicile" && arrivee === "Domicile");
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
