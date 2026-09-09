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
  /** Trace de debug ouverte : outil produit, cf. `resultat/TraceDebug`. */
  traceDebug?: boolean;
};

// La décision affichée ici n'est pas encore figée : c'est l'action principale
// qui la verrouille — et seulement s'il y a une Partie 2 à qualifier. Une fois
// dans ses pages, le secrétariat ne peut plus modifier la décision (verrou
// structurel — il ne pose aucune question de Partie 1) ni revenir en deçà. Sans
// question administrative, le document n'a rien entre lui et cet écran : son
// « Précédent » y ramène.
//
// Ce verrou ne s'annonce pas à l'écran : l'interface n'avertit pas d'une
// conséquence avant qu'elle survienne, elle se contente de nommer l'action. Le
// « Précédent » de cette page dit déjà ce qui reste ouvert.
export function ResultatMedical({
  situation,
  onContinuer,
  onRecommencer,
  onPrecedent,
  traceDebug = false,
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
      <TraceDebug
        autorisee={traceDebug}
        titre="résultat médical"
        situation={situation}
        sorties={SORTIES_TRACEES}
      />
    </div>
  );
}

// ---- implémentation ----

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
    return <Alerte type="info" titre={direct.titre} texte={direct.verdict} />;
  return (
    <Alerte
      type="info"
      titre={PHRASE_DU_MODE[transport] ?? PHRASE_TPMR}
      texte={SOUS_TITRE}
    />
  );
}

/**
 * Le Résultat 1 nomme le mode dans son titre, une phrase par mode, et ne dit rien
 * d'autre : la prise en charge relève de la partie administrative.
 *
 * La v9.5.1 titrait « Décision médicale établie » et rangeait le mode dans le
 * corps. La v9.7 recopie ici les phrases que le contrat d'interface fixe, et son
 * sous-titre. Aucune ne promet un remboursement, et aucune ne dit « ou transport
 * en commun » : le prescripteur a choisi entre les deux, et l'écran l'annonce.
 */
const PHRASE_DU_MODE: Record<string, string> = {
  "véhicule personnel":
    "Le transport le plus adapté à votre état de santé est un véhicule personnel.",
  "transport en commun terrestre":
    "Le transport le plus adapté à votre état de santé est un transport en commun.",
  ambulance:
    "Le transport le plus adapté à votre état de santé est une ambulance.",
  "VSL (Véhicule Sanitaire Léger) ou taxi conventionné":
    "Le transport le plus adapté à votre état de santé est un VSL (Véhicule Sanitaire Léger) ou un taxi conventionné.",
};

const PHRASE_TPMR =
  "Le transport le plus adapté à votre état de santé est un VSL (Véhicule Sanitaire Léger) adapté au transport de personnes à mobilité réduite (TPMR) ou un taxi conventionné adapté TPMR.";

const SOUS_TITRE =
  "Pour en savoir plus sur les conditions de prise en charge, la partie administrative doit être complétée.";

// Le contrat d'interface veut le Résultat 1 **toujours bleu**
// (`cible_resultat_1_couleur`) : il ne tranche que le mode médical, et une teinte
// verte ou rouge y ferait lire un accord ou un refus qui n'y sont pas.
function Alerte({
  type,
  titre,
  texte: contenu,
}: {
  type: "info";
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

// Les cas qui closaient le parcours dès la Partie 1. Absent de cette table =
// décision standard.
//
// La v9.5.1 en comptait trois. La v9.7 a retiré les trois sorties directes : le
// SMUR n'est plus une réponse de Q1, le seul motif bariatrique ne conclut plus
// rien, et la permission de sortie se qualifie en Partie 2. `cible_partie_2_requise`
// vaut désormais « oui » dès que la décision médicale est complète.
//
// La table reste, vide, parce que la porte, elle, reste ouverte : une prochaine
// livraison peut rouvrir une sortie directe, et c'est ici qu'elle se rendrait.
const CAS_DIRECTS: Record<string, { titre: string; verdict: string }> = {};

const SORTIES_TRACEES: CleDeRegle[] = [
  "cible_resultat_medical",
  "cible_transport_sanitaire_prescrit",
  "cible_partie_2_requise",
  "cible_cas_final",
];
