// Page Résultat 1 — la décision médicale, et l'information à remettre au patient.
//
// Deux rendus, selon que la Partie 1 a tranché ou non. Le cas courant expose le
// mode retenu et ce qui l'a justifié ; trois cas particuliers médicaux (SMUR,
// contrainte bariatrique seule, permission de sortie sans motif médical) closent
// au contraire le parcours ici même, sans qualification administrative.

import type { Situation } from "publicodes";
import type { CleDeRegle } from "../contrat-regles-publicodes";
import { moteur, texte, vrai } from "../moteur";
import {
  ExplicationTransportImpossible,
  PourquoiCeTransport,
  SousTitre,
} from "../resultat/InformationPatient";
import { TraceDebug } from "../resultat/TraceDebug";
import { CAS_PARTICULIERS, CRITERES, retenus } from "../resultat/Vulgarisation";

type Props = {
  situation: Situation<string>;
  onContinuer: () => void;
  onRecommencer: () => void;
  /** Retour au questionnaire. Absent quand aucun parcours ne précède (seed). */
  onPrecedent?: () => void;
};

// La décision affichée ici n'est pas encore figée : c'est l'action principale
// qui la verrouille — et seulement s'il y a une Partie 2 à qualifier. Une fois
// dans ses pages, le secrétariat ne peut plus modifier la décision (verrou
// structurel — il ne pose aucune question de Partie 1) ni revenir en deçà. Sans
// question administrative, le document n'a rien entre lui et cet écran : son
// « Précédent » y ramène.
export function ResultatMedical({
  situation,
  onContinuer,
  onRecommencer,
  onPrecedent,
}: Props) {
  const e = moteur.setSituation(situation);
  const casFinal = texte(e, "cible_cas_final");
  const transport = texte(e, "cible_transport_sanitaire_prescrit");

  return (
    <div>
      <p>
        La décision ci-dessous est établie à partir de l’état de santé et des
        besoins du patient pendant le déplacement.
      </p>
      <Verdict casFinal={casFinal} transport={transport} />
      <InformationPatient e={e} casFinal={casFinal} transport={transport} />
      <SuiteDuParcours
        libelleSuite={libelleSuite(e)}
        onContinuer={onContinuer}
        onRecommencer={onRecommencer}
        onPrecedent={onPrecedent}
      />
      <AvertissementDeVerrou e={e} />
      <TraceDebug
        titre="résultat médical"
        situation={situation}
        sorties={SORTIES_TRACEES}
      />
    </div>
  );
}

// ---- implémentation ----

// Ce qui fige la décision, c'est d'entrer dans les pages de la Partie 2 : leurs
// réponses ne survivraient pas à un retour en deçà, donc rien n'y ramène. Quand
// la Partie 1 a déjà tranché, il n'y a pas de page à qualifier et le document se
// laisse au contraire quitter par « Précédent » : plus rien à annoncer ici.
function AvertissementDeVerrou({ e }: { e: typeof moteur }) {
  if (texte(e, "cible_partie_2_requise") !== "oui") return null;
  return (
    <p className="fr-hint-text">
      La décision médicale sera figée dès que vous aurez choisi «{" "}
      {libelleSuite(e)} » : elle ne pourra plus être modifiée ensuite.
    </p>
  );
}

// La Partie 2 n'est requise que si la Partie 1 n'a pas déjà tranché.
function libelleSuite(e: typeof moteur): string {
  return texte(e, "cible_partie_2_requise") === "oui"
    ? "Compléter la partie administrative"
    : "Voir le résultat final";
}

function Verdict({
  casFinal,
  transport,
}: {
  casFinal: string;
  transport: string;
}) {
  const direct = CAS_DIRECTS[casFinal];
  if (direct)
    return <Alerte type="error" titre={direct.titre} texte={direct.verdict} />;
  return (
    <Alerte
      type="success"
      titre="Décision médicale établie"
      texte={`Le mode de transport retenu est : ${transport}. C’est le mode le moins onéreux compatible avec l’état de santé et le niveau d’autonomie du patient.`}
    />
  );
}

function Alerte({
  type,
  titre,
  texte: contenu,
}: {
  type: "success" | "error";
  titre: string;
  texte: string;
}) {
  return (
    <div
      className={`fr-alert fr-alert--${type}`}
      style={{ marginBottom: "2rem" }}
    >
      <h3 className="fr-alert__title">{titre}</h3>
      <p>{contenu}</p>
    </div>
  );
}

