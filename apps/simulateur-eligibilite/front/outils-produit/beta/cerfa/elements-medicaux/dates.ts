// Les deux formats de date qu'EM-2 impose sur la zone médicale, inchangés
// depuis EM-1 : une date calendaire (`dateMedicale`) et un horaire de
// permission (`dateEtHeureDePermission`). Réencodage de `medicalDate` et
// `medicalDateTime` (`tmp/9.7.3/src/medical-text.mjs`), pour la zone médicale
// seulement — le reste du CERFA a son propre format, `dateSurLeChamp` dans
// `cerfa/dates.ts`.
//
// Le contrat exige un horaire avec décalage (`Z` ou `+02:00`) et lève sinon.
// `dateEtHeureAvecDecalage` porte cette exigence à la lettre, testée telle
// quelle. Mais la saisie de permission est un `datetime-local` sans décalage :
// appliquer le contrat à la lettre ferait échouer toute DAP à permission.
// Question ouverte 1 de la spec 0005, tranchée : `dateEtHeureDePermission` lit
// la saisie à l'heure de Paris (`instantDe`), en tire l'instant, et confie
// celui-ci, en UTC, à la fonction stricte. Une date-heure qui porte déjà son
// décalage se lit telle quelle.

import {
  instantDe,
  jourValide,
} from "../../../../simulateur/heure-de-paris.ts";

const DATE_ET_HEURE_AVEC_DECALAGE =
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/;

/** Une date `AAAA-MM-JJ`, écrite `JJ/MM/AAAA`. Lève sur une date invalide. */
export function dateMedicale(valeur: string): string {
  if (valeur === "") return "";
  if (!jourValide(valeur)) throw new TypeError("Date médicale ISO invalide.");
  return valeur.split("-").reverse().join("/");
}

/**
 * Un horaire `AAAA-MM-JJTHH:MM[:SS](Z|±HH:MM)`, écrit `JJ/MM/AAAA à HHhMM`,
 * heure de Paris. Réencodage fidèle de `medicalDateTime` : lève sur un
 * décalage absent, comme le contrat le demande.
 */
export function dateEtHeureAvecDecalage(valeur: string): string {
  if (valeur === "") return "";
  if (
    !DATE_ET_HEURE_AVEC_DECALAGE.test(valeur) ||
    !jourValide(valeur.slice(0, 10)) ||
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

/**
 * Une date-heure de permission, lue comme une heure de Paris quand elle n'a
 * pas de décalage (`datetime-local`, cf. l'en-tête), telle quelle sinon (une
 * seed ou le livrable).
 */
export function dateEtHeureDePermission(valeur: string): string {
  if (valeur === "") return "";
  const instant = instantDe(valeur);
  if (instant === undefined)
    throw new TypeError("Date et heure médicales invalides.");
  // Sans millisecondes : le format strict de `medicalDateTime` n'en veut pas.
  const iso = new Date(instant).toISOString().replace(/\.\d{3}Z$/, "Z");
  return dateEtHeureAvecDecalage(iso);
}
