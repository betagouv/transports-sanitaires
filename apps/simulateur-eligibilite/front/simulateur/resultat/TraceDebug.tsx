// Panneau de debug : les réponses saisies et les sorties évaluées, depuis une
// page de résultat.
//
// Même garde que `questionnaire/TraceParcours` : c'est un outil produit,
// disponible en production et réservé au service qui les déverrouille. Le prop
// `autorisee` est obligatoire, et porte la réponse depuis `App`.

import type { Situation } from "publicodes";
import type { CleDeRegle } from "../contrat-regles-publicodes";
import { moteur } from "../moteur";

type Props = {
  autorisee: boolean;
  titre: string;
  situation: Situation<string>;
  // Règles à évaluer et afficher (sorties calculées du moteur).
  sorties?: CleDeRegle[];
};

// Une page de résultat n'a plus le `formState` du parcours sous la main : d'où
// la relecture de la situation.
export function TraceDebug({
  autorisee,
  titre,
  situation,
  sorties = [],
}: Props) {
  if (!autorisee) return null;
  return (
    <details style={{ marginTop: "2.5rem", fontSize: "0.8rem", color: "#555" }}>
      <summary style={{ cursor: "pointer" }}>Debug — {titre}</summary>
      <div style={{ marginTop: "0.75rem" }}>
        <SortiesEvaluees situation={situation} sorties={sorties} />
        <strong>Réponses saisies :</strong>
        <ListeValeurs valeurs={Object.entries(situation)} marge="0.25rem 0" />
      </div>
    </details>
  );
}

// ---- implémentation ----

function SortiesEvaluees({
  situation,
  sorties,
}: Required<Omit<Props, "autorisee" | "titre">>) {
  if (sorties.length === 0) return null;
  const e = moteur.setSituation(situation);
  return (
    <>
      <strong>Sorties évaluées :</strong>
      <ListeValeurs
        valeurs={sorties.map((id) => [id, e.evaluate(id).nodeValue])}
        marge="0.25rem 0 1rem"
      />
    </>
  );
}

function ListeValeurs({
  valeurs,
  marge,
}: {
  valeurs: Array<[string, unknown]>;
  marge: string;
}) {
  return (
    <ul style={{ margin: marge }}>
      {valeurs.length === 0 && <li>(aucune)</li>}
      {valeurs.map(([id, valeur]) => (
        <li key={id}>
          <code>{id}</code> = <code>{JSON.stringify(valeur)}</code>
        </li>
      ))}
    </ul>
  );
}
