// Les questions à **choix multiple** du parcours, que publicodes ne sait pas
// modéliser nativement, et la lecture à trois états de leurs cases.

import type {
  EvaluatedFormElement,
  FormPageElementProp,
} from "@publicodes/forms";
import { reglesBrutes } from "../moteur";

export type Mosaique = {
  parentId: string;
  question: string;
  // Phrase indicative affichée sous la question — la `description` de la règle
  // parente. Le modèle la porte, l'interface la rend : rien ne la recopie.
  information?: string;
  // Règles booléennes cochables (l'ordre suit la déclaration `options`).
  optionIds: string[];
  // Option d'exclusivité « aucun » : la cocher décoche toutes les autres.
  aucun?: { id: string; libelle: string };
};

/**
 * Valeur booléenne d'un champ d'option, à trois états (vrai / faux / indéfini —
 * non répondu). Selon le rendu, `@publicodes/forms` expose `checked` (case) ou
 * `value` (radio oui/non). On distingue `false` (répondu non) de `undefined`.
 */
export function valeurBool(
  el: EvaluatedFormElement & FormPageElementProp,
): boolean | undefined {
  const v = "checked" in el ? el.checked : el.value;
  return typeof v === "boolean" ? v : undefined;
}

/** La mosaïque à laquelle appartient une option (ou son « aucun »), s'il y en a une. */
export function mosaiqueDe(id: string): Mosaique | undefined {
  return indexParOption().get(id);
}

// ---- implémentation ----
//
// Une règle publicodes n'a qu'une valeur : un choix multiple reste donc N règles
// booléennes indépendantes (p1_motif_hospitalisation, …). Pour l'UX, on pose sur
// une règle parente une métadonnée `mosaique` (convention reprise de
// nosgestesclimats) que le moteur ignore mais que l'UI lit pour rendre UNE
// question avec N cases à cocher. Ce module traduit ces métadonnées en
// descripteurs exploitables par le front.

type CorpsRegle = {
  question?: string;
  titre?: string;
  description?: string;
  mosaique?: { options?: string[]; "option aucun"?: string };
};

let parOption: Map<string, Mosaique> | undefined;

// Index identifiant d'option (ou d'« aucun ») → mosaïque parente, construit au
// premier accès : le balayage des règles n'a pas à courir au chargement du module.
function indexParOption(): Map<string, Mosaique> {
  if (parOption) return parOption;
  parOption = new Map();
  for (const mosaique of construire()) {
    for (const id of mosaique.optionIds) parOption.set(id, mosaique);
    if (mosaique.aucun) parOption.set(mosaique.aucun.id, mosaique);
  }
  return parOption;
}

function construire(): Mosaique[] {
  const res: Mosaique[] = [];
  for (const nom of Object.keys(reglesBrutes)) {
    const regle = corps(nom);
    if (!regle?.mosaique) continue;
    const meta = regle.mosaique;
    const aucunId = meta["option aucun"];
    res.push({
      parentId: nom,
      question: libelle(nom),
      information: regle.description,
      optionIds: meta.options ?? [],
      aucun: aucunId ? { id: aucunId, libelle: libelle(aucunId) } : undefined,
    });
  }
  return res;
}

function corps(id: string): CorpsRegle | undefined {
  const c = reglesBrutes[id as keyof typeof reglesBrutes];
  return c && typeof c === "object" ? (c as CorpsRegle) : undefined;
}

function libelle(id: string): string {
  const c = corps(id);
  return c?.question ?? c?.titre ?? id;
}
