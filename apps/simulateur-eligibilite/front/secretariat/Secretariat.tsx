import { useState } from "react";
import type { Situation } from "publicodes";
import { Parcours } from "../simulateur/Parcours";
import { ResultatFinal } from "./ResultatFinal";
import { reprendrePassation } from "../simulateur/passation";
import { engine } from "../simulateur/engine";
import { trackResultat } from "../analytics/analytics";

type Props = {
  onNouvelleSimulation: () => void;
  // Raccourci dev : situation complète (P1 + P2) ouvrant directement la Page
  // Résultat 2, sans passation ni parcours administratif.
  situationFinale?: Situation<string> | null;
};

// Outil 2 — parcours administratif du secrétariat : reprend la Partie 1 puis
// pose la Partie 2 → Résultat 2. La situation initiale (P1) rend les questions
// de Partie 1 déjà répondues : `Parcours` ne présente donc que la Partie 2, et
// bascule directement au résultat quand le cas est tranché dès la Partie 1.
export function Secretariat({
  onNouvelleSimulation,
  situationFinale = null,
}: Props) {
  const situationP1 = reprendrePassation();
  const [situation, setSituation] = useState<Situation<string> | null>(
    situationFinale
  );

  // Situation complète déjà connue (parcours P2 terminé, ou raccourci dev) :
  // affiche directement la Page Résultat 2.
  if (situation) {
    return (
      <ResultatFinal
        situation={situation}
        onNouvelleSimulation={onNouvelleSimulation}
      />
    );
  }

  if (!situationP1) {
    return (
      <div>
        <div className="fr-alert fr-alert--info" style={{ marginBottom: "2rem" }}>
          <h3 className="fr-alert__title">Aucune prescription en attente</h3>
          <p>Commencez par l'évaluation médicale du transport.</p>
        </div>
        <button className="fr-btn" onClick={onNouvelleSimulation}>
          Aller à l'évaluation médicale
        </button>
      </div>
    );
  }

  return (
    <Parcours
      outil="secretariat"
      cibles={["cas_final", "document_a_remettre_au_patient"]}
      situationInitiale={situationP1}
      labelFin="Voir le document à remettre au patient"
      onTermine={(s) => {
        setSituation(s);
        const cas = String(
          engine.setSituation(s).evaluate("cas_final").nodeValue ?? ""
        );
        trackResultat(cas, "secretariat");
      }}
    />
  );
}
