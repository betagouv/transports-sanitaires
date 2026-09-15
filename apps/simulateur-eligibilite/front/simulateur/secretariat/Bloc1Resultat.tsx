// Bloc 1 de la Page Résultat 2 — le verdict : titre et corps propres à chaque cas
// final, dans une alerte DSFR dont la teinte dit déjà l'issue. Ne consulte pas le
// moteur : tout ce qu'il affiche découle du cas final et du transport, déjà
// évalués par `ResultatFinal`.

import type { ReactNode } from "react";
import { FraisAPrevoir } from "./frais-a-prevoir";
import { VerdictDapUrgente } from "./urgence-attestee";

type Props = {
  casFinal: string;
  /** `cible_resultat_2_couleur` : « vert » ou « bleu », et le modèle seul décide. */
  couleur: string;
  transport: string;
  transportPrescrit: boolean;
  /** Les motifs de l'accord préalable, tels que le modèle les a établis. */
  motifs: string[];
  /** `cible_attente_accord_prealable_requise` : la décision est-elle à attendre ? */
  attenteRequise: boolean;
  /** `cible_urgence_attestee` : dispense-t-elle d'attendre la réponse de la caisse ? */
  urgenceAttestee: boolean;
};

export function Bloc1Resultat({
  casFinal,
  couleur,
  transport,
  transportPrescrit,
  motifs,
  attenteRequise,
  urgenceAttestee,
}: Props) {
  const { titre, corps } = verdict(casFinal, {
    transport,
    transportPrescrit,
    motifs,
    attenteRequise,
    urgenceAttestee,
  });

  return (
    <div
      className={`fr-alert fr-alert--${teinte(couleur)}`}
      style={{ marginBottom: "2rem" }}
    >
      <h3 className="fr-alert__title">{titre}</h3>
      {corps}
    </div>
  );
}

// ---- implémentation ----

type Contexte = {
  transport: string;
  transportPrescrit: boolean;
  motifs: string[];
  attenteRequise: boolean;
  urgenceAttestee: boolean;
};
type Verdict = { titre: string; corps: ReactNode };

// Cas final inconnu : on affiche son nom brut plutôt que rien — c'est un défaut
// du modèle, il doit se voir.
function verdict(casFinal: string, contexte: Contexte): Verdict {
  return VERDICTS[casFinal]?.(contexte) ?? { titre: casFinal, corps: null };
}

function prescriptionMedicale({ transport }: Contexte): Verdict {
  return {
    titre: "Votre transport peut être pris en charge par l’Assurance Maladie",
    corps: (
      <>
        <TransportPrescrit transport={transport} />
        <p>
          Document à remettre au patient :{" "}
          <strong>Prescription Médicale de Transport</strong>.
        </p>
      </>
    ),
  };
}

// La permission temporaire de sortie admissible a son formulaire à elle depuis
// la v9.7 : le S3141, que la circulaire CIR-16/2020 accompagne. Le contrat range
// sa page de résultat en vert, comme la PMT — le droit est ouvert, sans réserve.
function prescriptionS3141({ transport }: Contexte): Verdict {
  return {
    titre: "Votre transport pour cette permission peut être pris en charge",
    corps: (
      <>
        <TransportPrescrit transport={transport} />
        <p>
          Document à remettre au patient : <strong>formulaire S3141</strong>,
          pour un transport lié à une permission temporaire de sortie.
        </p>
      </>
    ),
  };
}

// Deux variantes exclusives depuis la v9.5.1 : l'accord se réserve, ou l'urgence
// attestée dispense de l'attendre. C'est le modèle qui tranche
// (`cible_attente_accord_prealable_requise`) ; le document, lui, reste une DAP
// dans les deux cas, puisqu'un motif réglementaire l'a déclenchée.
function accordPrealable(contexte: Contexte): Verdict {
  return contexte.attenteRequise
    ? accordPrealableAAttendre(contexte)
    : accordPrealableUrgent(contexte);
}

function accordPrealableAAttendre({ transport, motifs }: Contexte): Verdict {
  return {
    titre:
      "La prise en charge de votre transport nécessite un accord préalable",
    corps: (
      <>
        <TransportPrescrit transport={transport} />
        <p>
          Document à remettre au patient :{" "}
          <strong>Demande d’Accord Préalable</strong>.
        </p>
        <MotifsDeLAccord motifs={motifs} />
      </>
    ),
  };
}

function accordPrealableUrgent({ transport, motifs }: Contexte): Verdict {
  return {
    titre: "Votre transport peut être réalisé sans attendre l’accord préalable",
    corps: (
      <>
        <VerdictDapUrgente transport={transport} />
        <MotifsDeLAccord motifs={motifs} />
      </>
    ),
  };
}

