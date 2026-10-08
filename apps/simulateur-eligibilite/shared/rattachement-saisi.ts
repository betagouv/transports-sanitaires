// Ce que le formulaire de rattachement collecte, et quand il est complet.
// Ce sont des identifiants du référentiel Grist.
// Voir docs/knowledge/adr/identification.md, ADR-4.

// Le workflow est linéaire : établissement → service (§4 de
// docs/knowledge/adr/identification.md). Chaque établissement a un service
// « Autre ». Les prescripteurs sans établissement (libéral, CNAM, CPAM)
// choisissent l'établissement « Libéral / CNAM / CPAM / Autre ».
export type RattachementSaisi = {
  /** id établissement du référentiel. */
  etabId: string;
  /** id service du référentiel (« Autre » compris). */
  serviceId?: string;
  /**
   * Vrai quand le service sélectionné est l'entrée « Autre ». Le front le
   * renseigne, car lui seul connaît le libellé. La complétude peut ainsi exiger
   * `serviceLibre` sans relire Grist.
   */
  serviceEstAutre?: boolean;
  /**
   * Le vrai service ou unité, obligatoire quand `serviceEstAutre` est vrai. Le
   * backend le crée ou le réutilise. Il est listé sous son nom à la visite
   * suivante.
   */
  serviceLibre?: string;
};

/**
 * Normalise un texte libre : casse et espaces superflus. Deux saisies presque
 * identiques désignent ainsi la même chose. Sert à dédupliquer les services
 * écrits dans Grist et à reconnaître le service produit.
 */
export const normalise = (s: string): string =>
  s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Vrai quand la saisie est complète. Le front s'en sert pour activer le bouton
 * de validation, le backend pour valider `POST /api/rattachement`.
 */
export function saisieComplete(saisie: RattachementSaisi): boolean {
  if (!rempli(saisie.etabId)) return false;

  // établissement → service requis
  if (!rempli(saisie.serviceId)) return false;
  // service « Autre » → saisie du service/unité réel obligatoire
  if (saisie.serviceEstAutre && !rempli(saisie.serviceLibre)) return false;
  return true;
}

// ---- implémentation ----

function rempli(v: string | undefined): boolean {
  return (v ?? "").trim() !== "";
}
