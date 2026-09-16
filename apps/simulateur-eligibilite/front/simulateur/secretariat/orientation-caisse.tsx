// Le cas final « orientation vers la caisse pour accord préalable » — verdict
// (Bloc 1) et marche à suivre (Bloc 2). Extrait de `Bloc1Resultat.tsx` et
// `EtapesPatient.tsx` pour leur faire de la place sous la limite de 300 lignes.

import type { ReactNode } from "react";

type VerdictContexte = { urgenceAttestee: boolean };
type Verdict = { titre: string; corps: ReactNode };

// Texte livré mot pour mot (contrat v9.7.1, `application.mjs:260-266`).
export function orientationCaisse({
  urgenceAttestee,
}: VerdictContexte): Verdict {
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

// TEXTE PROVISOIRE — à valider par le porteur (tâche Notion « v9.7.1 : textes
// manquants du résultat orientation vers la caisse »).
export function EtapesOrientationCaisse({
  urgenceAttestee,
}: {
  urgenceAttestee: boolean;
}) {
  const etapes = [
    "Conservez votre convocation et la synthèse remise ici.",
    "Contactez votre caisse d’Assurance Maladie pour confirmer le document à établir, les pièces à fournir et la personne qui doit établir la demande.",
    urgenceAttestee
      ? "L’urgence médicale attestée permet de réaliser le transport sans attendre la réponse de la caisse."
      : "Attendez la confirmation de votre caisse avant d’organiser le transport.",
  ];
  return (
    <ol>
      {etapes.map((etape) => (
        <li key={etape}>{etape}</li>
      ))}
    </ol>
  );
}
