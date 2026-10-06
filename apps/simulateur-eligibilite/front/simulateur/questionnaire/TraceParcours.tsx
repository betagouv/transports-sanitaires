// Trace de debug d'un parcours : les pages posées, le brouillon de la page
// ouverte, puis les réponses validées. Sert à comprendre un séquencement
// inattendu.
//
// C'est un outil produit comme la galerie : disponible sur tous les
// environnements, production comprise, et réservé au service qui les déverrouille
// (`front/outils-produit/deverrouillage.ts`). Le simulateur ignore ce service :
// `App` lui passe la réponse, que `autorisee` porte jusqu'ici. Le prop est
// obligatoire pour qu'aucun appelant ne puisse rendre la trace sans avoir dit à
// qui elle s'ouvre.

import type { Passation } from "./passation";
import type { Reponses } from "./question";

type Props = {
  autorisee: boolean;
  passation: Pick<Passation, "pages" | "page" | "brouillon" | "reponses">;
};

export function TraceParcours({ autorisee, passation }: Props) {
  if (!autorisee) return null;
  return (
    <details style={{ marginTop: "2.5rem", fontSize: "0.8rem", color: "#555" }}>
      <summary style={{ cursor: "pointer" }}>Debug — chemin parcouru</summary>
      <div style={{ marginTop: "0.75rem" }}>
        <strong>Pages (◀ = page courante) :</strong>
        <ol style={{ margin: "0.25rem 0 1rem" }}>
          {passation.pages.map((page) => (
            <li
              key={page.id}
              style={{ fontWeight: page === passation.page ? 700 : 400 }}
            >
              <code>{page.id}</code>
              {page === passation.page ? " ◀" : ""}
            </li>
          ))}
        </ol>
        <strong>Brouillon de la page :</strong>
        <ListeDeReponses reponses={passation.brouillon} />
        <strong>Réponses validées :</strong>
        <ListeDeReponses reponses={passation.reponses} />
      </div>
    </details>
  );
}

// ---- implémentation ----

function ListeDeReponses({ reponses }: { reponses: Reponses }) {
  const saisies = Object.entries(reponses);
  return (
    <ul style={{ margin: "0.25rem 0 1rem" }}>
      {saisies.length === 0 && <li>(aucune)</li>}
      {saisies.map(([id, reponse]) => (
        <li key={id}>
          <code>{id}</code> = <code>{JSON.stringify(reponse)}</code>
        </li>
      ))}
    </ul>
  );
}
