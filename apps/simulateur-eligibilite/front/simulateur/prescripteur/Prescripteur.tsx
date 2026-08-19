// Outil 1 — le parcours médical du prescripteur : Partie 1 puis Résultat 1.
//
// La décision médicale n'est **pas** figée à l'ouverture du Résultat 1 : tant
// que le prescripteur n'a pas choisi l'action principale, « Précédent » rouvre
// le questionnaire sur sa dernière page, réponses intactes (contrat d'interface
// 2.0.0). C'est le passage au secrétariat qui verrouille — et il est
// irréversible, la Partie 2 ne reposant aucune question de Partie 1.

import type { FormState } from "@publicodes/forms";
import type { Situation } from "publicodes";
import { type ReactNode, useState } from "react";
import { trackResultat } from "../../analytics/evenements";
import { moteur, texte } from "../moteur";
import { Parcours } from "../questionnaire/Parcours";
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
};

export function Prescripteur({
  onPasserAuSecretariat,
  onNouvelleSimulation,
  situationInitiale = null,
  panneauOutilsProduit,
}: Props) {
  const [situation, setSituation] = useState<Situation<string> | null>(
    situationInitiale,
  );
  // L'état du questionnaire, gardé pour pouvoir y revenir. Absent quand le
  // résultat vient d'une seed : il n'y a alors aucun parcours derrière lui.
  const [etatQuestionnaire, setEtatQuestionnaire] =
    useState<FormState<string>>();

  if (situation)
    return (
      <ResultatMedical
        situation={situation}
        onContinuer={() => onPasserAuSecretariat(situation)}
        onRecommencer={onNouvelleSimulation}
        onPrecedent={etatQuestionnaire && (() => setSituation(null))}
      />
    );

  return (
    <EvaluationMedicale
      etatInitial={etatQuestionnaire}
      panneauOutilsProduit={panneauOutilsProduit}
      onTermine={(s, etat) => {
        setEtatQuestionnaire(etat);
        setSituation(s);
      }}
    />
  );
}

// ---- implémentation ----

function EvaluationMedicale({
  etatInitial,
  panneauOutilsProduit,
  onTermine,
}: {
  etatInitial?: FormState<string>;
  panneauOutilsProduit?: ReactNode;
  onTermine: (situation: Situation<string>, etat: FormState<string>) => void;
}) {
  return (
    <>
      <h1 className="fr-h3">Évaluation médicale du transport</h1>
      <Parcours
        outil="prescripteur"
        etatInitial={etatInitial}
        // Décision médicale + sorties Partie 1 destinées au document : cibler ces
        // sorties fait collecter leurs questions propres (sinon jamais posées, car
        // applicables mais hors du graphe des cibles). Toutes sont P1 (aucune
        // dépendance p2_*), donc aucune question Partie 2 ici.
        cibles={[
          "cible_transport_sanitaire_prescrit",
          "cible_partie_2_requise",
          "cible_transport_partage_incompatible",
        ]}
        libelleFin="Voir le résultat médical"
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
