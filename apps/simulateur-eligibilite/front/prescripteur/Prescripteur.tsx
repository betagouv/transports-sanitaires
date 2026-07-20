import { useState } from "react";
import type { Situation } from "publicodes";
import { Parcours } from "../simulateur/Parcours";
import { ResultatMedical } from "./ResultatMedical";
import { engine } from "../simulateur/engine";
import { trackResultat } from "../analytics/analytics";

type Props = {
  // Passe la main au secrétariat en emportant la situation de Partie 1.
  onPasserAuSecretariat: (situationP1: Situation<string>) => void;
  onNouvelleSimulation: () => void;
};

// Outil 1 — parcours médical du prescripteur : Partie 1 → Résultat 1.
// Cibles limitées aux sorties médicales : le graphe ne tire que les questions
// de Partie 1.
export function Prescripteur({
  onPasserAuSecretariat,
  onNouvelleSimulation,
}: Props) {
  const [situation, setSituation] = useState<Situation<string> | null>(null);

  if (!situation) {
    return (
      <Parcours
        outil="prescripteur"
        // Décision médicale + sorties Partie 1 destinées au document : cibler ces
        // sorties fait collecter leurs questions propres (sinon jamais posées,
        // car applicables mais hors du graphe des cibles). Toutes sont P1 (aucune
        // dépendance p2_*), donc aucune question Partie 2 n'est posée ici.
        cibles={[
          "transport_sanitaire_prescrit",
          "partie_2_requise",
          "sortie_transport_partage_incompatible",
          "sortie_autonomie_patient",
          "sortie_accompagnant_necessaire",
        ]}
        labelFin="Voir le résultat médical"
        onTermine={(s) => {
          setSituation(s);
          const r = String(
            engine.setSituation(s).evaluate("resultat_medical").nodeValue ?? ""
          );
          trackResultat(r, "prescripteur");
        }}
      />
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
