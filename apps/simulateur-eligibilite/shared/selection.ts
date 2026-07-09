// Sélection d'identification produite par le formulaire (identifiants métier
// bruts + éventuelle identité libre). Elle n'est jamais transmise telle quelle au
// simulateur : le backend la convertit en contexte pseudonymisé — les noms/prénoms
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

export type Selection = {
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
 * Vrai quand la branche sélectionnée est complète. Partagé entre le front (activer
 * le bouton de validation) et le backend (valider `POST /api/contexte`).
 */
export function selectionComplete(sel: Selection): boolean {
  if (!rempli(sel.etabId)) return false;

  if (sel.etabId === ETAB_NON_RATTACHE) {
    // non rattaché → catégorie + identité libre
    return !!sel.categorie && rempli(sel.nom) && rempli(sel.prenom);
  }

  // établissement réel → service requis
  if (!rempli(sel.serviceId)) return false;
  if (sel.serviceId === SERVICE_AUTRE) {
    // service « autre » → nom du service + identité libre
    return rempli(sel.serviceLibre) && rempli(sel.nom) && rempli(sel.prenom);
  }

  // service réel → prescripteur requis
  if (!rempli(sel.prescripteurId)) return false;
  if (sel.prescripteurId === PRESCRIPTEUR_HORS_LISTE) {
    return rempli(sel.nom) && rempli(sel.prenom);
  }
  return true;
}
