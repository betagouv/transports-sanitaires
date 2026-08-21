// Ce qu'est un tableau de remplissage, et comment on le parcourt.
//
// Chaque CERFA en porte un : `pmt/remplissage-pmt.ts`, `dap/remplissage-dap.ts`.
// La clé y est le nom brut d'un champ AcroForm, la valeur une fonction des
// réponses de la simulation — de sorte qu'une case du formulaire se comprenne en
// lisant sa ligne. Ce module tient la forme commune ; les tableaux tiennent le
// fond.

import type { Saisie, ÉtatCoché } from "./remplir-cerfa.ts";
import type { Reponses } from "./reponses.ts";

/** Qui remplira un champ que le simulateur ne déduit pas. */
type Qui = "le prescripteur" | "le transporteur" | "la caisse";

/**
 * Ce qu'un champ reçoit, la situation lue :
 *
 *  - `{ texte }` / `{ coché }` — le simulateur a déduit quoi y écrire ;
 *  - `undefined` — il sait le déduire, mais cette situation ne l'appelle pas ;
 *  - `{ laisséÀ }` — il ne sait pas, et dit qui s'en chargera.
 *
 * Les deux derniers cas laissent le champ vierge de la même façon. Les distinguer
 * n'est pas pour le PDF : c'est pour qui lit le tableau.
 */
type Valeur =
  | { readonly texte: string }
  | { readonly coché: ÉtatCoché }
  | { readonly laisséÀ: Qui; readonly raison: string }
  | undefined;

/** Comment un champ se remplit : une fonction des réponses, et rien d'autre. */
export type Remplissage = (réponses: Reponses) => Valeur;

/** Un formulaire entier : un champ AcroForm par clé, sans exception. */
export type Tableau = Readonly<Record<string, Remplissage>>;

/** Une case cochée quand la situation le justifie, dans l'état d'export voulu. */
export function coche(
  quand: (réponses: Reponses) => boolean,
  coché: ÉtatCoché = "On",
): Remplissage {
  return (réponses) => (quand(réponses) ? { coché } : undefined);
}

/** Un texte écrit dans le champ. La chaîne vide le laisse vierge. */
export function écrit(quoi: (réponses: Reponses) => string): Remplissage {
  return (réponses) => {
    const texte = quoi(réponses);
    return texte === "" ? undefined : { texte };
  };
}

export function auPrescripteur(raison: string): Remplissage {
  return () => ({ laisséÀ: "le prescripteur", raison });
}

export function auTransporteur(raison: string): Remplissage {
  return () => ({ laisséÀ: "le transporteur", raison });
}

/** Rubriques que l'organisme d'assurance maladie renseigne après coup. */
export function àLaCaisse(raison: string): Remplissage {
  return () => ({ laisséÀ: "la caisse", raison });
}

/** Les saisies que `tableau` déduit de `réponses`, champ par champ. */
export function saisiesDuTableau(
  tableau: Tableau,
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
