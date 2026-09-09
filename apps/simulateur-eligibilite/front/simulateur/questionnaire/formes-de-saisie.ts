// La forme d'une saisie que le modèle ne sait pas dire.
//
// Publicodes ne connaît que quelques types, et la date n'en fait pas partie : la
// v9.7 déclare ses six saisies calendaires en `type: texte`, et le moteur les
// rend donc comme des champs libres. Le prescripteur y taperait une date à la
// main, dans le format qu'il veut, et l'application aurait à la deviner pour
// calculer une durée ou un rang de jour.
//
// Le contrat d'interface, lui, les distingue : `kind: date` pour quatre d'entre
// elles, `kind: datetime` pour les deux qui bornent une permission — la limite
// de quarante-huit heures se compte à l'heure près. Ce fichier en est la recopie,
// et `ChampDeFormulaire.tsx` la rend en `<input type="date">` ou
// `type="datetime-local"`, dont le navigateur garantit le format ISO.
//
// C'est la même mécanique que `etapes.ts` et `bornes-de-saisie.ts` : ce que le
// modèle a cessé de porter, le contrat le dit, et le code le recopie à un seul
// endroit.

import type { CleDeRegle } from "../contrat-regles-publicodes";

/** Les formes de saisie que l'interface sait rendre, hors texte libre. */
export type FormeDeSaisie = "date" | "datetime";

/**
 * La forme d'une saisie, quand le contrat en déclare une autre que le texte.
 * `undefined` partout ailleurs : le champ reste une saisie libre.
 */
export function formeDeSaisie(id: string): FormeDeSaisie | undefined {
  return FORMES[id as CleDeRegle];
}

// ---- implémentation ----

// Les six saisies calendaires de la v9.7. Les deux bornes d'une permission se
// prennent à l'heure : c'est d'elles que l'application tire la durée, qui décide
// de l'admissibilité au S3141.
const FORMES: Partial<Record<CleDeRegle, FormeDeSaisie>> = {
  p2_permission_debut_hospitalisation: "date",
  p2_permission_debut: "datetime",
  p2_permission_fin: "datetime",
  p2_permission_periode_fin: "date",
  p2_date_at_mp: "date",
  p2_date_accident_cause_par_tiers: "date",
};
