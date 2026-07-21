
import type { Situation } from "publicodes";
import { engine } from "../simulateur/engine";
import { TraceDebug } from "../simulateur/TraceDebug";
import {
  CRITERES,
  MOTIFS,
  ListeVulgarisee,
  retenus,
} from "../simulateur/vulgarisation";

type Props = {
  situation: Situation<string>;
  onNouvelleSimulation: () => void;
};

// Teinte DSFR de l'alerte selon le cas final déterminé par le moteur.
const TEINTE: Record<string, "success" | "info" | "warning" | "error"> = {
  "prescription médicale de transport": "success",
  "demande accord préalable": "info",
  "convocation ou avis audience": "success",
  "transport charge établissement": "warning",
  SMUR: "warning",
  "bariatrique seul": "error",
  "permission sortie sans motif médical": "error",
  "non éligible assurance maladie dans ce parcours": "error",
};

// ————————————————————————————————————————————————————————————————
// Bloc 1 — Résultat final : titre + corps propres à chaque cas final.
// ————————————————————————————————————————————————————————————————

function Bloc1({
  casFinal,
  transport,
  transportPrescrit,
}: {
  casFinal: string;
  transport: string;
  transportPrescrit: boolean;
}) {
  const teinte = TEINTE[casFinal] ?? "info";

  const contenu = () => {
    switch (casFinal) {
      case "prescription médicale de transport":
        return {
          titre: "Vous êtes éligible à une prise en charge par l’Assurance Maladie",
          corps: (
            <>
              <p>
                Transport sanitaire prescrit : <strong>{transport}</strong>.
              </p>
              <p>
                Document à remettre au patient :{" "}
                <strong>Prescription Médicale de Transport</strong>.
              </p>
            </>
          ),
        };
      case "demande accord préalable":
        return {
          titre:
            "Vous êtes éligible sous réserve d’un accord préalable de l’Assurance Maladie",
          corps: (
            <>
              <p>
                Transport sanitaire prescrit : <strong>{transport}</strong>.
              </p>
              <p>
                Document à remettre au patient :{" "}
                <strong>Demande d’Accord Préalable</strong>.
              </p>
            </>
          ),
        };
      case "convocation ou avis audience":
        return {
          titre: "Vous êtes éligible",
          corps: (
            <>
              <p>
                Transport sanitaire prescrit : <strong>{transport}</strong>.
              </p>
              <p>
                Document patient : <strong>convocation ou avis d’audience</strong>.
              </p>
            </>
          ),
        };
      case "transport charge établissement":
        return {
          titre: "Transport à charge de l’établissement de santé",
          corps: (
            <>
              <p>
                Transport sanitaire prescrit : <strong>{transport}</strong>.
              </p>
              <p>
                Le transport doit être organisé ou encadré par l’établissement de
                santé.
              </p>
              <p>
                Document à remettre au patient :{" "}
                <strong>formulaire établissement ou document interne</strong>.
              </p>
            </>
          ),
        };
      case "SMUR":
        return {
          titre:
            "Transport par équipe SMUR — Structure Mobile d’Urgence et de Réanimation",
          corps: (
            <>
              <p>
                Transport sanitaire prescrit :{" "}
                <strong>transport par équipe SMUR</strong>.
              </p>
              <p>
                Le transport est organisé dans le cadre de l’urgence médicale, par
                l’équipe médicale ou l’établissement concerné.
              </p>
            </>
          ),
        };
      case "bariatrique seul":
        return {
          titre:
            "Aucun mode de transport n’est éligible à une prise en charge par l’Assurance Maladie au titre du seul motif « bariatrique ».",
          corps: (
            <p>Aucun transport sanitaire ne peut être prescrit par votre médecin.</p>
          ),
        };
      case "permission sortie sans motif médical":
        return {
          titre:
            "Aucun mode de transport n’est éligible à une prise en charge par l’Assurance Maladie au titre du seul motif « permission de sortie sans motif médical ».",
          corps: <p>Le transport reste à votre charge.</p>,
        };
      case "non éligible assurance maladie dans ce parcours":
        return transportPrescrit
          ? {
              // Variante B — transport prescrit mais non pris en charge ici.
              titre: "Vous n’êtes pas éligible à une prise en charge dans ce parcours",
              corps: (
                <>
                  <p>
                    Transport sanitaire prescrit par le médecin :{" "}
                    <strong>{transport}</strong>.
                  </p>
                  <p>Le transport reste à votre charge.</p>
                </>
              ),
            }
          : {
              // Variante A — aucun transport sanitaire prescrit.
              titre: "Aucun transport sanitaire ne peut être prescrit par votre médecin.",
              corps: (
                <p>
                  Le transport reste à votre charge si vous décidez de
                  l’organiser.
                </p>
              ),
            };
      default:
        return { titre: casFinal, corps: null };
    }
  };

  const { titre, corps } = contenu();

  return (
    <div
      className={`fr-alert fr-alert--${teinte}`}
      style={{ marginBottom: "2rem" }}
    >
      <h3 className="fr-alert__title">{titre}</h3>
      {corps}
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
// Bloc 2 — Information destinée au patient.
// ————————————————————————————————————————————————————————————————

// Prise en charge / reste à charge, formulation propre à chaque cas final.
const RESTE_A_CHARGE: Record<string, string> = {
  "prescription médicale de transport":
    "Votre transport peut être pris en charge par l’Assurance Maladie selon les règles applicables à votre situation. Un reste à charge peut exister selon vos droits, votre couverture complémentaire et les frais non couverts.",
  "demande accord préalable":
    "Votre transport peut être pris en charge par l’Assurance Maladie uniquement si l’accord préalable est obtenu. Un reste à charge peut exister selon vos droits, votre couverture complémentaire et les frais non couverts.",
  "convocation ou avis audience":
    "La convocation ou l’avis d’audience sert de document patient pour votre transport. La prise en charge dépend des règles applicables à cette convocation ou à cet avis. Un reste à charge peut exister selon votre situation.",
  "transport charge établissement":
    "Ce transport est à la charge de l’établissement de santé. Le service ou le secrétariat de l’établissement vous indiquera les modalités d’organisation applicables.",
  SMUR: "Ce transport est organisé dans le cadre de l’urgence médicale. Les éventuelles informations de facturation ou de prise en charge sont communiquées par l’établissement concerné.",
  "bariatrique seul":
    "Aucune prise en charge par l’Assurance Maladie n’est ouverte au titre du seul motif bariatrique. Les solutions éventuelles et leur coût doivent être vus avec le service médical ou le secrétariat.",
  "permission sortie sans motif médical": "Le transport reste à votre charge.",
  "non éligible assurance maladie dans ce parcours":
    "Le transport reste à votre charge.",
};

function SousTitre({ icone, children }: { icone: string; children: string }) {
  return (
    <h4 className="fr-h6 fr-mt-3w">
      <span className={`${icone} fr-mr-1w`} aria-hidden="true" />
      {children}
    </h4>
  );
}

// Étapes patient (« Ce que vous devez faire maintenant »), propres au cas final
// et, pour la PMT / DAP / convocation, au transport retenu.
function EtapesPatient({
  casFinal,
  transport,
  transportPrescrit,
}: {
  casFinal: string;
  transport: string;
  transportPrescrit: boolean;
}) {
  const vehiculePerso = transport === "véhicule personnel ou transport en commun";
  const vslTaxi = transport === "VSL ou taxi conventionné";
  const vslTaxiTpmr = transport === "VSL TPMR ou taxi conventionné TPMR";
  const ambulance = transport === "ambulance";

  const modaliteTransportPMT = () => {
    if (vehiculePerso)
      return (
        <>
          <li>
            Organisez votre trajet avec votre véhicule personnel ou les transports
            en commun.
          </li>
          <li>
            Conservez les justificatifs nécessaires : billets, reçus, justificatifs
            de trajet ou de distance selon le cas.
          </li>
          <li>
            Transmettez les justificatifs à votre organisme d’Assurance Maladie
            selon les modalités indiquées.
          </li>
        </>
      );
    if (vslTaxi)
      return (
        <>
          <li>
            Organisez le transport avec un <strong>VSL</strong> ou un{" "}
            <strong>taxi conventionné</strong>, ou avec l’aide du secrétariat
            médical selon l’organisation prévue.
          </li>
          <li>Présentez la prescription au transporteur avant le transport.</li>
        </>
      );
    if (vslTaxiTpmr)
      return (
        <>
          <li>
            Organisez le transport avec un transporteur adapté au fauteuil roulant,
            ou avec l’aide du secrétariat médical selon l’organisation prévue.
          </li>
          <li>
            Précisez que le transport doit se faire{" "}
            <strong>sans quitter votre fauteuil roulant manuel ou électrique</strong>.
          </li>
          <li>Présentez la prescription au transporteur avant le transport.</li>
        </>
      );
    if (ambulance)
      return (
        <>
          <li>
            Organisez le transport avec le secrétariat médical, l’établissement de
            santé ou une société d’ambulance, selon l’organisation prévue pour votre
            situation.
          </li>
          <li>
            Présentez la prescription au transporteur avant le transport, sauf
            situation d’urgence.
          </li>
        </>
      );
    return null;
  };

  const modaliteTransportDAP = () => {
    if (vehiculePerso)
      return (
        <>
          <li>
            Une fois l’accord obtenu, organisez votre trajet avec votre véhicule
            personnel ou les transports en commun.
          </li>
          <li>
            Conservez les justificatifs nécessaires : billets, reçus, justificatifs
            de trajet ou de distance selon le cas.
          </li>
          <li>
            Transmettez les justificatifs à votre organisme d’Assurance Maladie
            selon les modalités indiquées.
          </li>
        </>
      );
    if (vslTaxi)
      return (
        <>
          <li>
            Une fois l’accord obtenu, organisez le transport avec un{" "}
            <strong>VSL</strong> ou un <strong>taxi conventionné</strong>, ou avec
            l’aide du secrétariat médical selon l’organisation prévue.
          </li>
          <li>Présentez la demande au transporteur.</li>
        </>
      );
    if (vslTaxiTpmr)
      return (
        <>
          <li>
            Une fois l’accord obtenu, organisez le transport avec un transporteur
            adapté au fauteuil roulant, ou avec l’aide du secrétariat médical selon
            l’organisation prévue.
          </li>
          <li>
            Précisez que le transport doit se faire{" "}
            <strong>sans quitter votre fauteuil roulant manuel ou électrique</strong>.
          </li>
          <li>Présentez la demande au transporteur.</li>
        </>
      );
    if (ambulance)
      return (
        <>
          <li>
            Une fois l’accord obtenu, organisez le transport avec le secrétariat
            médical, l’établissement de santé ou une société d’ambulance, selon
            l’organisation prévue pour votre situation.
          </li>
          <li>Présentez la demande au transporteur, sauf situation d’urgence.</li>
        </>
      );
    return null;
  };

  switch (casFinal) {
    case "prescription médicale de transport":
      return (
        <ol>
          <li>
            Votre médecin vous remet une{" "}
            <strong>Prescription Médicale de Transport</strong>.
          </li>
          <li>
            Vérifiez que le transport indiqué correspond bien au transport retenu :{" "}
            <strong>{transport}</strong>.
          </li>
          <li>Utilisez uniquement le mode de transport indiqué sur la prescription.</li>
          {modaliteTransportPMT()}
        </ol>
      );
    case "demande accord préalable":
      return (
        <ol>
          <li>
            Votre médecin vous remet une{" "}
            <strong>Demande d’Accord Préalable</strong>.
          </li>
          <li>Cette demande vaut aussi prescription médicale de transport.</li>
          <li>
            Vérifiez que le transport demandé correspond bien au transport retenu :{" "}
            <strong>{transport}</strong>.
          </li>
          <li>
            Envoyez la demande à l’Assurance Maladie, à l’attention du médecin-conseil.
          </li>
          <li>
            Attendez la réponse de l’Assurance Maladie avant d’organiser le transport,
            sauf urgence.
          </li>
          <li>
            En cas de refus, le transport ne sera pas pris en charge dans les
            conditions demandées.
          </li>
          {modaliteTransportDAP()}
        </ol>
      );
    case "convocation ou avis audience":
      return vehiculePerso ? (
        <ol>
          <li>Conservez votre convocation ou votre avis d’audience.</li>
          <li>
            Le transport retenu est :{" "}
            <strong>véhicule personnel ou transport en commun</strong>.
          </li>
          <li>
            Organisez votre trajet selon les indications figurant sur la convocation,
            l’avis ou les consignes données par le service concerné.
          </li>
          <li>Conservez les justificatifs de trajet nécessaires.</li>
          <li>
            Présentez la convocation ou l’avis si un justificatif vous est demandé.
          </li>
        </ol>
      ) : (
        <ol>
          <li>Conservez votre convocation ou votre avis d’audience.</li>
          <li>
            Le transport retenu est : <strong>{transport}</strong>.
          </li>
          <li>
            Organisez le transport selon les indications figurant sur la convocation,
            l’avis ou les consignes données par le service concerné.
          </li>
          <li>Présentez la convocation ou l’avis au transporteur.</li>
        </ol>
      );
    case "transport charge établissement":
      return (
        <ol>
          <li>
            Le transport retenu est : <strong>{transport}</strong>.
          </li>
          <li>
            Le transport doit être organisé ou encadré par l’établissement de santé.
          </li>
          <li>Rapprochez-vous du service ou du secrétariat de l’établissement.</li>
          <li>
            L’établissement vous indiquera le document interne ou la procédure à
            suivre.
          </li>
        </ol>
      );
    case "SMUR":
      return (
        <ol>
          <li>
            Ce transport relève d’une prise en charge médicale urgente par une équipe
            SMUR — Structure Mobile d’Urgence et de Réanimation.
          </li>
          <li>
            L’organisation du transport relève de l’équipe médicale ou de
            l’établissement concerné.
          </li>
          <li>Suivez les consignes données par l’équipe médicale ou l’établissement.</li>
        </ol>
      );
    case "bariatrique seul":
      return (
        <ol>
          <li>
            Aucun transport sanitaire ne peut être prescrit par votre médecin sur la
            base du seul motif bariatrique.
          </li>
          <li>
            Rapprochez-vous du service médical ou du secrétariat pour connaître les
            solutions possibles selon votre situation.
          </li>
        </ol>
      );
    case "permission sortie sans motif médical":
      return (
        <ol>
          <li>Le transport reste à votre charge.</li>
          <li>Vous pouvez organiser vous-même le transport adapté à votre sortie.</li>
          <li>
            En cas de changement de situation ou de motif médical, une nouvelle
            évaluation médicale peut être nécessaire.
          </li>
        </ol>
      );
    case "non éligible assurance maladie dans ce parcours":
      return transportPrescrit ? (
        <ol>
          <li>
            Le transport retenu par le médecin est : <strong>{transport}</strong>.
          </li>
          <li>
            Ce résultat signifie que le transport ne relève pas d’une prise en charge
            par l’Assurance Maladie dans ce cadre.
          </li>
          <li>Le transport reste à votre charge.</li>
          <li>
            Rapprochez-vous du secrétariat médical ou de l’établissement pour connaître
            la suite à donner.
          </li>
        </ol>
      ) : (
        <ol>
          <li>
            Aucun transport sanitaire ne peut être prescrit par votre médecin sur la
            base des informations indiquées.
          </li>
          <li>Le transport reste à votre charge si vous décidez de l’organiser.</li>
          <li>
            Rapprochez-vous du secrétariat médical ou de l’établissement pour connaître
            la suite à donner.
          </li>
        </ol>
      );
    default:
      return null;
  }
}

function Bloc2({
  e,
  casFinal,
  transport,
  transportPrescrit,
}: {
  e: typeof engine;
  casFinal: string;
  transport: string;
  transportPrescrit: boolean;
}) {
  const criteresRetenus = transportPrescrit ? retenus(e, CRITERES) : [];
  const motifsRetenus = transportPrescrit ? retenus(e, MOTIFS) : [];
  const resteACharge = RESTE_A_CHARGE[casFinal] ?? "";

  return (
    <div className="fr-callout" style={{ marginBottom: "2rem" }}>
      <h3 className="fr-callout__title">
        <span className="fr-icon-information-line fr-mr-1w" aria-hidden="true" />
        Information destinée au patient
      </h3>

      <div className="fr-callout__text">
        {transportPrescrit ? (
          <>
            <p>
              Votre médecin a retenu le transport suivant :{" "}
              <strong>{transport}</strong>.
            </p>

            <SousTitre icone="fr-icon-lightbulb-line">Pourquoi ce transport ?</SousTitre>
            <p>
              Ce choix correspond à votre situation au moment du transport et à
              l’aide dont vous avez besoin pendant le trajet.
            </p>

            {criteresRetenus.length > 0 && (
              <>
                <SousTitre icone="fr-icon-stethoscope-line">
                  Critères médicaux retenus
                </SousTitre>
                <ListeVulgarisee items={criteresRetenus} />
              </>
            )}

            {motifsRetenus.length > 0 && (
              <>
                <SousTitre icone="fr-icon-checkbox-circle-line">
                  Motifs ouvrant droit identifiés ou déduits
                </SousTitre>
                <ListeVulgarisee items={motifsRetenus} />
              </>
            )}
          </>
        ) : (
          <>
            <p>
              Dans votre situation, les informations renseignées ne permettent pas à
              votre médecin de prescrire un transport sanitaire.
            </p>

            <SousTitre icone="fr-icon-lightbulb-line">Quelques explications</SousTitre>
            <p className="fr-mb-2w">
              Pour qu’un transport sanitaire puisse être prescrit, deux éléments
              doivent être réunis :
            </p>
            <p className="fr-mb-2w">
              <strong style={{ display: "block", marginBottom: "0.5rem" }}>
                1. Une situation ouvrant droit à la prise en charge
              </strong>
              Par exemple : une hospitalisation, certains soins liés à une affection
              de longue durée, un accident du travail, une maladie professionnelle ou
              une autre situation prévue par l’Assurance Maladie.
            </p>
            <p className="fr-mb-2w">
              <strong style={{ display: "block", marginBottom: "0.5rem" }}>
                2. Un besoin médical de transport adapté
              </strong>
              Par exemple : un besoin d’être transporté en ambulance, en VSL, en taxi
              conventionné, dans un véhicule adapté au fauteuil roulant, ou avec un
              niveau d’aide compatible avec votre état de santé.
            </p>
            <p>
              Dans les informations indiquées, au moins l’un de ces deux éléments
              n’est pas suffisamment établi.
            </p>
          </>
        )}

        <SousTitre icone="fr-icon-money-euro-circle-line">
          Prise en charge / reste à charge
        </SousTitre>
        <p>{resteACharge}</p>

        <SousTitre icone="fr-icon-todo-line">
          Ce que vous devez faire maintenant
        </SousTitre>
        <EtapesPatient
          casFinal={casFinal}
          transport={transport}
          transportPrescrit={transportPrescrit}
        />
      </div>
    </div>
  );
}

// ————————————————————————————————————————————————————————————————
// Bloc 3 — Informations pour le corps médical.
// ————————————————————————————————————————————————————————————————

// Libellé du cas retenu tel qu'attendu par le corps médical (plus explicite que
// la valeur brute de `cas_final`).
const CAS_RETENU: Record<string, string> = {
  "prescription médicale de transport": "Prescription Médicale de Transport",
  "demande accord préalable": "Demande d’Accord Préalable",
  "convocation ou avis audience":
    "Convocation ou avis d’audience valant prescription médicale de transport",
  "transport charge établissement": "Transport à charge de l’établissement de santé",
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
  | { text: string; visible: (e: typeof engine, transport: string) => boolean };

type Groupe = { titre?: string; icone?: string; items: CaseItem[] };

const vrai = (e: typeof engine, id: string) => e.evaluate(id).nodeValue === true;

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
    visible: (e) => vrai(e, "sortie_transport_partage_incompatible"),
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
    visible: (e) => vrai(e, "sortie_accompagnant_necessaire"),
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
  "bariatrique seul": [],
  "permission sortie sans motif médical": [],
  "non éligible assurance maladie dans ce parcours": [],
};

function texteItem(item: CaseItem): string {
  return typeof item === "string" ? item : item.text;
}

function Bloc3({
  e,
  casFinal,
  transport,
  doc,
}: {
  e: typeof engine;
  casFinal: string;
  transport: string;
  doc: string;
}) {
  const casRetenu = CAS_RETENU[casFinal] ?? casFinal;
  // Ne conserve que les cases établies par la simulation ; un groupe entièrement
  // filtré n'est pas affiché.
  const groupes = (CASES_BLOC3[casFinal] ?? [])
    .map((groupe) => ({
      ...groupe,
      items: groupe.items.filter(
        (item) => typeof item === "string" || item.visible(e, transport)
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

        {groupes.length > 0 && (
          <>
            <p className="fr-mt-2w">
              <strong>Cases à compléter ou cocher :</strong>
            </p>
            {/* Une colonne par groupe sur écran large (3 sections PMT ⇒ 3
                colonnes), empilées sur mobile. */}
            <div className="fr-grid-row fr-grid-row--gutters">
              {groupes.map((groupe) => (
                <div
                  key={groupe.titre ?? "sans-titre"}
                  className={`fr-col-12 fr-col-md-${Math.floor(
                    12 / groupes.length
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

// ————————————————————————————————————————————————————————————————
// Page Résultat 2 — document à imprimer et à remettre au patient.
// ————————————————————————————————————————————————————————————————

export function ResultatFinal({ situation, onNouvelleSimulation }: Props) {
  const e = engine.setSituation(situation);
  const casFinal = String(e.evaluate("cas_final").nodeValue ?? "");
  const doc = String(
    e.evaluate("document_a_remettre_au_patient").nodeValue ?? ""
  );
  const transport = String(
    e.evaluate("transport_sanitaire_prescrit").nodeValue ?? ""
  );
  const transportPrescrit = transport !== "" && transport !== "aucun";

  return (
    <div>
      <h2>Document à imprimer et à remettre au patient</h2>

      <Bloc1
        casFinal={casFinal}
        transport={transport}
        transportPrescrit={transportPrescrit}
      />
      <Bloc2
        e={e}
        casFinal={casFinal}
        transport={transport}
        transportPrescrit={transportPrescrit}
      />
      <Bloc3 e={e} casFinal={casFinal} transport={transport} doc={doc} />

      <div className="fr-btns-group fr-btns-group--inline">
        <button
          className="fr-btn fr-btn--secondary"
          onClick={onNouvelleSimulation}
        >
          Faire une nouvelle simulation
        </button>
      </div>

      <TraceDebug
        titre="résultat administratif"
        situation={situation}
        sorties={[
          "cas_final",
          "transport_sanitaire_prescrit",
          "document_a_remettre_au_patient",
        ]}
      />
    </div>
  );
}