// Ce qui a déclenché l'accord préalable — une cause, ou plusieurs. Le prescripteur
// doit reprendre ces motifs sur le formulaire ; le patient, savoir sur quoi porte
// la décision qu'il attend.
function MotifsDeLAccord({ motifs }: { motifs: string[] }) {
  if (motifs.length === 0) return null;
  // La liste emprunte son nom accessible à l'intitulé qui la précède : le lecteur
  // d'écran annonce alors « Motif ou motifs de l'accord préalable, liste de N ».
  return (
    <>
      <p className="fr-mb-1v" id={INTITULE_DES_MOTIFS}>
        <strong>Motif ou motifs de l’accord préalable :</strong>
      </p>
      <ul aria-labelledby={INTITULE_DES_MOTIFS}>
        {motifs.map((motif) => (
          <li key={motif}>{motif}</li>
        ))}
      </ul>
    </>
  );
}

const INTITULE_DES_MOTIFS = "motifs-de-l-accord-prealable";

function convocation({ transport }: Contexte): Verdict {
  return {
    titre:
      "Votre convocation permet de demander la prise en charge du transport",
    corps: (
      <>
        <TransportPrescrit transport={transport} />
        <p>
          Document patient : <strong>convocation ou avis d’audience</strong>.
        </p>
      </>
    ),
  };
}

// Texte livré mot pour mot (contrat v9.7.1, `application.mjs:260-266`).
function orientationCaisse({ urgenceAttestee }: Contexte): Verdict {
  const paragraphes = [
    "Votre convocation nécessite un transport en avion ou en bateau de ligne régulière. Les informations renseignées ne permettent pas de compléter les sous-situations prévues par le formulaire de demande d’accord préalable.",
    "Contactez votre caisse d’Assurance Maladie avec votre convocation et cette synthèse afin de confirmer le document, les pièces à fournir et la personne qui doit établir la demande.",
    "Cette orientation ne constitue ni un refus de prise en charge ni un accord de remboursement. Cette synthèse vous accompagne dans votre démarche auprès de la caisse.",
    ...(urgenceAttestee
      ? [
          "L’urgence médicale attestée permet de réaliser le transport sans attendre la réponse de la caisse.",
        ]
      : []),
  ];
  return {
    titre:
      "Contactez votre caisse pour organiser la demande d’accord préalable",
    corps: (
      <>
        {paragraphes.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </>
    ),
  };
}

function chargeEtablissement({ transport }: Contexte): Verdict {
  return {
    titre: "Votre transport relève du financement de l’établissement",
    corps: (
      <>
        <TransportPrescrit transport={transport} />
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
}

function permissionSortie(): Verdict {
  return {
    titre: "Les frais de cette permission restent à votre charge",
    corps: (
      <p>
        Les frais de transport liés à cette permission restent à votre charge.
      </p>
    ),
  };
}

function nonEligible({ transport, transportPrescrit }: Contexte): Verdict {
  // Variante A — aucun transport sanitaire prescrit.
  if (!transportPrescrit) {
    return {
      titre: "Ce déplacement ne peut pas être remboursé",
      corps: (
        <p>
          D’après les informations renseignées, ce déplacement ne peut pas être
          remboursé par l’Assurance Maladie.
        </p>
      ),
    };
  }
  // Variante B — transport prescrit mais non pris en charge ici.
  return {
    titre: "Ce déplacement ne peut pas être remboursé",
    corps: (
      <>
        <p>
          D’après les informations renseignées, ce déplacement ne peut pas être
          remboursé par l’Assurance Maladie.
        </p>
        <FraisAPrevoir transport={transport} />
      </>
    ),
  };
}

function TransportPrescrit({ transport }: { transport: string }) {
  return (
    <p>
      Transport sanitaire prescrit : <strong>{transport}</strong>.
    </p>
  );
}

const VERDICTS: Record<string, (contexte: Contexte) => Verdict> = {
  "prescription médicale de transport": prescriptionMedicale,
  "prescription S3141": prescriptionS3141,
  "demande d’accord préalable": accordPrealable,
  "convocation ou avis d’audience": convocation,
  "orientation vers la caisse pour accord préalable": orientationCaisse,
  "transport à la charge de l’établissement": chargeEtablissement,
  "permission de sortie sans motif médical": permissionSortie,
  "non éligible à une prise en charge par l’Assurance Maladie": nonEligible,
};

// La teinte DSFR de l'alerte, traduite de la couleur que le modèle décide.
//
// Elle se lisait ici, dans une table tenue à la main, cas final par cas final —
// et la table avait dérivé : elle rendait un transport à la charge de
// l'établissement en orange, quand le contrat le veut vert. La v9.7 porte la
// couleur en cible (`cible_resultat_2_couleur`), et c'est elle qui tranche
// désormais : vert quand un document est dû, bleu pour un accord préalable comme
// pour un refus.
function teinte(couleur: string): "success" | "info" {
  return couleur === "vert" ? "success" : "info";
}
