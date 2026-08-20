// Les cases documentaires à reporter sur le formulaire, par cas final.
//
// Chaque case est soit toujours listée (checklist manuelle du praticien), soit
// conditionnée par une règle du modèle — auquel cas elle n'apparaît que si la
// simulation l'a établie. C'est pourquoi la sélection demande le moteur.

import type { CleDeRegle } from "../contrat-regles-publicodes";
import type { moteur } from "../moteur";

// Une case documentaire : soit un libellé toujours listé (checklist manuelle du
// praticien), soit un libellé conditionné par une règle du modèle — auquel cas
// il n'est affiché que si la simulation l'a établi.
export type CaseDocumentaire =
  | string
  | {
      texte: string;
      visible: (e: typeof moteur, transport: string) => boolean;
    };

export type Groupe = {
  titre?: string;
  icone?: string;
  cases: CaseDocumentaire[];
};

// Section « Mode de transport » commune à la PMT et à la DAP. Chaque case n'est
// affichée que si la simulation l'a validée — conditions reprises du mapping
// documentaire du contrat d’interface, bloc 3 corps médical → « Mode de
// transport » → cases.visible_if.
const CASES_MODE_TRANSPORT: CaseDocumentaire[] = [
  {
    texte: "Ambulance.",
    visible: (_e, transport) => transport === "ambulance",
  },
  {
    texte: "Position allongée ou demi-assise.",
    visible: (e) => vrai(e, "p1_critere_position_allongee_demi_assise"),
  },
  {
    texte: "Surveillance par une personne qualifiée.",
    visible: (e) => vrai(e, "p1_critere_surveillance_constante"),
  },
  {
    texte: "Administration d’oxygène.",
    visible: (e) => vrai(e, "p1_critere_oxygene"),
  },
  {
    texte: "Brancardage ou portage.",
    visible: (e) => vrai(e, "p1_critere_brancardage_portage"),
  },
  {
    texte: "Conditions d’asepsie.",
    visible: (e) => vrai(e, "p1_critere_isolement_asepsie"),
  },
  {
    texte: "VSL ou taxi conventionné.",
    visible: (_e, transport) =>
      transport === "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
  },
  {
    texte: "Transport à mobilité réduite dans le fauteuil roulant.",
    visible: (_e, transport) =>
      transport ===
      "VSL (Véhicule Sanitaire Léger) TPMR (Transport de Personnes à Mobilité Réduite) ou taxi conventionné TPMR (Transport de Personnes à Mobilité Réduite)",
  },
  {
    texte: "Transport partagé incompatible.",
    visible: (e) => vrai(e, "cible_transport_partage_incompatible"),
  },
  {
    texte: "Moyen de transport individuel.",
    visible: (_e, transport) =>
      transport === "véhicule personnel ou transport en commun",
  },
  {
    texte: "Transport en commun terrestre.",
    visible: (_e, transport) =>
      transport === "véhicule personnel ou transport en commun",
  },
  {
    texte: "Personne accompagnante si nécessaire.",
    visible: (e) => vrai(e, "cible_accompagnant_necessaire"),
  },
];

// Cases à compléter ou cocher / éléments à vérifier, par cas final.
const CASES_BLOC3: Record<string, Groupe[]> = {
  "prescription médicale de transport": [
    {
      titre: "Situation permettant la prise en charge",
      icone: "fr-icon-health-book-line",
      cases: [
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
      cases: CASES_MODE_TRANSPORT,
    },
    {
      titre: "Trajet",
      icone: "fr-icon-road-map-line",
      cases: [
        "Départ.",
        "Arrivée.",
        "Aller-retour.",
        "Nombre de transports si applicable.",
        "Urgence si applicable.",
        "Éléments d’ordre médical justifiant le déplacement.",
      ],
    },
  ],
  "demande d’accord préalable": [
    {
      titre: "Situation nécessitant une DAP",
      icone: "fr-icon-health-book-line",
      cases: [
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
      cases: [
        "Hospitalisation ou séances.",
        "ALD — Affection de Longue Durée.",
        "Accident du travail ou maladie professionnelle.",
      ],
    },
    {
      titre: "Mode de transport",
      icone: "fr-icon-car-line",
      cases: CASES_MODE_TRANSPORT,
    },
    {
      titre: "Trajet",
      icone: "fr-icon-road-map-line",
      cases: [
        "Départ.",
        "Arrivée.",
        "Aller-retour.",
        "Nombre de transports.",
        "Urgence si applicable.",
        "Éléments d’ordre médical.",
      ],
    },
  ],
  "convocation ou avis d’audience": [
    {
      titre: "Éléments à vérifier",
      icone: "fr-icon-checkbox-circle-line",
      cases: [
        "Type de convocation ou d’avis.",
        "Mode de transport indiqué ou validé.",
        "Identité du patient.",
        "Date et lieu de convocation.",
        "Cohérence avec le transport sanitaire prescrit.",
      ],
    },
  ],
  "transport à la charge de l’établissement": [
    {
      titre: "Assurez-vous que ces éléments soient complétés",
      icone: "fr-icon-checkbox-line",
      cases: [
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
      cases: [
        "Intervention SMUR confirmée.",
        "Établissement ou service concerné.",
        "Organisation par l’équipe médicale ou l’établissement concerné.",
      ],
    },
  ],
  "prestation non prise en charge par l’Assurance Maladie": [],
  "bariatrique seul": [],
  "permission de sortie sans motif médical": [],
  "non éligible à une prise en charge par l’Assurance Maladie": [],
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
      cases: groupe.cases.filter(
        (laCase) => typeof laCase === "string" || laCase.visible(e, transport),
      ),
    }))
    .filter((groupe) => groupe.cases.length > 0);
}

export function texteDeCase(laCase: CaseDocumentaire): string {
  return typeof laCase === "string" ? laCase : laCase.texte;
}

// ---- implémentation ----

// Une règle du modèle s'évalue-t-elle à vrai pour la situation courante ? Le
// paramètre passe par `CleDeRegle` : une règle renommée en amont ne compile plus.
function vrai(e: typeof moteur, id: CleDeRegle): boolean {
  return e.evaluate(id).nodeValue === true;
}
