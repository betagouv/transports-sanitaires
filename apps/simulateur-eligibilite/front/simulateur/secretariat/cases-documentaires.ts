// Les cases documentaires à reporter sur le formulaire, par cas final.
//
// Chaque case est soit toujours listée (checklist manuelle du praticien), soit
// conditionnée par une règle du modèle — auquel cas elle n'apparaît que si la
// simulation l'a établie. C'est pourquoi la sélection demande le moteur.

import type { moteur } from "../moteur";

// Une case documentaire : soit un libellé toujours listé (checklist manuelle du
// praticien), soit un libellé conditionné par une règle du modèle — auquel cas
// il n'est affiché que si la simulation l'a établi.
export type CaseItem =
  | string
  | { text: string; visible: (e: typeof moteur, transport: string) => boolean };

export type Groupe = { titre?: string; icone?: string; items: CaseItem[] };

const vrai = (e: typeof moteur, id: string) =>
  e.evaluate(id).nodeValue === true;

// Section « Mode de transport » commune à la PMT et à la DAP. Chaque case n'est
// affichée que si la simulation l'a validée — conditions reprises du mapping
// documentaire (tmp/8.6/transports-sanitaires.ui.v8-6.yaml, bloc_3_corps_medical
// → « Mode de transport » → items.visible_if).
const MODE_TRANSPORT_ITEMS: CaseItem[] = [
  { text: "Ambulance.", visible: (_e, t) => t === "ambulance" },
  {
    text: "Position allongée ou demi-assise.",
    visible: (e) => vrai(e, "p1_critere_position_allongee_demi_assise"),
  },
  {
    text: "Surveillance par une personne qualifiée.",
    visible: (e) => vrai(e, "p1_critere_surveillance_personne_qualifiee"),
  },
  {
    text: "Administration d’oxygène.",
    visible: (e) => vrai(e, "p1_critere_oxygene"),
  },
  {
    text: "Brancardage ou portage.",
    visible: (e) => vrai(e, "p1_critere_brancardage_portage"),
  },
  {
    text: "Conditions d’asepsie.",
    visible: (e) => vrai(e, "p1_critere_asepsie"),
  },
  {
    text: "VSL ou taxi conventionné.",
    visible: (_e, t) => t === "VSL ou taxi conventionné",
  },
  {
    text: "Transport à mobilité réduite dans le fauteuil roulant.",
    visible: (_e, t) => t === "VSL TPMR ou taxi conventionné TPMR",
  },
  {
    text: "Transport partagé incompatible.",
    visible: (e) => vrai(e, "cible_transport_partage_incompatible"),
  },
  {
    text: "Moyen de transport individuel.",
    visible: (_e, t) => t === "véhicule personnel ou transport en commun",
  },
  {
    text: "Transport en commun terrestre.",
    visible: (_e, t) => t === "véhicule personnel ou transport en commun",
  },
  {
    text: "Personne accompagnante si nécessaire.",
    visible: (e) => vrai(e, "cible_accompagnant_necessaire"),
  },
];

// Cases à compléter ou cocher / éléments à vérifier, par cas final.
const CASES_BLOC3: Record<string, Groupe[]> = {
  "prescription médicale de transport": [
    {
      titre: "Situation permettant la prise en charge",
      icone: "fr-icon-health-book-line",
      items: [
        "Entrée ou sortie d’hospitalisation.",
        "Séance de chimiothérapie, radiothérapie ou hémodialyse.",
        "Transport en lien avec une ALD — Affection de Longue Durée — avec déficience ou incapacité.",
        "Accident du travail ou maladie professionnelle.",
        "Engagement maternité si applicable.",
      ],
    },
    {
      titre: "Mode de transport",
      icone: "fr-icon-car-line",
      items: MODE_TRANSPORT_ITEMS,
    },
    {
      titre: "Trajet",
      icone: "fr-icon-road-map-line",
      items: [
        "Départ.",
        "Arrivée.",
        "Aller-retour.",
        "Nombre de transports si applicable.",
        "Urgence si applicable.",
        "Éléments d’ordre médical justifiant le déplacement.",
      ],
    },
  ],
  "demande accord préalable": [
    {
      titre: "Situation nécessitant une DAP",
      icone: "fr-icon-health-book-line",
      items: [
        "Trajet aller supérieur à 150 km.",
        "Transports en série.",
        "Transport vers un CAMSP ou un CMPP.",
        "Engagement maternité.",
        "Transport par avion ou bateau de ligne régulière.",
        "Personne accompagnante si nécessaire.",
      ],
    },
    {
      titre: "Situation associée si avion ou bateau",
      icone: "fr-icon-ship-2-line",
      items: [
        "Hospitalisation ou séances.",
        "ALD — Affection de Longue Durée.",
        "Accident du travail ou maladie professionnelle.",
      ],
    },
    {
      titre: "Mode de transport",
      icone: "fr-icon-car-line",
      items: MODE_TRANSPORT_ITEMS,
    },
    {
      titre: "Trajet",
      icone: "fr-icon-road-map-line",
      items: [
        "Départ.",
        "Arrivée.",
        "Aller-retour.",
        "Nombre de transports.",
        "Urgence si applicable.",
        "Éléments d’ordre médical.",
      ],
    },
  ],
  "convocation ou avis audience": [
    {
      titre: "Éléments à vérifier",
      icone: "fr-icon-checkbox-circle-line",
      items: [
        "Type de convocation ou d’avis.",
        "Mode de transport indiqué ou validé.",
        "Identité du patient.",
        "Date et lieu de convocation.",
        "Cohérence avec le transport sanitaire prescrit.",
      ],
    },
  ],
  "transport charge établissement": [
    {
      titre: "Assurez-vous que ces éléments soient complétés",
      icone: "fr-icon-checkbox-line",
      items: [
        "Patient hospitalisé au moment du transport.",
        "Absence d’exception restant Assurance Maladie.",
        "Type de transport établissement.",
        "Départ.",
        "Arrivée.",
        "Date du transport.",
        "Transport sanitaire prescrit.",
        "Formulaire ou procédure interne de l’établissement.",
      ],
    },
  ],
  SMUR: [
    {
      titre: "Éléments à vérifier",
      icone: "fr-icon-checkbox-circle-line",
      items: [
        "Intervention SMUR confirmée.",
        "Établissement ou service concerné.",
        "Organisation par l’équipe médicale ou l’établissement concerné.",
      ],
    },
  ],
  "prestation non prise en charge par assurance maladie": [],
  "bariatrique seul": [],
  "permission sortie sans motif médical": [],
  "non éligible assurance maladie dans ce parcours": [],
};

// Les groupes du cas final, réduits aux cases que la simulation a établies. Un
// groupe entièrement filtré disparaît.
export function casesRetenues(
  casFinal: string,
  e: typeof moteur,
  transport: string,
): Groupe[] {
  return (CASES_BLOC3[casFinal] ?? [])
    .map((groupe) => ({
      ...groupe,
      items: groupe.items.filter(
        (item) => typeof item === "string" || item.visible(e, transport),
      ),
    }))
    .filter((groupe) => groupe.items.length > 0);
}

export function texteItem(item: CaseItem): string {
  return typeof item === "string" ? item : item.text;
}
