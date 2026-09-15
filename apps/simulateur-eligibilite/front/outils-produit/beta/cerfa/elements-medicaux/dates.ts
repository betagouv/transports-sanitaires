// Les deux formats de date qu'EM-1 impose sur la zone médicale : une date
// calendaire (`dateMedicale`) et un horaire de permission (`dateEtHeureDePermission`).
// Réencodage de `medicalDate` et `medicalDateTime` (`tmp/9.7.1/src/medical-text.mjs`),
// pour la zone médicale seulement — le reste du CERFA a son propre format,
// `dateSurLeChamp` dans `cerfa/dates.ts`.
//
// EM-1 exige un horaire avec décalage (`Z` ou `+02:00`) et lève sinon.
// `dateEtHeureAvecDecalage` porte cette exigence à la lettre, testée telle
// quelle. Mais la saisie de permission est un `datetime-local` sans décalage :
// appliquer EM-1 à la lettre ferait échouer toute DAP à permission. Question
// ouverte 1 de la spec 0005, tranchée : `dateEtHeureDePermission` lit la
// saisie comme une heure de Paris et lui ajoute le décalage qui s'applique à
// cet instant avant de la confier à la fonction stricte.

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;
const DATE_ET_HEURE_AVEC_DECALAGE =
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/;

function dateISOValide(valeur: string): boolean {
  if (!DATE_ISO.test(valeur)) return false;
  const date = new Date(`${valeur}T12:00:00Z`);
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === valeur;
}

/** Une date `AAAA-MM-JJ`, écrite `JJ/MM/AAAA`. Lève sur une date invalide. */
export function dateMedicale(valeur: string): string {
  if (valeur === "") return "";
  if (!dateISOValide(valeur))
    throw new TypeError("Date médicale ISO invalide.");
  return valeur.split("-").reverse().join("/");
}

/**
 * Un horaire `AAAA-MM-JJTHH:MM[:SS](Z|±HH:MM)`, écrit `JJ/MM/AAAA à HHhMM`,
 * heure de Paris. Réencodage fidèle de `medicalDateTime` : lève sur un
 * décalage absent, comme EM-1 le demande.
 */
export function dateEtHeureAvecDecalage(valeur: string): string {
  if (valeur === "") return "";
  if (
    !DATE_ET_HEURE_AVEC_DECALAGE.test(valeur) ||
    !dateISOValide(valeur.slice(0, 10)) ||
    !Number.isFinite(+new Date(valeur))
  ) {
    throw new TypeError("Date et heure médicales invalides.");
  }
  const parties = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(valeur))
      .map((partie) => [partie.type, partie.value]),
  );
  return `${parties.day}/${parties.month}/${parties.year} à ${parties.hour}h${parties.minute}`;
}

/** Un `datetime-local` de permission, lu comme une heure de Paris — cf. l'en-tête. */
export function dateEtHeureDePermission(valeurLocale: string): string {
  if (valeurLocale === "") return "";
  return dateEtHeureAvecDecalage(avecLeDecalageDeParis(valeurLocale));
}

// ---- implémentation ----

// Le décalage qui s'applique à Paris à l'instant approximé par la saisie
// locale : au plus quelques heures d'erreur possible près d'un changement
// d'heure, sans conséquence puisque ce décalage ne sert qu'à choisir entre
// +01:00 et +02:00, jamais à convertir l'instant lui-même.
function avecLeDecalageDeParis(local: string): string {
  const approximatif = new Date(`${local}Z`);
  if (!Number.isFinite(+approximatif)) {
    throw new TypeError("Date et heure médicales invalides.");
  }
  const partie = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Paris",
    timeZoneName: "shortOffset",
  })
    .formatToParts(approximatif)
    .find((p) => p.type === "timeZoneName");
  const heures = (partie?.value ?? "GMT+1").replace("GMT", "");
  const signe = heures.startsWith("-") ? "-" : "+";
  const valeurHeures = heures.replace(/[+-]/, "").padStart(2, "0");
  return `${local}${signe}${valeurHeures}:00`;
}
