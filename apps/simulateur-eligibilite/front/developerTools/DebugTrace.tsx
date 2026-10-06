// Trace de debug du simulateur : le chemin parcouru, puis ce que l'écran en
// sait de plus. Sous le questionnaire, le brouillon de la page ouverte. Sous un
// résultat, les sorties décidées. Sert à comprendre un séquencement ou une
// décision inattendus.
//
// C'est un developer tool comme l'écran des seeds : disponible sur tous les
// environnements, production comprise, et réservé au service qui les déverrouille
// (`unlock.ts`). Le simulateur ne l'importe pas : `App` la lui passe, et chaque
// écran lui donne son état à afficher.

import type { DebugTraceProps } from "../simulateur/questionnaire/FlowForm";

export function DebugTrace(props: DebugTraceProps) {
  return (
    <details style={{ marginTop: "2.5rem", fontSize: "0.8rem", color: "#555" }}>
      <summary style={{ cursor: "pointer" }}>Debug — {props.title}</summary>
      <div style={{ marginTop: "0.75rem" }}>
        <strong>Pages (◀ = page courante) :</strong>
        <PageList pages={props.pages} currentPage={props.currentPage} />
        {props.draft && (
          <ValueList title="Brouillon de la page" values={props.draft} />
        )}
        <ValueList title="Réponses validées" values={props.answers} />
        {props.outputs && (
          <ValueList title="Sorties décidées" values={props.outputs} />
        )}
      </div>
    </details>
  );
}

// ---- implémentation ----

function PageList({
  pages,
  currentPage,
}: Pick<DebugTraceProps, "pages" | "currentPage">) {
  return (
    <ol style={{ margin: "0.25rem 0 1rem" }}>
      {pages.map((page) => (
        <li
          key={page.id}
          style={{ fontWeight: page.id === currentPage ? 700 : 400 }}
        >
          <code>{page.id}</code>
          {page.id === currentPage ? " ◀" : ""}
        </li>
      ))}
    </ol>
  );
}

function ValueList({
  title,
  values,
}: {
  title: string;
  values: Readonly<Record<string, unknown>>;
}) {
  const entries = Object.entries(values);
  return (
    <>
      <strong>{title} :</strong>
      <ul style={{ margin: "0.25rem 0 1rem" }}>
        {entries.length === 0 && <li>(aucune)</li>}
        {entries.map(([id, value]) => (
          <li key={id}>
            <code>{id}</code> = <code>{JSON.stringify(value)}</code>
          </li>
        ))}
      </ul>
    </>
  );
}
