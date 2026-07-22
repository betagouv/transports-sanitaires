// Contrats d'interface entre étapes de la pipeline.
//
// Chaque DTO ci-dessous est le schéma d'un artefact CSV produit par une étape et consommé
// par la suivante. Les regrouper ici rend explicite ce que chaque étape garantit en sortie
// et attend en entrée.
//
//   extract  ──TrajetRow──────────────▶ staging ──TrajetRow──────────────▶ marts
//   extract  ──EtablissementRow──────▶ reconcile ──EtablissementDimensionRow──▶ marts
//   marts    ──MartEtablissementRow──▶ (livrable)

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
 * Ligne du mart établissement (livrable de l'itération 1).
 * Produit par : marts → `build/marts/mart_etablissement.csv`.
 * `part = nb_plateforme / nb_reference` (hors art. 80) ; `""` (NULL) si pas de dénominateur.
 */
export interface MartEtablissementRow {
  finess_juridique: string;
  nom: string;
  ville: string;
  departement: string;
  annee: string;
  vehicule: VehiculeCanonique;
  nb_plateforme: number;
  nb_reference: number;
  part: number | "";
}
