// Bloc 1 de la Page Résultat 2 — le verdict : titre et corps propres à chaque cas
// final, dans une alerte DSFR dont la teinte dit déjà l'issue. Ne consulte pas le
// moteur : tout ce qu'il affiche découle du cas final et du transport, déjà
// évalués par `ResultatFinal`.

import type { ReactNode } from "react";

type Props = {
  casFinal: string;
  transport: string;
  transportPrescrit: boolean;
  /** Les motifs de l'accord préalable, tels que le modèle les a établis. */
  motifs: string[];
};

export function Bloc1Resultat({
  casFinal,
  transport,
  transportPrescrit,
  motifs,
}: Props) {
  const { titre, corps } = verdict(casFinal, {
    transport,
    transportPrescrit,
    motifs,
  });

  return (
    <div
      className={`fr-alert fr-alert--${TEINTE[casFinal] ?? "info"}`}
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
};
type Verdict = { titre: string; corps: ReactNode };

// Cas final inconnu : on affiche son nom brut plutôt que rien — c'est un défaut
// du modèle, il doit se voir.
function verdict(casFinal: string, contexte: Contexte): Verdict {
  return VERDICTS[casFinal]?.(contexte) ?? { titre: casFinal, corps: null };
}

function prescriptionMedicale({ transport }: Contexte): Verdict {
  return {
    titre: "Vous êtes éligible à une prise en charge par l’Assurance Maladie",
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

function accordPrealable({ transport, motifs }: Contexte): Verdict {
  return {
    titre:
      "Vous êtes éligible sous réserve d’un accord préalable de l’Assurance Maladie",
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
    titre: "Vous êtes éligible",
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

function chargeEtablissement({ transport }: Contexte): Verdict {
  return {
    titre: "Transport à charge de l’établissement de santé",
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

function prestationNonPriseEnCharge({ transport }: Contexte): Verdict {
  return {
    titre:
      "Prestation à l’origine du déplacement non prise en charge par l’Assurance Maladie",
    corps: (
      <>
        <p>
          Transport médicalement retenu : <strong>{transport}</strong>.
        </p>
        <p>
          Aucune Prescription Médicale de Transport ni Demande d’Accord
          Préalable ouvrant droit à une prise en charge ne doit être établie
          dans ce parcours.
        </p>
      </>
    ),
  };
}

function smur(): Verdict {
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
}

function bariatriqueSeul(): Verdict {
  return {
    titre:
      "Aucun mode de transport n’est éligible à une prise en charge par l’Assurance Maladie au titre du seul motif « bariatrique ».",
    corps: (
      <p>Aucun transport sanitaire ne peut être prescrit par votre médecin.</p>
    ),
  };
}

function permissionSortie(): Verdict {
  return {
    titre:
      "Aucun mode de transport n’est éligible à une prise en charge par l’Assurance Maladie au titre du seul motif « permission de sortie sans motif médical ».",
    corps: <p>Le transport reste à votre charge.</p>,
  };
}

function nonEligible({ transport, transportPrescrit }: Contexte): Verdict {
  // Variante A — aucun transport sanitaire prescrit.
  if (!transportPrescrit) {
    return {
      titre:
        "Aucun transport sanitaire ne peut être prescrit par votre médecin.",
      corps: (
        <p>Le transport reste à votre charge si vous décidez de l’organiser.</p>
      ),
    };
  }
  // Variante B — transport prescrit mais non pris en charge ici.
  return {
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
  "demande d’accord préalable": accordPrealable,
  "convocation ou avis d’audience": convocation,
  "transport à la charge de l’établissement": chargeEtablissement,
  "prestation non prise en charge par l’Assurance Maladie":
    prestationNonPriseEnCharge,
  SMUR: smur,
  "bariatrique seul": bariatriqueSeul,
  "permission de sortie sans motif médical": permissionSortie,
  "non éligible à une prise en charge par l’Assurance Maladie": nonEligible,
};

// Teinte DSFR de l'alerte selon le cas final déterminé par le moteur.
const TEINTE: Record<string, "success" | "info" | "warning" | "error"> = {
  "prescription médicale de transport": "success",
  "demande d’accord préalable": "info",
  "convocation ou avis d’audience": "success",
  "transport à la charge de l’établissement": "warning",
  "prestation non prise en charge par l’Assurance Maladie": "error",
  SMUR: "warning",
  "bariatrique seul": "error",
  "permission de sortie sans motif médical": "error",
  "non éligible à une prise en charge par l’Assurance Maladie": "error",
};
