// Outil 1 — le parcours médical du prescripteur : Partie 1 puis Résultat 1.
//
// La décision médicale n'est **pas** figée à l'ouverture du Résultat 1 : tant
// que le prescripteur n'a pas choisi l'action principale, « Précédent » rouvre
// le questionnaire sur sa dernière page, réponses intactes (contrat d'interface
// 2.0.0). C'est l'entrée dans les pages de la Partie 2 qui verrouille — elle est
// irréversible, la Partie 2 ne reposant aucune question de Partie 1. Quand la
// Partie 1 a déjà tranché, il n'y a pas de page à entrer : le document ramène
// ici par « Précédent », et une seed y ramène comme une saisie.

import type { FormState } from "@publicodes/forms";
import type { Situation } from "publicodes";
import { type ReactNode, useState } from "react";
import { trackResultat } from "../../analytics/evenements";
import { CIBLES_MEDICALES } from "../cibles-du-parcours";
import { moteur, texte } from "../moteur";
import { Parcours } from "../questionnaire/Parcours";
import { rejouerLesReponses } from "../questionnaire/rejeu";
import { ResultatMedical } from "./ResultatMedical";

type Props = {
  // Passe la main au secrétariat en emportant la situation de Partie 1.
  onPasserAuSecretariat: (situationP1: Situation<string>) => void;
  onNouvelleSimulation: () => void;
  // Seed : pré-remplit le parcours pour ouvrir directement le résultat médical.
  situationInitiale?: Situation<string> | null;
  // Encadré des outils produit, rendu tel quel sous le questionnaire. Le
  // simulateur sait *où* il s'affiche, pas ce qu'il contient : c'est `App` qui le
  // compose, et il est absent hors du service produit.
  panneauOutilsProduit?: ReactNode;
  // Trace de debug ouverte sous le questionnaire et sous le résultat médical.
  // Même garde que le panneau ci-dessus, portée par un booléen : la trace lit
  // l'état vivant du parcours, `App` ne peut donc pas la composer d'avance.
  traceDebug?: boolean;
};

export function Prescripteur({
  onPasserAuSecretariat,
  onNouvelleSimulation,
  situationInitiale = null,
  panneauOutilsProduit,
  traceDebug = false,
}: Props) {
  const parcours = useParcoursMedical(situationInitiale);
  const { situation } = parcours;

  if (situation)
    return (
      <ResultatMedical
        situation={situation}
        onContinuer={() => onPasserAuSecretariat(situation)}
        onRecommencer={onNouvelleSimulation}
        onPrecedent={parcours.retourAuQuestionnaire}
        traceDebug={traceDebug}
      />
    );

  return (
    <EvaluationMedicale
      etatInitial={parcours.etatQuestionnaire}
      panneauOutilsProduit={panneauOutilsProduit}
      traceDebug={traceDebug}
      onTermine={parcours.conclure}
    />
  );
}

// ---- implémentation ----

// L'avancement du parcours médical : la décision atteinte, et derrière elle le
// questionnaire à rouvrir.
//
// Une seed ouvre le résultat sans avoir traversé le questionnaire : on lui
// rejoue le parcours que ses réponses auraient produit, faute de quoi elle
// n'aurait rien derrière elle — alors qu'elle n'est qu'un pré-remplissage.
function useParcoursMedical(situationInitiale: Situation<string> | null) {
  const [situation, setSituation] = useState(situationInitiale);
  const [etatQuestionnaire, setEtatQuestionnaire] = useState(() =>
    situationInitiale
      ? rejouerLesReponses({
          cibles: CIBLES_MEDICALES,
          reponses: situationInitiale,
        })
      : undefined,
  );
  return {
    situation,
    etatQuestionnaire,
    retourAuQuestionnaire: etatQuestionnaire && (() => setSituation(null)),
    conclure: (s: Situation<string>, etat: FormState<string>) => {
      setEtatQuestionnaire(etat);
      setSituation(s);
    },
  };
}

// Q1 raisonne sur un seul sens de trajet : le prescripteur doit savoir, avant
// d'y répondre, qu'un aller et un retour aux besoins différents demandent deux
// évaluations.
const RAPPEL_ALLER_RETOUR = {
  question: "p1_autonomie",
  texte:
    "Si les besoins du patient diffèrent entre l’aller et le retour, réalisez une évaluation pour chaque sens.",
} as const;

function EvaluationMedicale({
  etatInitial,
  panneauOutilsProduit,
  traceDebug,
  onTermine,
}: {
  etatInitial?: FormState<string>;
  panneauOutilsProduit?: ReactNode;
  traceDebug: boolean;
  onTermine: (situation: Situation<string>, etat: FormState<string>) => void;
}) {
  return (
    <>
      <h1 className="fr-h3">Évaluation médicale du transport</h1>
      <Parcours
        outil="prescripteur"
        etatInitial={etatInitial}
        cibles={CIBLES_MEDICALES}
        libelleFin="Voir le résultat médical"
        bandeau={RAPPEL_ALLER_RETOUR}
        traceDebug={traceDebug}
        onTermine={(s, etat) => {
          onTermine(s, etat);
          trackResultat(
            texte(moteur.setSituation(s), "cible_resultat_medical"),
            "prescripteur",
          );
        }}
      />
      {panneauOutilsProduit}
    </>
  );
}
