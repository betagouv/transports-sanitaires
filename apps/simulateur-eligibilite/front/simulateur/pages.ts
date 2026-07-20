import type { FormPages, PageBuilder } from "@publicodes/forms";
import { ordreRegles } from "./engine";

// `pageBuilder` custom pour le modèle v3 **plat**. Le découpage par défaut de
// `@publicodes/forms` (`groupByNamespace`) s'appuie sur le premier segment du
// nom pointé ; les noms plats (`p1_situation_smur`…) n'en ont pas → toutes les
// questions atterrissent sur une page unique, dans l'ordre du graphe. On
// reconstitue ici des pages ordonnées par préfixe, sans réintroduire de
// hiérarchie pointée dans le modèle (qui rouvrirait le problème Publicodes Studio).

// Groupes de pages, dans l'ordre d'affichage. Un champ rejoint le PREMIER groupe
// dont un préfixe correspond.
const GROUPES: Array<{ titre: string; prefixes: string[] }> = [
  { titre: "Situation particulière", prefixes: ["p1_situation"] },
  { titre: "Motif du transport", prefixes: ["p1_motif"] },
  { titre: "Affection de longue durée (ALD)", prefixes: ["p1_ald"] },
  { titre: "Critères médicaux du transport", prefixes: ["p1_critere"] },
  {
    titre: "Autonomie du patient",
    prefixes: ["p1_autonomie", "p1_transport_partage", "p1_accompagnant"],
  },
  {
    titre: "Hospitalisation et détention",
    prefixes: ["p2_patient_hospitalise", "p2_exception", "p2_detenu"],
  },
  { titre: "Convocation ou avis d’audience", prefixes: ["p2_convocation"] },
  {
    titre: "Cas nécessitant un accord préalable",
    prefixes: [
      "p2_distance",
      "p2_transport_en_serie",
      "p2_avion",
      "p2_camsp",
      "p2_maternite",
      "p2_samsah",
      "p2_accompagnement",
    ],
  },
  {
    titre: "Informations de trajet",
    prefixes: [
      "p2_trajet",
      "p2_nombre",
      "p2_transport_urgence",
      "p2_accident",
      "p2_lie_",
    ],
  },
];

// Rang d'un champ dans l'ordre de déclaration du modèle (pour trier au sein d'une
// page selon l'intention métier plutôt que l'ordre du graphe).
const rang = (nom: string): number => {
  const i = ordreRegles.indexOf(nom);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
};

const indexGroupe = (nom: string): number =>
  GROUPES.findIndex((g) => g.prefixes.some((p) => nom.startsWith(p)));

// Découpe les champs (calculés par le moteur pour les cibles) en pages ordonnées.
export const construirePages: PageBuilder<string> = (fields): FormPages<string> => {
  const pages: FormPages<string> = GROUPES.map((g) => ({
    title: g.titre,
    elements: fields
      .filter((f) => g.prefixes.some((p) => f.startsWith(p)))
      .sort((a, b) => rang(a) - rang(b)),
  })).filter((page) => page.elements.length > 0);

  // Filet de sécurité : tout champ non rattaché à un groupe (nouveau préfixe non
  // prévu) forme une dernière page, plutôt que de disparaître silencieusement.
  const restants = fields
    .filter((f) => indexGroupe(f) === -1)
    .sort((a, b) => rang(a) - rang(b));
  if (restants.length > 0) {
    pages.push({ title: "Autres informations", elements: restants });
  }

  return pages;
};
