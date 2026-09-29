// Ce que le formulaire de rattachement collecte, et comment savoir qu'il est
// complet. Ce sont les identifiants du référentiel Grist : le front les garde en
// session et envoie l'id du service à Matomo, le backend s'en sert pour enrichir
// le référentiel. Voir l'ADR-4 de docs/knowledge/adr/identification.md.

// Le workflow est linéaire, décrit au §4 de docs/knowledge/adr/identification.md :
//   établissement → service. Le service « Autre » est une entrée du référentiel
// comme les autres, une par établissement. Les prescripteurs sans établissement
// de rattachement, en libéral, à la CNAM ou à la CPAM, sélectionnent
// l'établissement « Libéral / CNAM / CPAM / Autre ».
export type RattachementSaisi = {
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
   * obligatoire dans cette branche. Le backend crée ou réutilise ce vrai service,
   * pour qu'à la connexion suivante il soit listé sous son nom réel.
   */
  serviceLibre?: string;
};

/**
 * Normalise un texte libre, sa casse et ses espaces superflus, pour que des saisies
 * quasi identiques désignent la même chose. Il sert à la déduplication des
 * services écrits dans le référentiel Grist et à la reconnaissance du service
 * produit.
 */
export const normalise = (s: string): string =>
  s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Vrai quand la branche saisie est complète. Il est partagé entre le front, qui
 * s'en sert pour activer le bouton de validation, et le backend, qui valide avec
 * lui `POST /api/rattachement`.
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
