// La variante d'une fiche patient positive (#135) : le libellé de mode sous
// lequel le catalogue de l'éditeur range le titre et le modus, et le rang du
// titre du prescripteur. Des fonctions pures des cibles, sans React.
//
// Les libellés sont ceux de `titles` dans le catalogue. Chaque mode que les
// règles peuvent donner en a un : un test le vérifie pour toutes les valeurs
// de `cible_mode_id`.

import type { Cibles } from "./declarations/cibles";

/** Le partage du transport : prouvé, écarté, ou que les réponses ne disent pas. */
export type Partage = "incompatible" | "possible" | "inconnu";

/** Le libellé de mode du catalogue ; absent si les règles n'ont pas de mode. */
export function libelleDuMode(cibles: Cibles): string | undefined {
  switch (cibles.cible_mode_id) {
    case "VEHICULE_PERSONNEL":
      return avecProche("Véhicule personnel", cibles);
    case "TRANSPORT_COMMUN":
      return avecProche("Transports en commun", cibles);
    case "TAP":
      return `TAP ${partage(cibles)}`;
    case "TPMR":
      return `TAP TPMR ${partage(cibles)}`;
    case "AMBULANCE":
      return ambulance(cibles);
    default:
      return undefined;
  }
}

/**
 * Le rang du titre du prescripteur : 0 pour un déplacement par ses propres
 * moyens, 1 pour un transport sanitaire.
 */
export function rangDuTitreDuPrescripteur(cibles: Cibles): 0 | 1 {
  const propre =
    cibles.cible_mode_id === "VEHICULE_PERSONNEL" ||
    cibles.cible_mode_id === "TRANSPORT_COMMUN";
  return propre ? 0 : 1;
}

/**
 * Ce que Q1.3 dit du partage. « Incompatible » est coché, « possible » est
 * validé sans cette case, et une réponse absente ne dit rien.
 */
export function partageDuTransport(cibles: Cibles): Partage {
  const incompatible = cibles.cible_transport_partage_incompatible;
  if (incompatible === true) return "incompatible";
  return incompatible === false ? "possible" : "inconnu";
}

// ---- implémentation ----

// Seul « non partagé » est prouvé par une case cochée. Le reste prend le
// libellé du partage possible : titre et modus sont les mêmes dans les deux.
function partage(cibles: Cibles): string {
  return partageDuTransport(cibles) === "incompatible"
    ? "non partagé"
    : "pouvant être partagé avec d’autres patients";
}

function avecProche(base: string, cibles: Cibles): string {
  return cibles.cible_personne_accompagnante === true
    ? `${base} avec proche accompagnant nécessaire`
    : base;
}

// Le fauteuil et la corpulence ne se prouvent que par les cibles : jamais par
// défaut.
function ambulance(cibles: Cibles): string {
  const fauteuil = cibles.cible_fauteuil_roulant === true;
  const bariatrique = cibles.cible_ambulance_equipement_bariatrique === true;
  if (fauteuil && bariatrique) return "Ambulance + TPMR + bariatrique";
  if (fauteuil) return "Ambulance + TPMR";
  return bariatrique ? "Ambulance avec équipement bariatrique" : "Ambulance";
}
