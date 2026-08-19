// Les critères médicaux et les cas particuliers, avec leurs descriptions
// vulgarisées destinées au patient.

import type { moteur } from "../moteur";

// Partagé entre la Page Résultat 1 (résultat médical) et la Page Résultat 2
// (document administratif), qui affichent le même bloc « Information destinée
// au patient ».
export type EntreeVulgarisee = {
  id: string;
  libelle: string;
  description: string;
};

// Aides et conditions particulières retenues — descriptions vulgarisées
// destinées au patient. L'ordre suit la mosaïque `p1_criteres_transport` (Q1.1)
// du modèle publicodes.
export const CRITERES: EntreeVulgarisee[] = [
  {
    id: "p1_critere_incapacite_deplacement_autonome",
    libelle: "Incapacité à se déplacer de manière autonome",
    description:
      "Votre pathologie, votre traitement ou un handicap ne vous permet pas de faire seul un long trajet, de prendre les transports en commun ni de conduire.",
  },
  {
    id: "p1_critere_aide_technique",
    libelle: "Aide technique et assistance pour monter dans le véhicule",
    description:
      "Vous utilisez un fauteuil roulant, un déambulateur ou des béquilles, et vous avez besoin d’aide pour monter dans le véhicule ou en descendre.",
  },
  {
    id: "p1_critere_aide_professionnel",
    libelle: "Aide d’un professionnel",
    description:
      "Aucun proche ne peut vous accompagner, et vous avez besoin d’un professionnel pendant le trajet ou pour les formalités liées au transport.",
  },
  {
    id: "p1_critere_hygiene_desinfection",
    libelle: "Règles d’hygiène ou désinfection du véhicule",
    description:
      "Votre état nécessite des conditions de transport limitant les risques liés à l’hygiène pendant le trajet.",
  },
  {
    id: "p1_critere_risque_effets_secondaires",
    libelle: "Risque d’effets secondaires, de malaise ou de complications",
    description:
      "Votre état peut entraîner un malaise, une fatigue importante ou une réaction nécessitant un transport plus encadré.",
  },
  {
    id: "p1_critere_fauteuil_sans_transfert",
    libelle: "Maintien dans le fauteuil roulant pendant le transport",
    description:
      "Le transport doit être adapté à votre fauteuil roulant et permettre le trajet sans transfert vers un siège classique.",
  },
  {
    id: "p1_critere_position_allongee_demi_assise",
    libelle: "Position allongée ou semi-allongée",
    description:
      "Votre état ne permet pas un transport assis classique pendant le trajet.",
  },
  {
    id: "p1_critere_brancardage_portage",
    libelle: "Brancardage ou portage",
    description:
      "Votre état nécessite une aide physique importante pour être installé, déplacé ou transféré, même sur une courte distance.",
  },
  {
    id: "p1_critere_surveillance_constante",
    libelle: "Surveillance constante et matériel de secours",
    description:
      "Votre état peut se dégrader pendant le trajet : une personne qualifiée doit vous surveiller, avec du matériel de secours à disposition.",
  },
  {
    id: "p1_critere_oxygene",
    libelle: "Administration d’oxygène",
    description:
      "Votre état nécessite la présence ou l’administration d’oxygène pendant le trajet.",
  },
  {
    id: "p1_critere_isolement_asepsie",
    libelle: "Isolement, asepsie ou désinfection stricts",
    description:
      "Votre état impose des conditions renforcées pour éviter un risque infectieux ou protéger votre santé.",
  },
  {
    id: "p1_critere_aucune_situation",
    libelle: "Aucune aide ou condition particulière",
    description:
      "Les informations renseignées ne montrent pas de besoin médical imposant une ambulance, un VSL, un taxi conventionné ou un véhicule adapté au fauteuil roulant.",
  },
];

// Cas particuliers médicaux — mosaïque `p1_cas_particuliers_medicaux` (M0). Ils
// ne changent pas le mode retenu, sauf le SMUR, la contrainte bariatrique seule
// et la permission de sortie, qui tranchent le parcours dès la Partie 1.
export const CAS_PARTICULIERS: EntreeVulgarisee[] = [
  {
    id: "p1_m0_smur",
    libelle:
      "Transport par une équipe SMUR — Structure Mobile d’Urgence et de Réanimation",
    description:
      "Votre état nécessite l’intervention d’une équipe médicale d’urgence pendant le transport.",
  },
  {
    id: "p1_m0_bariatrique",
    libelle: "Équipement bariatrique adapté requis",
    description:
      "Le véhicule utilisé doit disposer d’un équipement adapté à votre morphologie ou à votre poids.",
  },
  {
    id: "p1_m0_permission_sans_motif_medical",
    libelle: "Permission de sortie demandée sans motif médical",
    description:
      "Le déplacement correspond à une permission de sortie que vous avez demandée, sans motif médical.",
  },
  {
    id: "p1_m0_ald",
    libelle:
      "Soins ou examens liés à une ALD — Affection de Longue Durée — reconnue",
    description:
      "Le transport est lié à une maladie reconnue comme affection de longue durée par l’Assurance Maladie.",
  },
  {
    id: "p1_m0_seance",
    libelle: "Séance de dialyse, de radiothérapie ou de chimiothérapie",
    description:
      "Le transport est lié à une séance de soins répétée ou spécialisée, hémodialyse comprise.",
  },
  {
    id: "p1_m0_aucun",
    libelle: "Aucun cas médical particulier",
    description:
      "Aucune des situations médicales particulières prévues par le simulateur ne s’applique.",
  },
];

// Ne conserve que les entrees dont la règle publicodes s'évalue à vrai pour la
// situation courante du moteur.
export function retenus(
  e: typeof moteur,
  entrees: EntreeVulgarisee[],
): EntreeVulgarisee[] {
  return entrees.filter((entree) => e.evaluate(entree.id).nodeValue === true);
}

export function ListeVulgarisee({ entrees }: { entrees: EntreeVulgarisee[] }) {
  return (
    <ul>
      {entrees.map((entree) => (
        <li key={entree.id} style={{ marginBottom: "0.5rem" }}>
          <strong>{entree.libelle}</strong>
          <br />
          {entree.description}
        </li>
      ))}
    </ul>
  );
}
