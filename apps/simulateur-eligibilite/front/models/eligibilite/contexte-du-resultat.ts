// Le contexte d'une fiche patient positive (#135) : la phrase qui dit pourquoi
// le transport est pris en charge, et le motif administratif que le modus
// reprend. Des fonctions pures de la trace, sans React.
//
// Un code de contexte n'est posé que si la cible qui le justifie est prouvée,
// jamais par défaut. Le contexte retenu est celui dont les `codes` sont
// exactement les codes établis. Les mots viennent du catalogue.

import type {
  IssuePositive,
  TexteCode,
} from "./declarations/catalogue-resultats";
import type { Cibles } from "./declarations/cibles";
import type { Trace } from "./trace-du-resultat";

/** Les codes de contexte que ces cibles établissent, dans l'ordre H, T, A, M, B. */
export function codesDeContexte(cibles: Cibles): readonly string[] {
  return CODES.filter(([, cible]) => cibles[cible] === true).map(
    ([code]) => code,
  );
}

/** La phrase du contexte, lexique rempli ; absente si aucun contexte ne convient. */
export function phraseDuContexte(
  issue: IssuePositive,
  trace: Trace,
): string | undefined {
  const texte = texteDesCodes(issue.contexts, trace.cibles);
  return texte && avecLeLexique(issue, trace, texte);
}

/** Le motif administratif du modus, lexique rempli ; absent si aucun ne convient. */
export function motifAdministratif(
  issue: IssuePositive,
  trace: Trace,
): string | undefined {
  const texte = texteDesCodes(issue.administrativeBases, trace.cibles);
  return texte && avecLeLexique(issue, trace, texte);
}

// ---- implémentation ----

// Chaque code, et la cible qui le prouve. Le M ne se pose que pour un mineur
// reconnu dont l'ALD n'est pas à 100 % : la cible l'établit déjà.
const CODES = [
  ["H", "cible_hospitalisation_ou_seances_assimilees"],
  ["T", "cible_situation_at_mp"],
  ["A", "cible_ald_juridiquement_qualifiante_3_ou_4_degres"],
  ["M", "cible_mineur_ald_non_exonerante_reconnue"],
  ["B", "cible_mode_ambulance"],
] as const satisfies readonly (readonly [string, keyof Cibles])[];

// Le texte dont les codes sont exactement ceux de la trace. Sans aucun code
// établi, aucune phrase ne s'applique.
function texteDesCodes(
  textes: readonly TexteCode[],
  cibles: Cibles,
): string | undefined {
  const etablis = codesDeContexte(cibles);
  if (etablis.length === 0) return undefined;
  return textes.find(({ codes }) => memesCodes(codes, etablis))?.text;
}

function memesCodes(
  codes: readonly string[],
  etablis: readonly string[],
): boolean {
  return (
    codes.length === etablis.length &&
    etablis.every((code) => codes.includes(code))
  );
}

// `{cadre_hospitalisation}` et `{lien_atmp}` se lisent dans le lexique. Une
// précision que les réponses ne prouvent pas prend le repli du catalogue :
// `H-GENERIQUE` pour l'hospitalisation, `ATMP` pour l'accident ou la maladie.
function avecLeLexique(
  issue: IssuePositive,
  trace: Trace,
  texte: string,
): string {
  const { hospitalisation, atmp } = issue.lexicon;
  const cadre = definition(
    hospitalisation,
    trace.precisions.hospitalisation,
    "H-GENERIQUE",
  );
  const lien = definition(atmp, trace.precisions.atmp, "ATMP");
  return texte
    .replaceAll("{cadre_hospitalisation}", cadre)
    .replaceAll("{lien_atmp}", lien);
}

function definition(
  entrees: readonly { id: string; text: string }[],
  id: string | undefined,
  repli: string,
): string {
  const trouvee =
    entrees.find((entree) => entree.id === id) ??
    entrees.find((entree) => entree.id === repli);
  return trouvee?.text ?? "";
}