function InformationPatient({
  e,
  casFinal,
  transport,
}: {
  e: typeof moteur;
  casFinal: string;
  transport: string;
}) {
  return (
    <div className="fr-callout" style={{ marginBottom: "2rem" }}>
      <h3 className="fr-callout__title">
        <span
          className="fr-icon-information-line fr-mr-1w"
          aria-hidden="true"
        />
        Information destinée au patient
      </h3>
      <div className="fr-callout__text">
        {CAS_DIRECTS[casFinal] ? (
          <ExplicationTransportImpossible />
        ) : (
          <TransportJustifie e={e} transport={transport} />
        )}
      </div>
    </div>
  );
}

// Cas courant : le transport retenu, ce qui l'a justifié, et les deux mentions
// qui ne modifient pas le mode mais accompagnent le véhicule.
function TransportJustifie({
  e,
  transport,
}: {
  e: typeof moteur;
  transport: string;
}) {
  return (
    <>
      <p>
        Votre médecin vient de confirmer que votre état de santé justifie un
        transport adapté.
      </p>
      <p>
        Le transport retenu est : <strong>{transport}</strong>.
      </p>
      <PourquoiCeTransport
        titreExplication="Quelques explications"
        criteres={retenus(e, CRITERES)}
        titreCriteres="Le ou les critères médicaux retenus sont les suivants"
        casParticuliers={retenus(e, CAS_PARTICULIERS)}
        titreCasParticuliers="Le ou les cas particuliers médicaux retenus sont les suivants"
      />
      <MentionsDuVehicule e={e} />
    </>
  );
}

function MentionsDuVehicule({ e }: { e: typeof moteur }) {
  const partageApplicable = vrai(e, "cible_transport_partage_applicable");
  const partageIncompatible = vrai(e, "cible_transport_partage_incompatible");
  return (
    <>
      {partageApplicable && (
        <p>
          {partageIncompatible
            ? "Votre état de santé est incompatible avec un transport partagé."
            : "Votre état de santé est compatible avec un transport partagé."}
        </p>
      )}
      {vrai(e, "cible_equipement_bariatrique_requis") && (
        <>
          <SousTitre icone="fr-icon-car-line">Équipement du véhicule</SousTitre>
          <p>
            Le véhicule utilisé doit disposer d’un équipement bariatrique
            adapté. Cette exigence ne modifie pas le mode retenu.
          </p>
        </>
      )}
    </>
  );
}

// Les trois suites possibles depuis le résultat médical : revenir au
// questionnaire tant que rien n'est figé, repartir de zéro, ou poursuivre —
// vers la Partie 2 si elle est requise, vers le résultat sinon.
function SuiteDuParcours({
  libelleSuite,
  onContinuer,
  onRecommencer,
  onPrecedent,
}: {
  libelleSuite: string;
  onContinuer: () => void;
  onRecommencer: () => void;
  onPrecedent?: () => void;
}) {
  return (
    <div className="fr-btns-group fr-btns-group--inline">
      {onPrecedent && (
        <button
          type="button"
          className="fr-btn fr-btn--secondary"
          onClick={onPrecedent}
        >
          Précédent
        </button>
      )}
      <button
        type="button"
        className="fr-btn fr-btn--secondary"
        onClick={onRecommencer}
      >
        Faire une nouvelle simulation
      </button>
      <button type="button" className="fr-btn" onClick={onContinuer}>
        {libelleSuite}
      </button>
    </div>
  );
}

// Les trois cas particuliers médicaux qui closent le parcours dès la Partie 1.
// Absent de cette table = décision standard.
const CAS_DIRECTS: Record<string, { titre: string; verdict: string }> = {
  SMUR: {
    titre:
      "Transport par une équipe SMUR — Structure Mobile d’Urgence et de Réanimation",
    verdict:
      "Le déplacement relève d’un transport par une équipe SMUR. Aucune prescription médicale de transport ni demande d’accord préalable ne doit être établie dans ce parcours.",
  },
  "bariatrique seul": {
    titre: "Aucun transport prescriptible sur le seul fondement bariatrique",
    verdict:
      "La contrainte bariatrique ne constitue pas, à elle seule, un motif médical ouvrant droit à une prescription prise en charge par l’Assurance Maladie.",
  },
  "permission de sortie sans motif médical": {
    titre: "Permission de sortie sans motif médical",
    verdict:
      "Le déplacement correspond à une permission de sortie demandée par le patient, sans motif médical : il ne donne pas lieu à une prescription médicale de transport.",
  },
};

const SORTIES_TRACEES: CleDeRegle[] = [
  "cible_resultat_medical",
  "cible_transport_sanitaire_prescrit",
  "cible_partie_2_requise",
  "cible_cas_final",
];
