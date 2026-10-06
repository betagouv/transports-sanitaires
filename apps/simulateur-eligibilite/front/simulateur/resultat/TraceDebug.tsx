// Panneau de debug : les réponses données et les sorties décidées, depuis une
// page de résultat.
//
// Même garde que `questionnaire/TraceParcours` : c'est un outil produit,
// disponible en production et réservé au service qui les déverrouille. Le prop
// `autorisee` est obligatoire, et porte la réponse depuis `App`.

type Props = {
  autorisee: boolean;
  titre: string;
  reponses: Readonly<Record<string, unknown>>;
  sorties: Readonly<Record<string, unknown>>;
};

export function TraceDebug({ autorisee, titre, reponses, sorties }: Props) {
  if (!autorisee) return null;
  return (
    <details style={{ marginTop: "2.5rem", fontSize: "0.8rem", color: "#555" }}>
      <summary style={{ cursor: "pointer" }}>Debug — {titre}</summary>
      <div style={{ marginTop: "0.75rem" }}>
        <strong>Sorties décidées :</strong>
        <ListeDeValeurs valeurs={sorties} />
        <strong>Réponses données :</strong>
        <ListeDeValeurs valeurs={reponses} />
      </div>
    </details>
  );
}

// ---- implémentation ----

function ListeDeValeurs({ valeurs }: { valeurs: Props["reponses"] }) {
  const entrees = Object.entries(valeurs);
  return (
    <ul style={{ margin: "0.25rem 0 1rem" }}>
      {entrees.length === 0 && <li>(aucune)</li>}
      {entrees.map(([id, valeur]) => (
        <li key={id}>
          <code>{id}</code> = <code>{JSON.stringify(valeur)}</code>
        </li>
      ))}
    </ul>
  );
}
