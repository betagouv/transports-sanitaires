// L'ordre du parcours, déclaré.
//
// Il ne l'a pas toujours été. Jusqu'ici, l'ordre des questions **se déduisait**
// de ce qui manquait au moteur : `computeNextFields` classe les variables
// manquantes par le score que publicodes leur attribue — en gros, le nombre de
// fois qu'une cible les réclame —, et le parcours suivait ce classement.
// Personne ne l'avait choisi : il tombait du graphe, et changeait avec lui. Une
// règle citée une fois de plus pouvait déplacer sa question.
//
// Le contrat d'interface du modèle demande l'inverse : une liste ordonnée
// d'étapes, dont les variables manquantes ne sont plus qu'un diagnostic. C'est
// cette liste. Les étapes portent les identifiants du livrable — ceux que le
// modèle inscrit lui-même en `spec_id` sur chaque question, et sous lesquels
// l'éditeur les désigne.
//
// L'ordre inscrit ici est celui que le parcours suivait déjà : il a été relevé
// sur les trente-deux situations de référence, qui s'accordent sans exception.
// Le déclarer ne change donc rien à ce que voit le prescripteur ; ce qui change,
// c'est qu'il tient désormais à une décision plutôt qu'à un classement.

import { reglesBrutes } from "../moteur";

/**
 * Les étapes du questionnaire, dans l'ordre où elles se posent. La Partie 1
 * d'abord, la Partie 2 ensuite : ce sont deux parcours distincts, et aucune
 * situation ne les mêle, mais les écrire à la suite dit le tout dans un ordre.
 *
 * Les douze saisies d'adresse (D1-D12) figurent une à une : c'est
 * `pagination.ts` qui les réunit en deux pages, une par lieu.
 */
export const ETAPES = [
  // Partie 1 — la décision médicale.
  "Q1",
  "Q1.1",
  "M0",
  "M4",

  // Partie 2 — le cas administratif.
  "M1.1",
  "A0.1",
  "A0.2",
  "A1.1",
  "A1.2",
  "A1.3",
  "A2.1",
  "A2.3",
  "A2.4",
  "A4.5",
  "A3.1",
  "A3.2",
  "A3.4",
  "A3.3",
  "A4.1",
  "A4.2",
  "A4.3",
  "D1",
  "D2",
  "D3",
  "D4",
  "D5",
  "D6",
  "D7",
  "D8",
  "D9",
  "D10",
  "D11",
  "D12",
  "A4.6",
] as const;

export type Etape = (typeof ETAPES)[number];

/**
 * L'étape à laquelle appartient une question, telle que le modèle la nomme.
 *
 * Rend `undefined` pour une règle sans `spec_id` : le contrat n'en connaît pas,
 * et `tests/simulateur/etapes.test.ts` l'exige de chaque question. Une question
 * hors étape n'aurait pas de rang, donc pas de place dans le parcours.
 */
export function etapeDe(champ: string): Etape | undefined {
  const brut = reglesBrutes[champ as keyof typeof reglesBrutes];
  const spec =
    brut && typeof brut === "object" && "spec_id" in brut
      ? brut.spec_id
      : undefined;
  return typeof spec === "string" && RANGS.has(spec)
    ? (spec as Etape)
    : undefined;
}

/**
 * Le rang d'une étape dans le parcours. Ce qu'on ne sait pas placer prend le
 * rang qui suit la dernière étape : ces inconnues se retrouvent en queue, dans
 * l'ordre où elles sont venues, plutôt que dispersées au hasard d'un tri.
 */
export function rangDe(etape: string): number {
  return RANGS.get(etape) ?? ETAPES.length;
}

// ---- implémentation ----

const RANGS = new Map<string, number>(
  ETAPES.map((etape, rang) => [etape, rang]),
);
