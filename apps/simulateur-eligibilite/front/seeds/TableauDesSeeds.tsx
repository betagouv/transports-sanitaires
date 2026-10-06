// Le tableau du catalogue : une seed par ligne, quatre colonnes. Ce qu'elle
// pose, ce qu'elle attend, ce que la décision en dit, et de quoi l'ouvrir. Le
// découpage en sections, lui, est dans `Seeds.tsx` : ici on sait lire
// une seed, pas comment le catalogue se range.

import type { EvaluationSeed, Seed } from "./seed";

export type LigneSeed = { seed: Seed; evaluation: EvaluationSeed };

// Le titre de section passe par la légende du tableau : DSFR la rend visible
// (`.fr-table caption`), un `fr-sr-only` y serait annulé.
export function TableauDesSeeds({
  section,
  lignes,
  onOuvrir,
}: {
  section: { titre: string; sousTitre: string };
  lignes: LigneSeed[];
  onOuvrir: (seed: Seed) => void;
}) {
  return (
    <section className="fr-mb-6w">
      <div className="fr-table fr-table--bordered">
        <table>
          <caption>
            {section.titre}
            <span className="fr-table__detail">{section.sousTitre}</span>
          </caption>
          <ColonnesDuCatalogue />
          <tbody>
            {lignes.map(({ seed, evaluation }) => (
              <Ligne
                key={seed.id}
                seed={seed}
                evaluation={evaluation}
                onOuvrir={() => onOuvrir(seed)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---- implémentation ----

function Ligne({
  seed,
  evaluation,
  onOuvrir,
}: {
  seed: Seed;
  evaluation: EvaluationSeed;
  onOuvrir: () => void;
}) {
  return (
    <tr>
      <IdentiteDeLaSeed seed={seed} />
      <td>
        <Attendus seed={seed} />
      </td>
      <td>
        <Etat evaluation={evaluation} />
      </td>
      <td>
        <button
          type="button"
          className="fr-btn fr-btn--sm fr-btn--tertiary"
          aria-label={`Ouvrir : ${seed.libelle}`}
          onClick={onOuvrir}
        >
          Ouvrir
        </button>
      </td>
    </tr>
  );
}

function ColonnesDuCatalogue() {
  return (
    <thead>
      <tr>
        <th scope="col">Situation</th>
        <th scope="col">Attendu</th>
        <th scope="col">État</th>
        <th scope="col">
          <span className="fr-sr-only">Action</span>
        </th>
      </tr>
    </thead>
  );
}

// Ce qui désigne la seed : son libellé, ce qu'elle raconte, et l'identifiant par
// lequel les tests la nomment.
function IdentiteDeLaSeed({ seed }: { seed: Seed }) {
  return (
    <th scope="row" style={{ maxWidth: "22rem" }}>
      <span className="fr-text--bold">{seed.libelle}</span>
      <br />
      <span className="fr-text--xs" style={{ fontWeight: "normal" }}>
        {seed.description}
      </span>
      <br />
      <code className="fr-text--xs">{seed.id}</code>
    </th>
  );
}

function Attendus({ seed }: { seed: Seed }) {
  return (
    <ul className="fr-text--xs" style={{ margin: 0, paddingLeft: "1rem" }}>
      {Object.entries(seed.attendu).map(([sortie, valeur]) => (
        <li key={sortie}>
          {sortie} : <strong>{String(valeur)}</strong>
        </li>
      ))}
    </ul>
  );
}

function Etat({ evaluation }: Pick<LigneSeed, "evaluation">) {
  const conforme = evaluation.ecarts.length === 0;
  return (
    <>
      <p
        className={`fr-badge fr-badge--sm fr-badge--${conforme ? "success" : "error"}`}
      >
        {conforme ? "conforme" : "écart"}
      </p>
      {!conforme && (
        <ul
          className="fr-text--xs"
          style={{ marginTop: "0.5rem", paddingLeft: "1rem" }}
        >
          {evaluation.ecarts.map((ecart) => (
            <li key={ecart.sortie}>
              {ecart.sortie} : {String(ecart.obtenu)}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
