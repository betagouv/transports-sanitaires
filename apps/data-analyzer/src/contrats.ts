// Contrats d'interface entre étapes de la pipeline.
//
// Chaque DTO ci-dessous est le schéma d'un artefact CSV produit par une étape et consommé
// par la suivante. Les regrouper ici rend explicite ce que chaque étape garantit en sortie
// et attend en entrée.
//
//   extract  ──TrajetRow──────────▶ staging ──TrajetRow──▶ reconcile ──TrajetReconcilieRow──▶ marts
//   extract  ──EtablissementRow──▶ reconcile ──EtablissementDimensionRow──────────────────────▶ marts
//   extract  ──GhtRattachementRow─────────────▶ reconcile (rattache trajets au GHT) ──────────▶ marts
//   marts    ──▶ livrables (mart_juridique, mart_geographique, mart_ght, mart_hors_ght, mart_article80)

import type { Enveloppe, Role, VehiculeCanonique } from "./types.ts";

/**
 * Ligne de trajets normalisée — le DTO central du pipeline.
 * Produit par : extract, un fichier par source → `build/extract/trajets/<label>.csv`.
 * Puis par     : staging, réunis et agrégés     → `build/staging/trajets.csv`.
 * Consommé par : staging, puis marts.
 */
export interface TrajetRow {
  role: Role;
  source: string; // libellé neutre issu du mapping (traçabilité)
  finess_juridique: string;
  finess_geographique: string;
  ght_libelle: string;
  enveloppe: Enveloppe;
  annee: string;
  vehicule_canonique: VehiculeCanonique;
  nb_trajets: number;
}

/**
 * Rattachement d'un établissement (finess juridique) à son GHT.
 * Produit par : extract (source `referentiel-ght`) → `build/extract/ght.csv`.
 * Consommé par : reconcile (à venir, pour remonter trajets et référentiel au GHT — mart_ght).
 * Dérivé de l'open data data.gouv `etablissements-de-sante-par-ght` (voir l'adaptateur).
 */
export interface GhtRattachementRow {
  finess_juridique: string;
  ght_code: string; // identifiant stable du GHT (ex. « ght-ARA-01 »)
  ght_libelle: string;
  region: string; // préfixe région du code GHT (ex. « ARA »)
  raison_sociale: string; // libellé de l'entité juridique (aide au rapprochement plateforme GHT)
}

/**
 * Trajet **réconcilié** : comme `TrajetRow`, mais le `finess_juridique` est ré-clé sur
 * l'**autorité du référentiel** (le juridique du site géographique tel que le connaît le
 * référentiel national, et non celui déclaré par la source), et le GHT est rattaché.
 * Produit par : reconcile (re-clé + rattachement) → `build/reconcile/trajets.csv`.
 * Consommé par : marts (tous les livrables en dérivent, par agrégation à leur grain).
 */
export interface TrajetReconcilieRow {
  role: Role;
  source: string;
  finess_juridique: string; // autoritatif (via le référentiel), pas celui déclaré par la source
  finess_geographique: string;
  ght_code: string; // "" si l'établissement n'appartient à aucun GHT
  ght_libelle: string; // libellé source (texte libre de la plateforme au niveau GHT), sinon ""
  enveloppe: Enveloppe;
  annee: string;
  vehicule_canonique: VehiculeCanonique;
  nb_trajets: number;
}

/**
 * Établissement « brut », un par site (finess géographique), porteur de l'identité.
 * Produit par : extract (référentiels uniquement) → `build/extract/etablissements.csv`.
 * Consommé par : reconcile.
 */
export interface EtablissementRow {
  finess_juridique: string;
  finess_geographique: string;
  nom: string;
  ville: string;
  departement: string;
  categorie: string;
  score: number; // volume du site, pour élire le libellé représentatif du finess juridique
}

/**
 * Dimension établissement consolidée : un libellé représentatif par finess juridique.
 * Produit par : reconcile → `build/reconcile/etablissements.csv`.
 * Consommé par : marts (pour habiller le mart).
 */
export interface EtablissementDimensionRow {
  finess_juridique: string;
  nom: string;
  ville: string;
  departement: string;
  categorie: string;
}

/**
 * Cellule ratio commune aux marts « part » (mart_juridique / _geographique / _ght / _hors_ght).
 * Les colonnes d'identité (clé + libellés) varient selon le grain et sont ajoutées par le
 * mart ; le cœur du calcul est ici. `part = nb_plateforme / nb_reference` (hors art. 80) ;
 * `""` (NULL) si pas de dénominateur ; `alerte_qualite = "part>1"` quand le numérateur dépasse
 * le dénominateur (signal de qualité assumé, non corrigé).
 */
export interface CelluleRatio {
  annee: string;
  vehicule: VehiculeCanonique;
  nb_plateforme: number;
  nb_reference: number;
  part: number | "";
  alerte_qualite: string;
}
