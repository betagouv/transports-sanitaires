import type { Situation } from "publicodes";
import { engine } from "./engine";

type Props = {
  titre: string;
  situation: Situation<string>;
  // Règles à évaluer et afficher (sorties calculées du moteur).
  sorties?: string[];
};

// Panneau de debug (mode dev uniquement) : réponses saisies + sorties évaluées,
// pour suivre le chemin parcouru depuis une page de résultat, où le `formState`
// du parcours n'est plus disponible.
export function TraceDebug({ titre, situation, sorties = [] }: Props) {
  if (!import.meta.env.DEV) return null;
  const e = engine.setSituation(situation);
  return (
    <details style={{ marginTop: "2.5rem", fontSize: "0.8rem", color: "#555" }}>
      <summary style={{ cursor: "pointer" }}>Debug — {titre}</summary>
      <div style={{ marginTop: "0.75rem" }}>
        {sorties.length > 0 && (
          <>
            <strong>Sorties évaluées :</strong>
            <ul style={{ margin: "0.25rem 0 1rem" }}>
              {sorties.map((id) => (
                <li key={id}>
                  <code>{id}</code> ={" "}
                  <code>{JSON.stringify(e.evaluate(id).nodeValue)}</code>
                </li>
              ))}
            </ul>
          </>
        )}
        <strong>Réponses saisies :</strong>
        <ul style={{ margin: "0.25rem 0" }}>
          {Object.keys(situation).length === 0 && <li>(aucune)</li>}
          {Object.entries(situation).map(([id, valeur]) => (
            <li key={id}>
              <code>{id}</code> = <code>{JSON.stringify(valeur)}</code>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
