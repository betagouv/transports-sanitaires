import type { engine } from "./engine";

// Critères médicaux et motifs ouvrant droit, avec descriptions vulgarisées
// destinées au patient. Partagé entre la Page Résultat 1 (résultat médical) et
// la Page Résultat 2 (document administratif), qui affichent le même bloc
// « Information destinée au patient ».
export type Item = { id: string; label: string; description: string };

// Critères médicaux retenus — descriptions vulgarisées destinées au patient.
// L'ordre suit la mosaïque `p1_critere` du modèle publicodes.
export const CRITERES: Item[] = [
  {
    id: "p1_critere_regles_hygiene",
    label: "Respect rigoureux de règles d’hygiène",
    description:
      "Votre état nécessite des conditions de transport limitant les risques liés à l’hygiène pendant le trajet.",
  },
  {
    id: "p1_critere_risques_effets_secondaires",
    label: "Risques d’effets secondaires pendant le transport",
    description:
      "Votre état peut entraîner un malaise, une fatigue importante ou une réaction nécessitant un transport plus encadré.",
  },
  {
    id: "p1_critere_fauteuil_sans_transfert",
    label: "Transport sans quitter le fauteuil roulant manuel ou électrique",
    description:
      "Le transport doit être adapté à votre fauteuil roulant et permettre le trajet sans transfert vers un siège classique.",
  },
  {
    id: "p1_critere_position_allongee_demi_assise",
    label: "Position allongée ou demi-assise",
    description:
      "Votre état ne permet pas un transport assis classique pendant le trajet.",
  },
  {
    id: "p1_critere_brancardage_portage",
    label: "Brancardage ou portage",
    description:
      "Votre état nécessite une aide physique importante pour être installé, déplacé ou transféré.",
  },
  {
    id: "p1_critere_surveillance_personne_qualifiee",
    label: "Surveillance par une personne qualifiée",
    description:
      "Votre état nécessite une surveillance particulière pendant le transport.",
  },
  {
    id: "p1_critere_oxygene",
    label: "Oxygène pendant le transport",
    description:
      "Votre état nécessite la présence ou l’administration d’oxygène pendant le trajet.",
  },
  {
    id: "p1_critere_asepsie",
    label: "Conditions d’asepsie",
    description:
      "Votre état impose des conditions renforcées pour éviter un risque infectieux ou protéger votre santé.",
  },
  {
    id: "p1_critere_aucune_situation_encadree",
    label: "Aucune situation nécessitant une prise en charge plus encadrée",
    description:
      "Les informations renseignées ne montrent pas de besoin médical imposant une ambulance, un VSL, un taxi conventionné ou un véhicule adapté au fauteuil roulant.",
  },
];

// Motifs ouvrant droit identifiés ou déduits — mêmes règles que
// `p1_motif_ouvrant_droit_identifie_ou_deduit` du modèle publicodes.
export const MOTIFS: Item[] = [
  {
    id: "p1_motif_hospitalisation",
    label: "Entrée ou sortie d’hospitalisation",
    description:
      "Le transport est lié à une hospitalisation, par exemple pour entrer à l’hôpital, en sortir, ou dans le cadre d’une prise en charge hospitalière.",
  },
  {
    id: "p1_motif_seance_chimio_radio_hemodialyse",
    label: "Séance de chimiothérapie, radiothérapie ou hémodialyse",
    description:
      "Le transport est lié à une séance de soins répétée ou spécialisée.",
  },
  {
    id: "p1_ald_validee",
    label: "Soins ou examens en lien avec une ALD — Affection de Longue Durée",
    description:
      "Le transport est lié à une maladie reconnue comme affection de longue durée, lorsque les conditions médicales nécessaires sont remplies.",
  },
  {
    id: "p1_motif_accident_travail_maladie_professionnelle",
    label: "Accident du travail ou maladie professionnelle",
    description:
      "Le transport est lié à des soins en rapport avec un accident du travail ou une maladie professionnelle.",
  },
  {
    id: "p1_motif_retour_etablissement_penitentiaire",
    label: "Retour vers établissement pénitentiaire avec prescription médicale",
    description:
      "Le transport concerne le retour vers un établissement pénitentiaire et repose sur une prescription médicale.",
  },
  {
    id: "p1_critere_ambulance",
    label: "Transport par ambulance justifié par l’état de santé du patient",
    description:
      "Votre état nécessite un transport en ambulance, par exemple en raison d’une position allongée, d’une surveillance, d’oxygène, d’un brancardage ou de conditions d’asepsie.",
  },
  {
    id: "p1_situation_smur",
    label:
      "Transport par équipe SMUR — Structure Mobile d’Urgence et de Réanimation",
    description:
      "Votre état nécessite l’intervention d’une équipe médicale d’urgence pendant le transport.",
  },
];

// Ne conserve que les items dont la règle publicodes s'évalue à vrai pour la
// situation courante du moteur.
export function retenus(e: typeof engine, items: Item[]): Item[] {
  return items.filter((item) => e.evaluate(item.id).nodeValue === true);
}

export function ListeVulgarisee({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} style={{ marginBottom: "0.5rem" }}>
          <strong>{item.label}</strong>
          <br />
          {item.description}
        </li>
      ))}
    </ul>
  );
}
