// Panneau de debug : les réponses données et les sorties décidées, depuis une
// page de résultat.
//
// Même garde que `questionnaire/FlowTrace` : c'est un developer tool,
// disponible en production et réservé au service qui les déverrouille. Le prop
// `allowed` est obligatoire, et porte la réponse depuis `App`.

type Props = {
  allowed: boolean;
  title: string;
  answers: Readonly<Record<string, unknown>>;
  outputs: Readonly<Record<string, unknown>>;
};

export function DebugTrace({ allowed, title, answers, outputs }: Props) {
  if (!allowed) return null;
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

function ValueList({ values }: { values: Props["answers"] }) {
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
