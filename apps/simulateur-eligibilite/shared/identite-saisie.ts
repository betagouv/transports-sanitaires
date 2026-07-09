// Identité **saisie** au formulaire d'identification (identifiants métier bruts +
// éventuelle identité libre). Elle n'est jamais transmise telle quelle au
// simulateur : le backend la convertit en identité pseudonymisée — les noms/prénoms
// libres sont **HMAC**, jamais transmis en clair à l'analytics (voir
// server/identification/pseudonymisation.ts + ADR-4).
//
// Le workflow est à branches (voir docs/architecture/identification.md — §4) :
//   établissement réel → service réel → prescripteur (réel | « hors liste » → nom/prénom) ;
//   établissement réel → service « autre » → nom de service libre + nom/prénom ;
//   « non rattaché » → catégorie (libéral | CNAM) → nom/prénom.

/** Valeurs sentinelles (hors référentiel) choisies dans les listes déroulantes. */
export const ETAB_NON_RATTACHE = "etab_non_rattache";
export const SERVICE_AUTRE = "service_autre";
export const PRESCRIPTEUR_HORS_LISTE = "prescripteur_hors_liste";

/** Catégorie d'exercice quand l'utilisateur n'est pas rattaché à un établissement. */
export type Categorie = "liberal" | "cnam";

export type IdentiteSaisie = {
  /** id établissement du référentiel, ou `ETAB_NON_RATTACHE`. */
  etabId: string;
  /** si non rattaché : catégorie d'exercice. */
  categorie?: Categorie;
  /** si établissement réel : id service du référentiel, ou `SERVICE_AUTRE`. */
  serviceId?: string;
  /** si service « autre » : nom libre du service. */
  serviceLibre?: string;
  /** si service réel : id prescripteur du référentiel, ou `PRESCRIPTEUR_HORS_LISTE`. */
  prescripteurId?: string;
  /** si libéral/CNAM ou prescripteur hors liste : identité libre. */
  nom?: string;
  prenom?: string;
};

const rempli = (v: string | undefined): boolean => (v ?? "").trim() !== "";

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

  if (saisie.etabId === ETAB_NON_RATTACHE) {
    // non rattaché → catégorie + identité libre
    return !!saisie.categorie && rempli(saisie.nom) && rempli(saisie.prenom);
  }

  // établissement réel → service requis
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
