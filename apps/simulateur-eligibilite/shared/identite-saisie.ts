// Identité **saisie** au formulaire d'identification (identifiants métier bruts +
// éventuelle identité libre). Elle n'est jamais transmise telle quelle au
// simulateur : le backend la convertit en identité pseudonymisée — les noms/prénoms
// libres sont **HMAC**, jamais transmis en clair à l'analytics (voir
// server/identification/pseudonymisation.ts + ADR-4).
//
// Le workflow est linéaire (voir docs/architecture/identification.md — §4) :
//   établissement → service → prescripteur (réel | « hors liste » → nom/prénom).
// Le service « Autre » est une entrée du référentiel comme les autres (une par
// établissement), avec ses propres prescripteurs et la même option « hors liste ».
// **Cas particulier** : quand le prescripteur sélectionne « Autre », on lui demande
// **obligatoirement** de saisir son service/unité réel (`serviceLibre`). Le backend
// crée alors ce vrai service dans le référentiel et y rattache le prescripteur (au
// lieu de « Autre »), pour qu'à la connexion suivante il soit listé sous son service
// réel. Les prescripteurs sans établissement de rattachement (libéral, CNAM/CPAM,
// autre) sélectionnent l'établissement « Libéral / CNAM / CPAM / Autre » du référentiel.

/** Valeur sentinelle (hors référentiel) choisie dans la liste des prescripteurs. */
export const PRESCRIPTEUR_HORS_LISTE = "prescripteur_hors_liste";

export type IdentiteSaisie = {
  /** id établissement du référentiel. */
  etabId: string;
  /** id service du référentiel (« Autre » compris). */
  serviceId?: string;
  /**
   * Vrai quand le service sélectionné est l'entrée « Autre » du référentiel. Porté
   * par le front (seul à connaître le libellé) pour que la complétude — partagée
   * front/back — puisse exiger `serviceLibre` sans relire Grist.
   */
  serviceEstAutre?: boolean;
  /**
   * Service/unité réel saisi quand `serviceEstAutre` : **obligatoire** dans cette
   * branche. Le backend crée/réutilise ce service et y rattache le prescripteur.
   */
  serviceLibre?: string;
  /** id prescripteur du référentiel, ou `PRESCRIPTEUR_HORS_LISTE`. */
  prescripteurId?: string;
  /** si prescripteur hors liste : identité libre. */
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

  // établissement → service → prescripteur requis
  if (!rempli(saisie.serviceId)) return false;
  // service « Autre » → saisie du service/unité réel obligatoire
  if (saisie.serviceEstAutre && !rempli(saisie.serviceLibre)) return false;
  if (!rempli(saisie.prescripteurId)) return false;
  if (saisie.prescripteurId === PRESCRIPTEUR_HORS_LISTE) {
    // prescripteur hors liste → identité libre
    return rempli(saisie.nom) && rempli(saisie.prenom);
  }
  return true;
}

const rempli = (v: string | undefined): boolean => (v ?? "").trim() !== "";
