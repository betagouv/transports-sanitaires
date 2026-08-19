// Trace de debug d'un parcours (DEV uniquement) : les pages traversées et à
// venir, puis les réponses saisies. Sert à comprendre un séquencement
// inattendu sans instrumenter le moteur.

import type { FormState } from "@publicodes/forms";
import { reglesBrutes } from "../moteur";

type Props = {
  formState: FormState<string>;
  // Numéro de la page courante (1-indexé, comme la pagination de la lib).
  current: number;
  outil: string;
};

export function TraceParcours({ formState, current, outil }: Props) {
  return (
    <details style={{ marginTop: "2.5rem", fontSize: "0.8rem", color: "#555" }}>
      <summary style={{ cursor: "pointer" }}>
        Debug — chemin parcouru ({outil})
      </summary>
      <div style={{ marginTop: "0.75rem" }}>
        <strong>Pages (◀ = page courante) :</strong>
        <ListePages formState={formState} current={current} />
        <strong>Réponses saisies :</strong>
        <ListeReponses situation={formState.situation} />
      </div>
    </details>
  );
}

// ---- implémentation ----

function ListePages({ formState, current }: Omit<Props, "outil">) {
  const pages = [...formState.pages, ...formState.nextPages];
  return (
    <ol style={{ margin: "0.25rem 0 1rem" }}>
      {pages.map((page, i) => (
        <li
          // Trace de debug rendue d'un bloc, jamais réordonnée — et deux pages
          // peuvent porter exactement les mêmes éléments.
          // biome-ignore lint/suspicious/noArrayIndexKey: pas d'autre identifiant stable
          key={i}
          style={{ fontWeight: i === current - 1 ? 700 : 400 }}
        >
          {page.elements.length === 0 ? (
            <code>—</code>
          ) : (
            page.elements.map((id, j) => <Element key={id} id={id} rang={j} />)
          )}
          {i === current - 1 ? " ◀" : ""}
        </li>
      ))}
    </ol>
  );
}

function ListeReponses({
  situation,
}: {
  situation: FormState<string>["situation"];
}) {
  const saisies = Object.entries(situation);
  return (
    <ul style={{ margin: "0.25rem 0" }}>
      {saisies.length === 0 && <li>(aucune)</li>}
      {saisies.map(([id, valeur]) => (
        <li key={id}>
          <code>{id}</code> = <code>{JSON.stringify(valeur)}</code>
        </li>
      ))}
    </ul>
  );
}

function Element({ id, rang }: { id: string; rang: number }) {
  const specId = specIdDe(id);
  return (
    <span>
      {rang > 0 ? ", " : ""}
      <code>{id}</code>
      {specId ? ` [${specId}]` : ""}
    </span>
  );
}

// Identifiant fonctionnel (spec_id) d'une règle, lu depuis les métadonnées
// brutes du modèle — pour la trace de debug uniquement.
function specIdDe(id: string): string | undefined {
  const regle = reglesBrutes[id];
  return regle && typeof regle === "object"
    ? (regle as { spec_id?: string }).spec_id
    : undefined;
}
