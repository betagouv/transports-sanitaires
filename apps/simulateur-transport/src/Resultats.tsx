import type { Situation, EvaluatedNode } from "publicodes";
import { engine } from "./engine";

type Props = {
  situation: Situation<string>;
  onReset: () => void;
};

export function Resultats({ situation, onReset }: Props) {
  const e = engine.setSituation(situation);

  const eligible = e.evaluate("éligible");
  const eligibleValue = eligible.nodeValue as boolean;

  const mode = eligibleValue ? e.evaluate("mode de transport") : null;
  const accord = eligibleValue ? e.evaluate("accord préalable requis") : null;

  return (
    <div>
      <div
        className={`fr-alert ${eligibleValue ? "fr-alert--success" : "fr-alert--error"}`}
        style={{ marginBottom: "2rem" }}
      >
        <h3 className="fr-alert__title">
          {eligibleValue
            ? "Transport pris en charge"
            : "Transport non éligible à la prise en charge"}
        </h3>
        {!eligibleValue && (
          <p>
            Aucune des conditions d'éligibilité n'est remplie pour ce patient.
          </p>
        )}
      </div>

      {eligibleValue && mode && (
        <div className="fr-callout" style={{ marginBottom: "1.5rem" }}>
          <h4 className="fr-callout__title">Mode de transport</h4>
          <p className="fr-callout__text">
            <strong>{String(mode.nodeValue).replace(/'/g, "")}</strong>
          </p>
        </div>
      )}

      {eligibleValue && accord && (
        <div
          className={`fr-callout ${accord.nodeValue ? "fr-callout--brown-caramel" : ""}`}
          style={{ marginBottom: "1.5rem" }}
        >
          <h4 className="fr-callout__title">Accord préalable</h4>
          <p className="fr-callout__text">
            {accord.nodeValue
              ? "Un accord préalable de l'Assurance Maladie est requis."
              : "Aucun accord préalable requis."}
          </p>
        </div>
      )}

      <details style={{ marginBottom: "2rem" }}>
        <summary className="fr-link" style={{ cursor: "pointer" }}>
          Détail des règles évaluées
        </summary>
        <div
          style={{ marginTop: "1rem", fontFamily: "monospace", fontSize: "0.85rem" }}
        >
          <EvalDetail label="Éligible" node={eligible} />
          {mode && <EvalDetail label="Mode de transport" node={mode} />}
          {accord && (
            <EvalDetail label="Accord préalable requis" node={accord} />
          )}
        </div>
      </details>

      <button className="fr-btn fr-btn--secondary" onClick={onReset}>
        Nouvelle simulation
      </button>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EvalDetail({ label, node }: { label: string; node: EvaluatedNode<any> }) {
  const missingVars = node.missingVariables
    ? Object.keys(node.missingVariables)
    : [];

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "4px",
        padding: "1rem",
        marginBottom: "0.75rem",
        background: "#f6f6f6",
      }}
    >
      <div>
        <strong>{label}</strong> ={" "}
        <code>{JSON.stringify(node.nodeValue)}</code>
      </div>
      {missingVars.length > 0 && (
        <div style={{ marginTop: "0.5rem", color: "#666" }}>
          Variables manquantes : {missingVars.join(", ")}
        </div>
      )}
    </div>
  );
}
