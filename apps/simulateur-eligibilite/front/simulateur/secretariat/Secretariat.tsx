import type { Situation } from "publicodes";
import { type ReactNode, useState } from "react";
import { trackResultat } from "../../analytics/evenements";
import { moteur, texte } from "../moteur";
import { reprendrePassation } from "../passation";
import { Parcours } from "../questionnaire/Parcours";
import { ResultatFinal } from "./ResultatFinal";

type Props = {
  onNouvelleSimulation: () => void;
  // Seed : situation complète (P1 + P2) ouvrant directement la Page Résultat 2,
  // sans passation ni parcours administratif.
  situationFinale?: Situation<string> | null;
  /** Transmis tel quel à la Page Résultat 2 (cf. `ResultatFinal`). */
  documentTelechargeable?: (situation: Situation<string>) => ReactNode;
};

// Outil 2 — parcours administratif du secrétariat : reprend la Partie 1 puis
// pose la Partie 2 → Résultat 2. La situation initiale (P1) rend les questions
// de Partie 1 déjà répondues : `Parcours` ne présente donc que la Partie 2, et
// bascule directement au résultat quand le cas est tranché dès la Partie 1.
export function Secretariat({
  onNouvelleSimulation,
  situationFinale = null,
  documentTelechargeable,
}: Props) {
  const situationP1 = reprendrePassation();
  const [situation, setSituation] = useState<Situation<string> | null>(
    situationFinale,
  );

  // Situation complète déjà connue (parcours P2 terminé, ou seed ouverte) :
  // affiche directement la Page Résultat 2.
  if (situation) {
    return (
      <ResultatFinal
        situation={situation}
        onNouvelleSimulation={onNouvelleSimulation}
        documentTelechargeable={documentTelechargeable}
      />
    );
  }

  if (!situationP1) {
    return (
      <div>
        <div
          className="fr-alert fr-alert--info"
          style={{ marginBottom: "2rem" }}
        >
          <h3 className="fr-alert__title">Aucune prescription en attente</h3>
          <p>Commencez par l'évaluation médicale du transport.</p>
        </div>
        <button type="button" className="fr-btn" onClick={onNouvelleSimulation}>
          Aller à l'évaluation médicale
        </button>
      </div>
    );
  }

  return (
    <>
      <h1 className="fr-h3">Qualification du document à remettre au patient</h1>
      <Parcours
        outil="secretariat"
        cibles={["cible_cas_final", "cible_document_a_remettre_au_patient"]}
        situationInitiale={situationP1}
        labelFin="Voir le document à remettre au patient"
        onTermine={(s) => {
          setSituation(s);
          const cas = texte(moteur.setSituation(s), "cible_cas_final");
          trackResultat(cas, "secretariat");
        }}
      />
    </>
  );
}
