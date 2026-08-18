import type { Situation } from "publicodes";
import { useState } from "react";
import { trackResultat } from "../../analytics/analytics";
import { BoutonOutil, OutilsProduit } from "../../outils-produit/OutilsProduit";
import { moteur } from "../moteur";
import { Parcours } from "../questionnaire/Parcours";
import { ResultatMedical } from "./ResultatMedical";

type Props = {
  // Passe la main au secrétariat en emportant la situation de Partie 1.
  onPasserAuSecretariat: (situationP1: Situation<string>) => void;
  onNouvelleSimulation: () => void;
  // Seed : pré-remplit le parcours pour ouvrir directement le résultat médical.
  situationInitiale?: Situation<string> | null;
  // Ouvre la galerie de seeds, d'où l'on saute au résultat d'une situation type —
  // dont les cas menant au CERFA. Absent hors du service produit (cf. `App`).
  onGalerieSeeds?: () => void;
};

// Outil 1 — parcours médical du prescripteur : Partie 1 → Résultat 1.
// Cibles limitées aux sorties médicales : le graphe ne tire que les questions
// de Partie 1.
export function Prescripteur({
  onPasserAuSecretariat,
  onNouvelleSimulation,
  situationInitiale = null,
  onGalerieSeeds,
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
            const r = String(
              moteur.setSituation(s).evaluate("cible_resultat_medical")
                .nodeValue ?? "",
            );
            trackResultat(r, "prescripteur");
          }}
        />
        {/* Même destination — et donc même libellé — qu'à l'écran-porte : la
            galerie de seeds. Le mode test des règles, lui, reste à la porte : il
            recharge l'application, et donc perdrait le parcours en cours. */}
        {onGalerieSeeds && (
          <OutilsProduit>
            <BoutonOutil onClick={onGalerieSeeds}>Galerie de seeds</BoutonOutil>
          </OutilsProduit>
        )}
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
