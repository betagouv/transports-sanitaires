// Les calculs de date de la permission d'un patient de moins de 20 ans (Q2.8).
//
// Une date s'écrit `AAAA-MM-JJ`, une date et une heure `AAAA-MM-JJTHH:mm`,
// comme les réponses. Les heures sont celles du patient, sans fuseau : on les
// compte comme un instant UTC, pour qu'un changement d'heure ne décale rien.
// Une saisie qui n'a pas ce format n'est comparée à rien.

const MS_PAR_HEURE = 3_600_000;
const MS_PAR_JOUR = 24 * MS_PAR_HEURE;

/** La durée maximale d'une permission, en heures. */
const DUREE_MAXIMALE_EN_HEURES = 48;
/** La première permission commence au 14e jour d'hospitalisation, ou après. */
const PREMIER_JOUR_AUTORISE = 14;

/** La permission commence-t-elle avant le jour de l'hospitalisation ? */
export function commenceAvantLHospitalisation(
  hospitalisation: string | undefined,
  debut: string | undefined,
): boolean {
  const jour = instant(hospitalisation);
  const commence = instant(debut);
  return jour !== undefined && commence !== undefined && commence < jour;
}

/**
 * Commence-t-elle avant le 14e jour d'hospitalisation ? Le jour de
 * l'hospitalisation est le jour 1 : le 14e jour, à minuit, est permis.
 */
export function commenceAvantLeQuatorzieme(
  hospitalisation: string | undefined,
  debut: string | undefined,
): boolean {
  const jour = instant(hospitalisation);
  const commence = instant(debut);
  return (
    jour !== undefined &&
    commence !== undefined &&
    commence < jour + (PREMIER_JOUR_AUTORISE - 1) * MS_PAR_JOUR
  );
}

/** La permission finit-elle en même temps que son début, ou avant ? */
export function finNonPosterieure(
  debut: string | undefined,
  fin: string | undefined,
): boolean {
  const commence = instant(debut);
  const finit = instant(fin);
  return commence !== undefined && finit !== undefined && finit <= commence;
}

/** Dure-t-elle plus de 48 heures ? 48 heures pile sont permises. */
export function depasseQuaranteHuitHeures(
  debut: string | undefined,
  fin: string | undefined,
): boolean {
  const commence = instant(debut);
  const finit = instant(fin);
  return (
    commence !== undefined &&
    finit !== undefined &&
    finit - commence > DUREE_MAXIMALE_EN_HEURES * MS_PAR_HEURE
  );
}

/**
 * La période finit-elle un jour avant la fin de la première permission ? Le
 * jour même est permis : la période se donne en jours, la permission en heures.
 */
export function periodeAvantLaFinDeLaPermission(
  finDeLaPeriode: string | undefined,
  finDeLaPermission: string | undefined,
): boolean {
  const periode = instant(finDeLaPeriode);
  const permission = instant(finDeLaPermission?.slice(0, 10));
  return (
    periode !== undefined && permission !== undefined && periode < permission
  );
}

// ---- implémentation ----

const FORMAT = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/;

/** L'instant d'une date, avec ou sans heure. Indéfini si elle est mal écrite. */
function instant(saisie: string | undefined): number | undefined {
  const lue = saisie === undefined ? null : FORMAT.exec(saisie);
  if (!lue) return undefined;
  const [annee, mois, jour, heure = 0, minute = 0] = lue
    .slice(1)
    .map((partie) => Number(partie ?? 0));
  const date = new Date(
    Date.UTC(annee ?? 0, (mois ?? 1) - 1, jour ?? 1, heure, minute),
  );
  return Number.isNaN(date.getTime()) ? undefined : date.getTime();
}
