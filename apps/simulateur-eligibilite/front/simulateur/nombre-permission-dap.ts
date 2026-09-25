// Le total de trajets qu'une DAP de permission peut couvrir (TS973-09, famille
// PERM-DAP-TOTAL-INCOMPATIBLE), et pourquoi un total saisi ne convient pas.
// Voir `docs/knowledge/domain/total-dap-permission.md`.

import type { Situation } from "publicodes";
import { ajouterMois } from "./dates-de-permission";
import { instantDe, jourAParis, jourValide } from "./heure-de-paris";
import { lecteurs, nombreSaisi, pasRepondu } from "./lecture-de-situation";
import { lieuEffectif } from "./lieu-effectif";

/**
 * Le plus grand total compatible avec la permission déclarée, `0` si elle ne
 * l'est pas. Réencodage de `permissionDapCapacity` (v9.7.3).
 *
 * C'est une **borne**, jamais un calendrier : elle ne fixe ni le jour ni la
 * durée des permissions futures. Un total inférieur est toujours admis.
 */
export function capaciteDeLaDap(situation: Situation<string>): number {
  const periode = periodeDeLaPermission(situation);
  if (!periode) return 0;
  const futures = permissionsFutures(periode);
  const retourCouvert = periode.jourDuRetour <= periode.derniere;
  if (allersRetoursIdentiques(situation))
    return ((retourCouvert ? 1 : 0) + futures) * 2;
  // En trajets simples, la première permission compte pour un trajet. Sauf si
  // ce trajet est le retour vers la structure et qu'il tombe après la période.
  const versUneStructure = ["Structure de soins", "USLD"].includes(
    lieuEffectif(situation, "arrivee").type,
  );
  return (versUneStructure && !retourCouvert ? 0 : 1) + futures;
}

/** Ce qui cloche dans un total saisi. */
export type CauseDeRefus =
  | "pas un entier"
  | "au-dela de la capacite"
  | "impair";

/**
 * Pourquoi le total saisi ne convient pas, ou `undefined` s'il convient.
 * Réencodage de `permissionDapCountValid` (v9.7.3), à un écart près : un total
 * pas encore répondu convient (voir la doc du domaine).
 */
export function causeDeRefus(
  situation: Situation<string>,
): CauseDeRefus | undefined {
  const saisie = situation.p2_nombre_transports_permission_dap;
  if (pasRepondu(saisie)) return undefined;
  const total = nombreSaisi(saisie);
  if (!Number.isInteger(total) || total < 1) return "pas un entier";
  if (total > capaciteDeLaDap(situation)) return "au-dela de la capacite";
  if (allersRetoursIdentiques(situation) && total % 2 !== 0) return "impair";
  return undefined;
}

/** L'organisation où chaque permission compte un aller et un retour. */
export function allersRetoursIdentiques(situation: Situation<string>): boolean {
  return (
    lecteurs(situation).lu("p2_organisation_transports") ===
    "aller-retour identique"
  );
}

// ---- implémentation ----

const HEURE = 3_600_000;

type Periode = {
  /** Le jour de la première permission, `YYYY-MM-DD`. */
  premiere: string;
  /** Le jour où la première permission se termine. */
  jourDuRetour: string;
  /** Le dernier jour de la période prescrite. */
  derniere: string;
  /** Le plafond d'allers-retours par mois, de 1 à 5. */
  quota: number;
};

// Une permission de plus de zéro et d'au plus 48 heures réelles, dans une
// période qui commence avec elle et finit dans les six mois suivant
// l'hospitalisation. Les jours se lisent à Paris (`heure-de-paris.ts`).
function periodeDeLaPermission(
  situation: Situation<string>,
): Periode | undefined {
  const { lu } = lecteurs(situation);
  const debut = instantDe(lu("p2_permission_debut"));
  const fin = instantDe(lu("p2_permission_fin"));
  const hospitalisation = lu("p2_permission_debut_hospitalisation");
  const derniere = lu("p2_permission_periode_fin");
  const quota = nombreSaisi(situation.p2_permission_ar_par_mois);
  if (debut === undefined || fin === undefined) return undefined;
  if (!(fin - debut > 0 && fin - debut <= 48 * HEURE)) return undefined;
  if (!jourValide(hospitalisation) || !jourValide(derniere)) return undefined;
  if (!Number.isInteger(quota) || quota < 1 || quota > 5) return undefined;
  const premiere = jourAParis(debut);
  if (derniere < premiere || derniere > ajouterMois(hospitalisation, 6))
    return undefined;
  return { premiere, jourDuRetour: jourAParis(fin), derniere, quota };
}

// Les permissions possibles après la première : au plus une par semaine, dans
// le plafond de son mois. La première réserve sa semaine et une occurrence de
// son mois. Une semaine à cheval sur deux mois peut puiser dans l'un ou
// l'autre : le couplage choisit l'affectation qui en place le plus.
function permissionsFutures(periode: Periode): number {
  const { premiere, jourDuRetour, derniere, quota } = periode;
  const plafonds = new Map<string, number>();
  const semaines = new Map<string, Set<string>>();
  const semaineDeLaPremiere = lundiDe(premiere);
  for (
    let jour = jourDuRetour;
    jour <= derniere;
    jour = ajouterJours(jour, 1)
  ) {
    const mois = jour.slice(0, 7);
    plafonds.set(mois, quota - (mois === premiere.slice(0, 7) ? 1 : 0));
    const semaine = lundiDe(jour);
    if (semaine === semaineDeLaPremiere) continue;
    semaines.set(semaine, (semaines.get(semaine) ?? new Set()).add(mois));
  }
  const creneaux = [...plafonds].flatMap(([mois, n]) =>
    Array.from({ length: Math.max(0, n) }, () => mois),
  );
  const candidats = [...semaines.values()].map((moisDeLaSemaine) =>
    creneaux.flatMap((mois, rang) => (moisDeLaSemaine.has(mois) ? [rang] : [])),
  );
  return couplageMaximal(candidats);
}

// Couplage biparti maximal par chemins augmentants : chaque semaine prend un
// créneau mensuel parmi ses candidats, quitte à déplacer une semaine déjà
// servie vers un autre créneau.
function couplageMaximal(candidats: readonly (readonly number[])[]): number {
  const occupants = new Map<number, number>();
  const reserver = (semaine: number, vus: Set<number>): boolean => {
    for (const creneau of candidats[semaine] ?? []) {
      if (vus.has(creneau)) continue;
      vus.add(creneau);
      const occupant = occupants.get(creneau);
      if (occupant === undefined || reserver(occupant, vus)) {
        occupants.set(creneau, semaine);
        return true;
      }
    }
    return false;
  };
  let servies = 0;
  for (let semaine = 0; semaine < candidats.length; semaine++)
    if (reserver(semaine, new Set())) servies++;
  return servies;
}

function midi(jour: string): Date {
  return new Date(`${jour}T12:00:00Z`);
}

function ajouterJours(jour: string, n: number): string {
  return new Date(midi(jour).getTime() + n * 24 * HEURE)
    .toISOString()
    .slice(0, 10);
}

function lundiDe(jour: string): string {
  return ajouterJours(jour, -((midi(jour).getUTCDay() + 6) % 7));
}
