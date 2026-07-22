// Vocabulaire métier et contrat des adaptateurs de format.
//
// Les DTO échangés entre étapes de la pipeline sont, eux, dans contrats.ts.

import type { EtablissementRow, TrajetRow } from "./contrats.ts";

/** Enveloppe de financement, normalisée. */
export type Enveloppe = "Article 80" | "Hors Article 80";

/**
 * Type de transport canonique — la seule granularité commune à toutes les sources.
 * « Total » = ligne sans détail véhicule (art. 80 des plateformes au niveau GHT).
 */
export type VehiculeCanonique = "Ambulance" | "Assis" | "Autre" | "Total";

/**
 * Rôle d'un fichier dans l'analyse — porte la sémantique du calcul :
 *  - `referentiel-national` : dénominateur hors art. 80 (trajets remboursés au national) ;
 *  - `plateforme` : numérateur (trajets commandés/réalisés via une plateforme).
 */
export type Role = "plateforme" | "referentiel-national";

/** Une entrée de mapping.json : quel fichier réel, quel rôle, quel format. */
export interface MappingEntry {
  role: Role;
  format: string; // clé d'un adaptateur enregistré (voir 01-extract/adapteurs/registry.ts)
  location: string; // chemin résolu (absolu) vers le fichier source
  label: string; // identifiant neutre, unique
  options: Record<string, unknown>; // paramètres propres au format (ex. index de colonnes)
}

/** Sortie d'un adaptateur : lignes de trajets + éventuelle dimension établissements. */
export interface AdapterOutput {
  trajets: TrajetRow[];
  etablissements?: EtablissementRow[];
}

/** Contrat d'un adaptateur de format : un fichier → des lignes normalisées. */
export type Adapter = (location: string, entry: MappingEntry) => AdapterOutput;
