// Lire une date-heure de permission comme l'éditeur la lit : à l'heure de
// Paris, quel que soit le fuseau de la machine qui calcule.
//
// Le formulaire rend des dates-heures sans fuseau (`datetime-local`,
// `'2026-01-20T10:00'`) : c'est l'heure de l'établissement. `Date.parse` les
// lirait à l'heure de la machine. En intégration continue, à l'heure UTC, un
// week-end de passage à l'heure d'hiver ferait alors 48 heures au lieu de 49.

/** Un jour `YYYY-MM-DD` qui existe au calendrier. */
export function jourValide(jour: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return false;
  const date = new Date(`${jour}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(jour);
}

/**
 * L'instant (en millisecondes) d'une date-heure ISO. Avec un fuseau, il est lu
 * tel quel. Sans fuseau, c'est l'heure de Paris. `undefined` si la saisie n'a
 * pas la forme d'une date-heure.
 */
export function instantDe(dateHeure: string): number | undefined {
  const morceaux = DATE_HEURE.exec(dateHeure);
  if (!morceaux || !jourValide(dateHeure.slice(0, 10))) return undefined;
  if (morceaux[7]) return Date.parse(dateHeure);
  const [, annee, mois, jour, heure, minute, seconde] = morceaux;
  const murale = Date.UTC(
    Number(annee),
    Number(mois) - 1,
    Number(jour),
    Number(heure),
    Number(minute),
    Number(seconde ?? 0),
  );
  // Le décalage ne change qu'aux bascules d'heure : une seconde passe suffit
  // à le reprendre au bon instant.
  return murale - decalageDeParis(murale - decalageDeParis(murale));
}

/** Le jour, à Paris, de cet instant. */
export function jourAParis(instant: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(instant));
}

// ---- implémentation ----

const DATE_HEURE =
  /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?(Z|[+-](?:0\d|1[0-4]):[0-5]\d)?$/;

// L'avance de l'heure de Paris sur UTC à cet instant : une heure en hiver, deux
// en été.
function decalageDeParis(instant: number): number {
  const parties = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Paris",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const lue = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parties.find((partie) => partie.type === type)?.value ?? 0);
  const murale = Date.UTC(
    lue("year"),
    lue("month") - 1,
    lue("day"),
    lue("hour"),
    lue("minute"),
    lue("second"),
  );
  return murale - Math.floor(instant / 1000) * 1000;
}
