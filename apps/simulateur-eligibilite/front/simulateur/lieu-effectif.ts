// Le type effectif d'un bout du trajet : déduit du parcours quand il est
// certain, répondu sinon. Réencodage de `placeType` (v9.7.3).

import type { Situation } from "publicodes";
import { lecteurs } from "./lecture-de-situation";

/** Un bout du trajet : son type effectif, et s'il est déduit plutôt que répondu. */
export type LieuDuTrajet = { type: string; deduit: boolean };

/**
 * Le type **effectif** d'un bout du trajet. Un type répondu puis masqué par une
 * déduction (admission HAD, retour pénitentiaire) reste dans la situation, mais
 * ne décrit plus le trajet.
 */
export function lieuEffectif(
  situation: Situation<string>,
  bout: "depart" | "arrivee",
): LieuDuTrajet {
  const deduit = typeDeduit(situation, bout);
  if (deduit) return { type: deduit, deduit: true };
  return { type: lecteurs(situation).lu(`p2_trajet_${bout}`), deduit: false };
}

// ---- implémentation ----

// Dans l'ordre de priorité de `p2_lieu_depart_type_effectif` et
// `p2_lieu_arrivee_type_effectif` (regles.publicodes).
function typeDeduit(
  situation: Situation<string>,
  bout: "depart" | "arrivee",
): string | undefined {
  const { lu, vrai } = lecteurs(situation);
  const raison = lu("p2_raison_principale");
  if (vrai("p2_exception_admission_had"))
    return bout === "depart" ? "Structure de soins" : "Domicile";
  if (
    vrai("p2_exception_retour_penitentiaire") ||
    vrai("p2_contexte_retour_penitentiaire")
  )
    return bout === "depart"
      ? "Structure de soins"
      : "Établissement pénitentiaire";
  if (bout === "depart")
    return raison === "Sortie d’hospitalisation"
      ? "Structure de soins"
      : undefined;
  return raison === "Entrée en hospitalisation" ||
    raison === "Transport vers un service d’urgences"
    ? "Structure de soins"
    : undefined;
}
