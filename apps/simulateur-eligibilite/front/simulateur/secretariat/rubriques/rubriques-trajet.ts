// Le trajet, recopié du YAML documentaire de la v9.7 : les mêmes trois familles
// de lieux sur les trois formulaires, et les six composants d'adresse par
// extrémité que le pré-remplissage assemble sur l'unique ligne que le papier
// donne à chacune.
//
// Seul le domicile a une case ; « structure de soins » et « autre lieu »
// désignent des lignes où écrire le nom et l'adresse, et le livrable prévient :
// « ne jamais dessiner de coche ». Les composants d'adresse eux-mêmes n'ont rien
// à annoncer à la checklist — leur rendu `adresse` l'en écarte toujours, cf.
// `case-de-formulaire.ts` — mais ils comptent dans le mapping, et
// `outils-produit/beta/cerfa/mapping.ts` s'en sert pour composer la ligne.

import type { CaseDeFormulaire } from "../case-de-formulaire.ts";

export const TRAJET: readonly CaseDeFormulaire[] = [
  {
    id: "depart_domicile",
    libelle: "Départ : cocher « domicile ».",
    source: "cible_lieu_depart_type",
    rendu: "ligne",
    quand: { regle: "cible_lieu_depart_type", parmi: ["Domicile"] },
  },
  {
    id: "depart_structure",
    libelle: "Départ : nom et adresse sur la ligne « structure de soins ».",
    source: "cible_lieu_depart_type",
    rendu: "ligne",
    quand: {
      regle: "cible_lieu_depart_type",
      parmi: ["Structure de soins", "USLD"],
    },
  },
  {
    id: "depart_autre",
    libelle: "Départ : nom et adresse sur la ligne « autre lieu ».",
    source: "cible_lieu_depart_type",
    rendu: "ligne",
    quand: {
      regle: "cible_lieu_depart_type",
      parmi: ["EHPAD", "Autre lieu", "Établissement pénitentiaire"],
    },
  },
  {
    id: "arrivee_domicile",
    libelle: "Arrivée : cocher « domicile ».",
    source: "cible_lieu_arrivee_type",
    rendu: "ligne",
    quand: { regle: "cible_lieu_arrivee_type", parmi: ["Domicile"] },
  },
  {
    id: "arrivee_structure",
    libelle: "Arrivée : nom et adresse sur la ligne « structure de soins ».",
    source: "cible_lieu_arrivee_type",
    rendu: "ligne",
    quand: {
      regle: "cible_lieu_arrivee_type",
      parmi: ["Structure de soins", "USLD"],
    },
  },
  {
    id: "arrivee_autre",
    libelle: "Arrivée : nom et adresse sur la ligne « autre lieu ».",
    source: "cible_lieu_arrivee_type",
    rendu: "ligne",
    quand: {
      regle: "cible_lieu_arrivee_type",
      parmi: ["EHPAD", "Autre lieu", "Établissement pénitentiaire"],
    },
  },
  {
    id: "aller_retour",
    libelle: "Transport aller-retour.",
    source: "cible_case_aller_retour",
  },
];

export const ADRESSES_DU_TRAJET: readonly CaseDeFormulaire[] = [
  composantAdresse("depart", "nom", "cible_document_depart_nom"),
  composantAdresse("depart", "adresse", "cible_document_depart_adresse"),
  composantAdresse("depart", "complement", "cible_document_depart_complement"),
  composantAdresse(
    "depart",
    "code_postal",
    "cible_document_depart_code_postal",
  ),
  composantAdresse("depart", "commune", "cible_document_depart_commune"),
  composantAdresse("depart", "pays", "cible_document_depart_pays"),
  composantAdresse("arrivee", "nom", "cible_document_arrivee_nom"),
  composantAdresse("arrivee", "adresse", "cible_document_arrivee_adresse"),
  composantAdresse(
    "arrivee",
    "complement",
    "cible_document_arrivee_complement",
  ),
  composantAdresse(
    "arrivee",
    "code_postal",
    "cible_document_arrivee_code_postal",
  ),
  composantAdresse("arrivee", "commune", "cible_document_arrivee_commune"),
  composantAdresse("arrivee", "pays", "cible_document_arrivee_pays"),
];

// ---- implémentation ----

// Un composant d'une adresse : jamais montré seul, jamais coché — seulement lu
// par `mapping.ts` pour composer la ligne « structure de soins » ou « autre
// lieu ». Absent quand le lieu est le domicile, qui n'a pas de ligne à remplir.
function composantAdresse(
  prefixe: "depart" | "arrivee",
  suffixe: string,
  source: CaseDeFormulaire["source"],
): CaseDeFormulaire {
  return {
    id: `${prefixe}_${suffixe}`,
    source,
    rendu: "adresse",
    quand: {
      regle:
        prefixe === "depart"
          ? "cible_lieu_depart_type"
          : "cible_lieu_arrivee_type",
      sauf: ["Domicile"],
    },
  };
}
