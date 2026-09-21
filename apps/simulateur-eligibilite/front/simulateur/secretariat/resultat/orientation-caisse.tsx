// Le cas final « orientation vers la caisse pour accord préalable » — verdict
// (Bloc 1) et marche à suivre (Bloc 2). Extrait de `Bloc1Resultat.tsx` et
// `EtapesPatient.tsx` pour leur faire de la place sous la limite de 300 lignes.

import type { ReactNode } from "react";

type VerdictContexte = { attenteRequise: boolean };
type Verdict = { titre: string; corps: ReactNode };

// Les trois premiers paragraphes sont livrés mot pour mot (contrat v9.7.1,
// `application.mjs:260-266`) ; le quatrième vient du contrat v9.7.2
// (`CONTRAT-RESULTATS-v9-7-2.md` § 1, `instructions.awaiting_approval` /
// `.urgent`). Le contrat exige que cette consigne conditionnelle n'apparaisse
// qu'une seule fois dans le résultat : c'est ici son unique emplacement —
// `EtapesOrientationCaisse` (Bloc 2) ne la répète pas.
export function orientationCaisse({
  attenteRequise,
}: VerdictContexte): Verdict {
  const paragraphes = [
    "Votre convocation nécessite un transport en avion ou en bateau de ligne régulière. Les informations renseignées ne permettent pas de compléter les sous-situations prévues par le formulaire de demande d’accord préalable.",
    "Contactez votre caisse d’Assurance Maladie avec votre convocation et cette synthèse afin de confirmer le document, les pièces à fournir et la personne qui doit établir la demande.",
    "Cette orientation ne constitue ni un refus de prise en charge ni un accord de remboursement. Cette synthèse vous accompagne dans votre démarche auprès de la caisse.",
    attenteRequise
      ? "Contactez votre caisse avant le transport pour organiser la demande d’accord préalable."
      : "L’urgence médicale attestée permet de réaliser le transport sans attendre la réponse de la caisse.",
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
// manquants du résultat orientation vers la caisse »). Le contrat v9.7.2 ne
// valide que le reste à charge, le cas retenu, les points à vérifier et la
// consigne d'attente (rendue dans `orientationCaisse` ci-dessus) : ces deux
// étapes restent donc provisoires, seule la troisième — qui la dupliquait —
// est retirée.
export function EtapesOrientationCaisse() {
  const etapes = [
    "Conservez votre convocation et la synthèse remise ici.",
    "Contactez votre caisse d’Assurance Maladie pour confirmer le document à établir, les pièces à fournir et la personne qui doit établir la demande.",
  ];
  return (
    <ol>
      {etapes.map((etape) => (
        <li key={etape}>{etape}</li>
      ))}
    </ol>
  );
}
