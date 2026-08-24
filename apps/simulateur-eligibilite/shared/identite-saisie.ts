// Ce que le formulaire d'identification collecte, et comment savoir qu'il est
// complet. Ce sont des identifiants métier bruts, et cette forme n'atteint jamais
// le simulateur : le backend la convertit en identité pseudonymisée. Voir
// server/identification/pseudonymisation.ts et l'ADR-4.

/** Valeur sentinelle (hors référentiel) choisie dans la liste des prescripteurs. */
export const PRESCRIPTEUR_HORS_LISTE = "prescripteur_hors_liste";

// Le workflow est linéaire, décrit au §4 de docs/architecture/identification.md :
//   établissement → service → prescripteur (réel | « hors liste » → nom/prénom).
// Le service « Autre » est une entrée du référentiel comme les autres, une par
// établissement, avec ses propres prescripteurs et la même option « hors liste ».
// Les prescripteurs sans établissement de rattachement, en libéral, à la CNAM ou à
// la CPAM, sélectionnent l'établissement « Libéral / CNAM / CPAM / Autre ».
export type IdentiteSaisie = {
  /** id établissement du référentiel. */
  etabId: string;
  /** id service du référentiel (« Autre » compris). */
  serviceId?: string;
  /**
   * Vrai quand le service sélectionné est l'entrée « Autre » du référentiel. C'est
   * le front qui le porte, étant seul à connaître le libellé, pour que la
   * complétude, partagée entre front et back, puisse exiger `serviceLibre` sans
   * relire Grist.
   */
  serviceEstAutre?: boolean;
  /**
   * Service ou unité réel, saisi quand `serviceEstAutre` vaut vrai. Il est
   * obligatoire dans cette branche. Le backend crée ou réutilise ce vrai service et
   * y rattache le prescripteur, au lieu de « Autre », pour qu'à la connexion
   * suivante il soit listé sous son service réel.
   */
  serviceLibre?: string;
  /** id prescripteur du référentiel, ou `PRESCRIPTEUR_HORS_LISTE`. */
  prescripteurId?: string;
  /** si prescripteur hors liste : identité libre. */
  nom?: string;
  prenom?: string;
};

/**
 * Normalise un texte libre, sa casse et ses espaces superflus, pour que des saisies
 * quasi identiques tombent dans le même bucket. Il est partagé entre la
 * pseudonymisation, qui en fait un HMAC, et la déduplication des saisies libres
 * écrites dans le référentiel Grist.
 */
export const normalise = (s: string): string =>
  s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Vrai quand la branche saisie est complète. Il est partagé entre le front, qui
 * s'en sert pour activer le bouton de validation, et le backend, qui valide avec
 * lui `POST /api/identite-pseudonymisee`.
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

// ---- implémentation ----

function rempli(v: string | undefined): boolean {
  return (v ?? "").trim() !== "";
}
