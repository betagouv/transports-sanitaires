// Trace de debug d'un parcours : les pages posées, le brouillon de la page
// ouverte, puis les réponses validées. Sert à comprendre un séquencement
// inattendu.
//
// C'est un developer tool comme l'écran des seeds : disponible sur tous les
// environnements, production comprise, et réservé au service qui les déverrouille
// (`unlock.ts`). Le simulateur ne l'importe pas : `App` la lui passe, et le
// parcours lui donne son état à afficher.

import type { FlowTraceProps } from "../simulateur/questionnaire/FlowForm";
import type { Answers } from "../simulateur/questionnaire/question";

export function FlowTrace({ flow }: FlowTraceProps) {
  return (
    <details style={{ marginTop: "2.5rem", fontSize: "0.8rem", color: "#555" }}>
      <summary style={{ cursor: "pointer" }}>Debug — chemin parcouru</summary>
      <div style={{ marginTop: "0.75rem" }}>
        <strong>Pages (◀ = page courante) :</strong>
        <ol style={{ margin: "0.25rem 0 1rem" }}>
          {flow.pages.map((page) => (
            <li
              key={page.id}
              style={{ fontWeight: page === flow.page ? 700 : 400 }}
            >
              <code>{page.id}</code>
              {page === flow.page ? " ◀" : ""}
            </li>
          ))}
        </ol>
        <strong>Brouillon de la page :</strong>
        <AnswerList answers={flow.draft} />
        <strong>Réponses validées :</strong>
        <AnswerList answers={flow.answers} />
      </div>
    </details>
  );
}

// ---- implémentation ----

function AnswerList({ answers }: { answers: Answers }) {
  const entries = Object.entries(answers);
  return (
    <ul style={{ margin: "0.25rem 0 1rem" }}>
      {entries.length === 0 && <li>(aucune)</li>}
      {entries.map(([id, answer]) => (
        <li key={id}>
          <code>{id}</code> = <code>{JSON.stringify(answer)}</code>
        </li>
      ))}
    </ul>
  );
}
