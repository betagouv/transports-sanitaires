import type { Situation } from "publicodes";
import { engine } from "../simulateur/engine";

type Props = {
  situation: Situation<string>;
  onNouvelleSimulation: () => void;
};

// Teinte DSFR de l'alerte selon le cas final déterminé par le moteur.
const TEINTE: Record<string, "success" | "info" | "warning" | "error"> = {
  "prescription médicale de transport": "success",
  "demande accord préalable": "info",
  "convocation ou avis audience": "success",
  "transport charge établissement": "warning",
  SMUR: "warning",
  "bariatrique seul": "error",
  "permission sortie sans motif médical": "error",
  "non éligible assurance maladie dans ce parcours": "error",
};

// Page Résultat 2 — document à imprimer et à remettre au patient.
export function ResultatFinal({ situation, onNouvelleSimulation }: Props) {
  const e = engine.setSituation(situation);
  const casFinal = String(e.evaluate("cas_final").nodeValue ?? "");
  const doc = String(e.evaluate("document_a_remettre_au_patient").nodeValue ?? "");
  const transport = String(
    e.evaluate("transport_sanitaire_prescrit").nodeValue ?? ""
  );
  const teinte = TEINTE[casFinal] ?? "info";

  return (
    <div>
      <div
        className={`fr-alert fr-alert--${teinte}`}
        style={{ marginBottom: "2rem" }}
      >
        <h3 className="fr-alert__title">{casFinal}</h3>
        <p>Transport sanitaire prescrit : {transport}.</p>
      </div>

      <div className="fr-callout" style={{ marginBottom: "1.5rem" }}>
        <h4 className="fr-callout__title">Document à remettre au patient</h4>
        <p className="fr-callout__text">{doc}</p>
      </div>

      <div className="fr-btns-group fr-btns-group--inline">
        <button
          className="fr-btn fr-btn--secondary"
          onClick={onNouvelleSimulation}
        >
          Faire une nouvelle simulation
        </button>
      </div>
    </div>
  );
}
