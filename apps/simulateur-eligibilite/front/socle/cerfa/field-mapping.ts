// Ce qu'est un tableau de remplissage, et comment on le parcourt.
//
// La clé est le nom d'un champ du PDF. La valeur est une fonction des réponses.
// Une case du formulaire se comprend en lisant sa ligne.

import type { FieldEntry } from "./fill-cerfa";

/** Qui remplira un champ que le simulateur ne déduit pas. */
type Who = "le prescripteur" | "le transporteur" | "la caisse";

/**
 * Ce qu'un champ reçoit, selon les réponses :
 *
 *  - `{ text }` / `{ checked }` / `{ measuredText }` : le simulateur sait quoi
 *    écrire. Le dernier est mesuré avant d'être écrit ;
 *  - `undefined` : il sait le déduire, mais pas dans cette situation ;
 *  - `{ leftTo }` : il ne sait pas, et dit qui s'en chargera.
 *
 * Les deux derniers cas laissent le champ vide. La différence sert à qui lit le
 * tableau, pas au PDF.
 */
type FieldValue =
  | { readonly text: string }
  | { readonly checked: string }
  | { readonly measuredText: string }
  | { readonly leftTo: Who; readonly reason: string }
  | undefined;

/** Comment un champ se remplit : une fonction des réponses, et rien d'autre. */
export type FieldRule<Answers> = (answers: Answers) => FieldValue;

/** Un formulaire entier : un champ AcroForm par clé, sans exception. */
export type FieldMapping<Answers> = Readonly<
  Record<string, FieldRule<Answers>>
>;

/** Un texte écrit dans le champ. La chaîne vide le laisse vierge. */
export function textFrom<Answers>(
  read: (answers: Answers) => string,
): FieldRule<Answers> {
  return (answers) => {
    const text = read(answers);
    return text === "" ? undefined : { text };
  };
}

/** Un champ que le simulateur ne déduit pas, et qui le remplira à sa place. */
export function leftTo(who: Who, reason: string): FieldRule<unknown> {
  return () => ({ leftTo: who, reason });
}

/** Les entrées que `mapping` déduit de `answers`, champ par champ. */
export function entriesFrom<Answers>(
  mapping: FieldMapping<Answers>,
  answers: Answers,
): FieldEntry[] {
  return Object.entries(mapping).flatMap(([field, rule]) =>
    entryOf(field, rule(answers)),
  );
}

// ---- implémentation ----

// Un champ laissé à quelqu'un et un champ sans objet laissent le PDF vide de la
// même façon.
function entryOf(field: string, value: FieldValue): FieldEntry[] {
  if (value === undefined || "leftTo" in value) return [];
  return [{ field, ...value }];
}
