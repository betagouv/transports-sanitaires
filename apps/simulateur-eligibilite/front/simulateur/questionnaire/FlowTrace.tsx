// Trace de debug d'un parcours : les pages posées, le brouillon de la page
// ouverte, puis les réponses validées. Sert à comprendre un séquencement
// inattendu.
//
// C'est un developer tool comme l'écran des seeds : disponible sur tous les
// environnements, production comprise, et réservé au service qui les déverrouille
// (`front/developerTools/unlock.ts`). Le simulateur ignore ce service :
// `App` lui passe la réponse, que `allowed` porte jusqu'ici. Le prop est
// obligatoire pour qu'aucun appelant ne puisse rendre la trace sans avoir dit à
// qui elle s'ouvre.

import type { Flow } from "./flow";
import type { Answers } from "./question";

type Props = {
  allowed: boolean;
  flow: Pick<Flow, "pages" | "page" | "draft" | "answers">;
};

export function FlowTrace({ allowed, flow }: Props) {
  if (!allowed) return null;
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
