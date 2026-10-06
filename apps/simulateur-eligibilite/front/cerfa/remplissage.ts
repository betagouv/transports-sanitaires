// Ce qu'est un tableau de remplissage, et comment on le parcourt.
//
// La clé est le nom d'un champ du PDF. La valeur est une fonction des réponses.
// Une case du formulaire se comprend en lisant sa ligne.

import type { Saisie } from "./remplir-cerfa";

/** Qui remplira un champ que le simulateur ne déduit pas. */
type Qui = "le prescripteur" | "le transporteur" | "la caisse";

/**
 * Ce qu'un champ reçoit, les réponses lues :
 *
 *  - `{ texte }` / `{ coché }` / `{ texteMesuré }` : le simulateur a déduit
 *    quoi y écrire, ce dernier étant mesuré avant d'être écrit ;
 *  - `undefined` : il sait le déduire, mais cette situation ne l'appelle pas ;
 *  - `{ laisséÀ }` : il ne sait pas, et dit qui s'en chargera.
 *
 * Les deux derniers cas laissent le champ vierge de la même façon. Les distinguer
 * n'est pas pour le PDF : c'est pour qui lit le tableau.
 */
type Valeur =
  | { readonly texte: string }
  | { readonly coché: string }
  | { readonly texteMesuré: string }
  | { readonly laisséÀ: Qui; readonly raison: string }
  | undefined;

/** Comment un champ se remplit : une fonction des réponses, et rien d'autre. */
export type Remplissage<Reponses> = (réponses: Reponses) => Valeur;

/** Un formulaire entier : un champ AcroForm par clé, sans exception. */
export type Tableau<Reponses> = Readonly<Record<string, Remplissage<Reponses>>>;

/** Un texte écrit dans le champ. La chaîne vide le laisse vierge. */
export function écrit<Reponses>(
  quoi: (réponses: Reponses) => string,
): Remplissage<Reponses> {
  return (réponses) => {
    const texte = quoi(réponses);
    return texte === "" ? undefined : { texte };
  };
}

/** Un champ que le simulateur ne déduit pas, et qui le remplira à sa place. */
export function laisséÀ(qui: Qui, raison: string): Remplissage<unknown> {
  return () => ({ laisséÀ: qui, raison });
}

/** Les saisies que `tableau` déduit de `réponses`, champ par champ. */
export function saisiesDuTableau<Reponses>(
  tableau: Tableau<Reponses>,
  réponses: Reponses,
): Saisie[] {
  return Object.entries(tableau).flatMap(([champ, remplir]) =>
    saisieDe(champ, remplir(réponses)),
  );
}

// ---- implémentation ----

// Un champ laissé à quelqu'un et un champ sans objet laissent tous deux le PDF
// vierge : la distinction est faite pour qui lit le tableau, pas pour l'écriture.
function saisieDe(champ: string, valeur: Valeur): Saisie[] {
  if (valeur === undefined || "laisséÀ" in valeur) return [];
  return [{ champ, ...valeur }];
}
