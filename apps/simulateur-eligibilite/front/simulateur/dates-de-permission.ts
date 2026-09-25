// Les dates d'une permission de sortie, telles que le modèle les attend de
// l'application : la durée, le rang du jour dans l'hospitalisation, et deux
// verdicts. Réencodage de `datesOk` et de `permissionCalendar`
// (`technicalSituation`, v9.7.3).
//
// Les dates-heures se lisent à l'heure de Paris (`heure-de-paris.ts`), et
// les 48 heures sont des heures réelles : un week-end de passage à l'heure
// d'hiver en compte 49.

import type { Situation } from "publicodes";
import { instantDe, jourAParis, jourValide } from "./heure-de-paris";
import { lecteurs, nombreSaisi } from "./lecture-de-situation";

export type DatesDePermission = {
  /** La durée réelle de la première permission, `0` si ses dates manquent. */
  readonly heures: number;
  /**
   * Le rang du jour de la permission dans l'hospitalisation : les jours
   * écoulés, plus un. Le premier jour porte le rang 1, et le S3141 s'ouvre au
   * quatorzième. C'est la convention que le livrable dit **provisoire** : la
   * CNAM doit encore confirmer « quatorzième jour » contre « plus de 14
   * jours ».
   */
  readonly rangDuJour: number;
  /**
   * Des dates cohérentes : une hospitalisation commencée au plus tard
   * aujourd'hui, une permission qui la suit, et qui dure plus de zéro et au
   * plus 48 heures.
   */
  readonly valides: boolean;
  /**
   * Une période prescrite qui commence avec la première permission et finit
   * dans les six mois suivant l'hospitalisation, pour une fréquence entière de
   * 1 à 5 allers-retours par mois.
   */
  readonly calendrierValide: boolean;
};

/** Les dates de la permission décrite, `aujourdhui` au format `YYYY-MM-DD`. */
export function datesDePermission(
  situation: Situation<string>,
  aujourdhui: string,
): DatesDePermission {
  const { lu } = lecteurs(situation);
  const hospitalisation = lu("p2_permission_debut_hospitalisation");
  const debut = instantDe(lu("p2_permission_debut"));
  const fin = instantDe(lu("p2_permission_fin"));
  const heures =
    debut === undefined || fin === undefined ? 0 : (fin - debut) / HEURE;
  const premierJour = debut === undefined ? "" : jourAParis(debut);
  const valides =
    jourValide(hospitalisation) &&
    hospitalisation <= aujourdhui &&
    premierJour !== "" &&
    premierJour >= hospitalisation &&
    heures > 0 &&
    heures <= 48;
  return {
    heures: Math.max(0, heures),
    rangDuJour: valides ? joursEntre(hospitalisation, premierJour) + 1 : 0,
    valides,
    calendrierValide: calendrierValide(situation, hospitalisation, premierJour),
  };
}

/**
 * `n` mois calendaires après `jour`, ramenés au dernier jour du mois quand il
 * est plus court : le 31 mars mène au 30 septembre, pas au 1er octobre.
 */
export function ajouterMois(jour: string, n: number): string {
  const date = midi(jour);
  const quantieme = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + n);
  const dernier = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(quantieme, dernier));
  return date.toISOString().slice(0, 10);
}

// ---- implémentation ----

const HEURE = 3_600_000;

function calendrierValide(
  situation: Situation<string>,
  hospitalisation: string,
  premierJour: string,
): boolean {
  const { lu } = lecteurs(situation);
  const derniere = lu("p2_permission_periode_fin");
  const frequence = nombreSaisi(situation.p2_permission_ar_par_mois);
  if (!jourValide(hospitalisation) || !jourValide(derniere)) return false;
  if (premierJour === "") return false;
  if (!Number.isInteger(frequence) || frequence < 1 || frequence > 5)
    return false;
  return derniere >= premierJour && derniere <= ajouterMois(hospitalisation, 6);
}

function midi(jour: string): Date {
  return new Date(`${jour}T12:00:00Z`);
}

function joursEntre(depuis: string, jusqua: string): number {
  return Math.round(
    (midi(jusqua).getTime() - midi(depuis).getTime()) / 86_400_000,
  );
}
