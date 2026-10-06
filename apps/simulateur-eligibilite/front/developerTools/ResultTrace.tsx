// Trace de debug d'une page de résultat : les sorties décidées et les réponses
// données.
//
// Même garde que `FlowTrace` : c'est un developer tool, disponible en
// production et réservé au service qui les déverrouille. Le simulateur ne
// l'importe pas : `App` la lui passe.

import type { ResultTraceProps } from "../simulateur/Simulateur";

export function ResultTrace({ title, answers, outputs }: ResultTraceProps) {
  return (
    <details style={{ marginTop: "2.5rem", fontSize: "0.8rem", color: "#555" }}>
      <summary style={{ cursor: "pointer" }}>Debug — {title}</summary>
      <div style={{ marginTop: "0.75rem" }}>
        <strong>Sorties décidées :</strong>
        <ValueList values={outputs} />
        <strong>Réponses données :</strong>
        <ValueList values={answers} />
      </div>
    </details>
  );
}

// ---- implémentation ----

function ValueList({ values }: { values: ResultTraceProps["answers"] }) {
  const entries = Object.entries(values);
  return (
    <ul style={{ margin: "0.25rem 0 1rem" }}>
      {entries.length === 0 && <li>(aucune)</li>}
      {entries.map(([id, value]) => (
        <li key={id}>
          <code>{id}</code> = <code>{JSON.stringify(value)}</code>
        </li>
      ))}
    </ul>
  );
}
