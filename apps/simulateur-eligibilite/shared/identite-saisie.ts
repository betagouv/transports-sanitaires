// Identité **saisie** au formulaire d'identification (identifiants métier bruts +
// éventuelle identité libre). Elle n'est jamais transmise telle quelle au
// simulateur : le backend la convertit en identité pseudonymisée — les noms/prénoms
// libres sont **HMAC**, jamais transmis en clair à l'analytics (voir
// server/identification/pseudonymisation.ts + ADR-4).
//
// Le workflow est à branches (voir docs/architecture/identification.md — §4) :
//   établissement → service réel → prescripteur (réel | « hors liste » → nom/prénom) ;
//   établissement → service « autre » → nom de service libre + nom/prénom.
// Les prescripteurs sans établissement de rattachement (libéral, CNAM/CPAM, autre)
// sélectionnent l'établissement « Libéral / CNAM / CPAM / Autre » du référentiel.

/** Valeurs sentinelles (hors référentiel) choisies dans les listes déroulantes. */
export const SERVICE_AUTRE = "service_autre";
export const PRESCRIPTEUR_HORS_LISTE = "prescripteur_hors_liste";

export type IdentiteSaisie = {
  /** id établissement du référentiel. */
  etabId: string;
  /** id service du référentiel, ou `SERVICE_AUTRE`. */
  serviceId?: string;
  /** si service « autre » : nom libre du service. */
  serviceLibre?: string;
  /** si service réel : id prescripteur du référentiel, ou `PRESCRIPTEUR_HORS_LISTE`. */
  prescripteurId?: string;
  /** si service « autre » ou prescripteur hors liste : identité libre. */
  nom?: string;
  prenom?: string;
};

/**
 * Normalise un texte libre (casse, espaces superflus) pour que des saisies quasi
 * identiques tombent dans le même « bucket ». Partagé entre la pseudonymisation
 * (HMAC) et la déduplication des saisies libres écrites dans le référentiel Grist.
 */
export const normalise = (s: string): string =>
  s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Vrai quand la branche saisie est complète. Partagé entre le front (activer le
 * bouton de validation) et le backend (valider `POST /api/identite-pseudonymisee`).
 */
export function saisieComplete(saisie: IdentiteSaisie): boolean {
  if (!rempli(saisie.etabId)) return false;

  // établissement → service requis
  if (!rempli(saisie.serviceId)) return false;
  if (saisie.serviceId === SERVICE_AUTRE) {
    // service « autre » → nom du service + identité libre
    return rempli(saisie.serviceLibre) && rempli(saisie.nom) && rempli(saisie.prenom);
  }

  // service réel → prescripteur requis
  if (!rempli(saisie.prescripteurId)) return false;
  if (saisie.prescripteurId === PRESCRIPTEUR_HORS_LISTE) {
    return rempli(saisie.nom) && rempli(saisie.prenom);
  }
  return true;
}

const rempli = (v: string | undefined): boolean => (v ?? "").trim() !== "";
