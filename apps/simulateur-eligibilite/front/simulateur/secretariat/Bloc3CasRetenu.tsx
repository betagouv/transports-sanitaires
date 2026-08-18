// Bloc 3 de la Page Résultat 2 — informations pour le corps médical : le cas
// retenu et les cases documentaires à reporter sur le formulaire. Chaque case n'est
// listée que si la simulation l'a établie, d'où le moteur en paramètre.

import type { moteur } from "../moteur";
import { type Article80, Article80CorpsMedical } from "./Article80";

// Libellé du cas retenu tel qu'attendu par le corps médical (plus explicite que
// la valeur brute de `cas_final`).
const CAS_RETENU: Record<string, string> = {
  "prescription médicale de transport": "Prescription Médicale de Transport",
  "demande accord préalable": "Demande d’Accord Préalable",
  "convocation ou avis audience":
    "Convocation ou avis d’audience valant prescription médicale de transport",
  "transport charge établissement":
    "Transport à charge de l’établissement de santé",
  "prestation non prise en charge par assurance maladie":
    "Prestation à l’origine du déplacement non prise en charge par l’Assurance Maladie",
  SMUR: "Transport par équipe SMUR",
  "bariatrique seul":
    "Contrainte bariatrique seule insuffisante pour une prise en charge Assurance Maladie",
  "permission sortie sans motif médical":
    "Permission de sortie demandée par le patient, sans motif médical",
  "non éligible assurance maladie dans ce parcours":
    "Non éligible Assurance Maladie dans ce parcours",
};

// Une case documentaire : soit un libellé toujours listé (checklist manuelle du
// praticien), soit un libellé conditionné par une règle du modèle — auquel cas
// il n'est affiché que si la simulation l'a établi.
type CaseItem =
  | string
  | { text: string; visible: (e: typeof moteur, transport: string) => boolean };

type Groupe = { titre?: string; icone?: string; items: CaseItem[] };

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

// Note corps médical propre à certains cas (v8.10) : rendue en complément de la
// checklist. Contenus repris de ui.yaml → result_pages.resultat_2.blocks.
function NoteCorpsMedical({
  casFinal,
  article80,
}: {
  casFinal: string;
  article80: Article80;
}) {
  if (casFinal === "prestation non prise en charge par assurance maladie") {
    return (
      <div className="fr-mt-2w">
        <p>
          L’absence de prise en charge de la consultation, du soin, de l’examen
          ou de la prestation à l’origine du déplacement exclut la prise en
          charge du transport dans ce parcours.
        </p>
        <p>
          Cette règle est prioritaire sur le mode de transport retenu, y compris
          lorsqu’une ambulance est médicalement justifiée.
        </p>
        <p>
          Ne pas établir de PMT ou de DAP ouvrant droit à une prise en charge
          par l’Assurance Maladie pour ce déplacement.
        </p>
      </div>
    );
  }
  if (casFinal === "transport charge établissement") {
    return (
      <div className="fr-mt-2w">
        <Article80CorpsMedical article80={article80} />
      </div>
    );
  }
  return null;
}

function texteItem(item: CaseItem): string {
  return typeof item === "string" ? item : item.text;
}

export function Bloc3CasRetenu({
  e,
  casFinal,
  transport,
  doc,
  article80,
}: {
  e: typeof moteur;
  casFinal: string;
  transport: string;
  doc: string;
  article80: Article80;
}) {
  const casRetenu = CAS_RETENU[casFinal] ?? casFinal;
  // Ne conserve que les cases établies par la simulation ; un groupe entièrement
  // filtré n'est pas affiché.
  const groupes = (CASES_BLOC3[casFinal] ?? [])
    .map((groupe) => ({
      ...groupe,
      items: groupe.items.filter(
        (item) => typeof item === "string" || item.visible(e, transport),
      ),
    }))
    .filter((groupe) => groupe.items.length > 0);

  return (
    <div className="fr-callout" style={{ marginBottom: "2rem" }}>
      <h3 className="fr-callout__title">
        <span className="fr-icon-hospital-line fr-mr-1w" aria-hidden="true" />
        Informations pour le corps médical
      </h3>

      <div className="fr-callout__text">
        <p>
          <strong>Cas retenu :</strong> {casRetenu}
        </p>
        <p>
          <strong>Transport sanitaire prescrit :</strong> {transport}
        </p>
        <p>
          <strong>Document à remettre au patient :</strong> {doc}
        </p>

        <NoteCorpsMedical casFinal={casFinal} article80={article80} />

        {groupes.length > 0 && (
          <>
            <hr className="fr-mt-3w fr-pb-1v" />
            <p className="fr-mb-3w">
              <strong>Cases à compléter ou cocher :</strong>
            </p>
            {/* Une colonne par groupe sur écran large (3 sections PMT ⇒ 3
                colonnes), empilées sur mobile. */}
            <div className="fr-grid-row fr-grid-row--gutters">
              {groupes.map((groupe) => (
                <div
                  key={groupe.titre ?? "sans-titre"}
                  className={`fr-col-12 fr-col-md-${Math.floor(
                    12 / groupes.length,
                  )}`}
                >
                  {groupe.titre && (
                    <p className="fr-mb-1v">
                      {groupe.icone && (
                        <span
                          className={`${groupe.icone} fr-mr-1w`}
                          aria-hidden="true"
                        />
                      )}
                      <strong>{groupe.titre}</strong>
                    </p>
                  )}
                  <ul>
                    {groupe.items.map((item) => (
                      <li key={texteItem(item)}>{texteItem(item)}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
