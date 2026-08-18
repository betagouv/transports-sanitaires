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

// Outil 1 — parcours médical du prescripteur : Partie 1 → Résultat 1.
// Cibles limitées aux sorties médicales : le graphe ne tire que les questions
// de Partie 1.
export function Prescripteur({
  onPasserAuSecretariat,
  onNouvelleSimulation,
  situationInitiale = null,
  panneauOutilsProduit,
}: Props) {
  const [situation, setSituation] = useState<Situation<string> | null>(
    situationInitiale,
  );

  if (!situation) {
    return (
      <>
        <h1 className="fr-h3">Évaluation médicale du transport</h1>
        <Parcours
          outil="prescripteur"
          // Décision médicale + sorties Partie 1 destinées au document : cibler
          // ces sorties fait collecter leurs questions propres (sinon jamais
          // posées, car applicables mais hors du graphe des cibles). Toutes sont
          // P1 (aucune dépendance p2_*), donc aucune question Partie 2 ici.
          cibles={[
            "cible_transport_sanitaire_prescrit",
            "cible_partie_2_requise",
            "cible_transport_partage_incompatible",
            "cible_autonomie_patient",
            "cible_accompagnant_necessaire",
          ]}
          labelFin="Voir le résultat médical"
          onTermine={(s) => {
            setSituation(s);
            const r = texte(moteur.setSituation(s), "cible_resultat_medical");
            trackResultat(r, "prescripteur");
          }}
        />
        {panneauOutilsProduit}
      </>
    );
  }

  return (
    <ResultatMedical
      situation={situation}
      onContinuer={() => onPasserAuSecretariat(situation)}
      onRecommencer={onNouvelleSimulation}
    />
  );
}
