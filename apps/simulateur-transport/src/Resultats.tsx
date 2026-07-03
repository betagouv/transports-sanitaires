import type { Situation, EvaluatedNode } from "publicodes";
import { engine } from "./engine";

type Props = {
  situation: Situation<string>;
  onReset: () => void;
};

// Type d'alerte DSFR selon le statut de sortie du moteur.
function alertKind(statut: string): "success" | "info" | "warning" | "error" {
  switch (statut) {
    case "patient-eligible":
    case "patient-eligible-convocation-valant-prescription":
      return "success";
    case "patient-eligible-sous-reserve-accord-prealable":
      return "info";
    case "situation-hors-parcours-assurance-maladie-standard":
    case "simulation-impossible-prescripteur-non-identifie":
      return "warning";
    case "patient-non-eligible":
    default:
      return "error";
  }
}

export function Resultats({ situation, onReset }: Props) {
  const e = engine.setSituation(situation);

  const statutNode = e.evaluate("resultat . statut");
  const documentNode = e.evaluate("resultat . document");
  const modeNode = e.evaluate("resultat . mode transport");

  const statut = String(statutNode.nodeValue ?? "");
  const kind = alertKind(statut);

  const str = (rule: string) => {
    const v = e.evaluate(rule).nodeValue;
    return typeof v === "string" ? v : "";
  };

  const niveau1 = str("interface . sortie patient niveau 1");
  const niveau2 = str("interface . sortie patient niveau 2");
  const niveau3 = str("interface . sortie patient niveau 3");
  const prescripteurDocument = str("interface . sortie prescripteur document");
  const prescripteurAlerte = str("interface . sortie prescripteur alerte");
  const checklistDocument = str("interface . sortie checklist document");
  const checklistMode = str("interface . sortie checklist mode");

  return (
    <div>
      <div
        className={`fr-alert fr-alert--${kind}`}
        style={{ marginBottom: "2rem" }}
      >
        <h3 className="fr-alert__title">{niveau1}</h3>
        {niveau2 && <p>{niveau2}</p>}
      </div>

      {niveau3 && (
        <div className="fr-callout" style={{ marginBottom: "1.5rem" }}>
          <h4 className="fr-callout__title">Ce que vous devez faire</h4>
          <p className="fr-callout__text">{niveau3}</p>
        </div>
      )}

      <div className="fr-callout" style={{ marginBottom: "1.5rem" }}>
        <h4 className="fr-callout__title">Pour le prescripteur</h4>
        <p className="fr-callout__text">
          <strong>Document à compléter :</strong> {prescripteurDocument}
        </p>
        {checklistDocument && (
          <p className="fr-callout__text">{checklistDocument}</p>
        )}
        {checklistMode && <p className="fr-callout__text">{checklistMode}</p>}
      </div>

      {prescripteurAlerte && (
        <div
          className="fr-alert fr-alert--warning"
          style={{ marginBottom: "1.5rem" }}
        >
          <h3 className="fr-alert__title">Point de vigilance</h3>
          <p>{prescripteurAlerte}</p>
        </div>
      )}

      <details style={{ marginBottom: "2rem" }}>
        <summary className="fr-link" style={{ cursor: "pointer" }}>
          Détail des règles évaluées
        </summary>
        <div
          style={{
            marginTop: "1rem",
            fontFamily: "monospace",
            fontSize: "0.85rem",
          }}
        >
          <EvalDetail label="Statut" node={statutNode} />
          <EvalDetail label="Document" node={documentNode} />
          <EvalDetail label="Mode de transport" node={modeNode} />
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
