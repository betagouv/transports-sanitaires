// Lire une réponse telle qu'elle est dans la situation, sans passer par le
// moteur. C'est ce que font les calculs versés au modèle
// (`entrees-calculees.ts`) : ils préparent la situation que le moteur lira, et
// ne peuvent donc pas lui demander ce qu'il en pense.

import type { Situation } from "publicodes";
import type { CleDeRegle } from "./contrat-regles-publicodes";

/**
 * Une valeur de situation en texte nu. Le modèle reçoit les chaînes entre
 * quotes simples (`'2026-01-20T10:00'`), c'est leur forme publicodes.
 */
export function texteBrut(valeur: unknown): string {
  if (typeof valeur !== "string") return "";
  return valeur.startsWith("'") && valeur.endsWith("'")
    ? valeur.slice(1, -1)
    : valeur;
}

/** Les deux lectures d'une réponse : son texte nu, et si elle vaut « oui ». */
export function lecteurs(situation: Situation<string>) {
  const lu = (cle: CleDeRegle) => texteBrut(situation[cle]);
  const vrai = (cle: CleDeRegle) => lu(cle) === "oui";
  return { lu, vrai };
}

/**
 * Une réponse chiffrée : un nombre quand le formulaire l'a saisie, un texte
 * nu (`"4"`) quand une seed l'a posée. Un texte entre quotes (`"'4'"`) est une
 * chaîne pour le modèle, pas un nombre : il rend `NaN`, comme une saisie vide
 * ou illisible.
 */
export function nombreSaisi(valeur: unknown): number {
  if (typeof valeur === "number") return valeur;
  if (typeof valeur !== "string" || valeur.startsWith("'")) return Number.NaN;
  const texte = valeur.trim();
  return texte === "" ? Number.NaN : Number(texte);
}

/** Une réponse absente, ou vide : c'est la complétude qui la réclame. */
export function pasRepondu(valeur: unknown): boolean {
  return typeof valeur !== "number" && texteBrut(valeur).trim() === "";
}
