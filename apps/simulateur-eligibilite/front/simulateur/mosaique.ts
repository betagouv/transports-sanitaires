import type { EvaluatedFormElement, FormPageElementProp } from "@publicodes/forms";
import { reglesBrutes } from "./engine";

// Valeur booléenne d'un champ d'option, à trois états (vrai / faux / indéfini —
// non répondu). Selon le rendu, `@publicodes/forms` expose `checked` (case) ou
// `value` (radio oui/non). On distingue `false` (répondu non) de `undefined`.
export function valeurBool(
  el: EvaluatedFormElement & FormPageElementProp
): boolean | undefined {
  const v = "checked" in el ? el.checked : el.value;
  return typeof v === "boolean" ? v : undefined;
}

// Publicodes ne sait pas modéliser une question à **choix multiple** : une règle
// n'a qu'une valeur. Le cas multiple reste donc N règles booléennes indépendantes
// (p1_motif_hospitalisation, …). Pour l'UX, on pose sur une règle parente une
// métadonnée `mosaique` (convention reprise de nosgestesclimats) que le moteur
// ignore mais que l'UI lit pour rendre UNE question avec N cases à cocher.
// Ce module traduit ces métadonnées en descripteurs exploitables par le front.

export type Mosaique = {
  parentId: string;
  question: string;
  // Règles booléennes cochables (l'ordre suit la déclaration `options`).
  optionIds: string[];
  // Option d'exclusivité « aucun » : la cocher décoche toutes les autres.
  aucun?: { id: string; label: string };
};

type CorpsRegle = {
  question?: string;
  titre?: string;
  mosaique?: { options?: string[]; "option aucun"?: string };
};

function corps(id: string): CorpsRegle | undefined {
  const c = reglesBrutes[id as keyof typeof reglesBrutes];
  return c && typeof c === "object" ? (c as CorpsRegle) : undefined;
}

function libelle(id: string): string {
  const c = corps(id);
  return c?.question ?? c?.titre ?? id;
}

function construire(): Mosaique[] {
  const res: Mosaique[] = [];
  for (const nom of Object.keys(reglesBrutes)) {
    const meta = corps(nom)?.mosaique;
    if (!meta) continue;
    const aucunId = meta["option aucun"];
    res.push({
      parentId: nom,
      question: libelle(nom),
      optionIds: meta.options ?? [],
      aucun: aucunId ? { id: aucunId, label: libelle(aucunId) } : undefined,
    });
  }
  return res;
}

export const mosaiques = construire();

// Index : identifiant d'option (ou d'« aucun ») → mosaïque parente.
const parOption = new Map<string, Mosaique>();
for (const m of mosaiques) {
  for (const id of m.optionIds) parOption.set(id, m);
  if (m.aucun) parOption.set(m.aucun.id, m);
}

export const mosaiqueDe = (id: string): Mosaique | undefined => parOption.get(id);
