// Le tableau des seeds : une seed par ligne. Ce qu'elle pose, ce qu'elle attend,
// ce que la préconisation en dit, et un bouton pour l'ouvrir.

import type { Seed, SeedEvaluation } from "./seed";

export type SeedRow = { seed: Seed; evaluation: SeedEvaluation };

// Le titre de section est la légende du tableau. Le DSFR la rend visible
// (`.fr-table caption`) et annulerait un `fr-sr-only`.
export function SeedsTable({
  section,
  rows,
  onOpen,
}: {
  section: { title: string; subtitle: string };
  rows: SeedRow[];
  onOpen: (seed: Seed) => void;
}) {
  return (
    <section className="fr-mb-6w">
      <div className="fr-table fr-table--bordered">
        <table>
          <caption>
            {section.title}
            <span className="fr-table__detail">{section.subtitle}</span>
          </caption>
          <TableHead />
          <tbody>
            {rows.map(({ seed, evaluation }) => (
              <Row
                key={seed.id}
                seed={seed}
                evaluation={evaluation}
                onOpen={() => onOpen(seed)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---- implémentation ----

function Row({
  seed,
  evaluation,
  onOpen,
}: {
  seed: Seed;
  evaluation: SeedEvaluation;
  onOpen: () => void;
}) {
  return (
    <tr>
      <SeedIdentity seed={seed} />
      <td>
        <ExpectedCibles seed={seed} />
      </td>
      <td>
        <Status evaluation={evaluation} />
      </td>
      <td>
        <button
          type="button"
          className="fr-btn fr-btn--sm fr-btn--tertiary"
          aria-label={`Ouvrir : ${seed.label}`}
          onClick={onOpen}
        >
          Ouvrir
        </button>
      </td>
    </tr>
  );
}

function TableHead() {
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
function SeedIdentity({ seed }: { seed: Seed }) {
  return (
    <th scope="row" style={{ maxWidth: "22rem" }}>
      <span className="fr-text--bold">{seed.label}</span>
      <br />
      <span className="fr-text--xs" style={{ fontWeight: "normal" }}>
        {seed.description}
      </span>
      <br />
      <code className="fr-text--xs">{seed.id}</code>
    </th>
  );
}

function ExpectedCibles({ seed }: { seed: Seed }) {
  return (
    <ul className="fr-text--xs" style={{ margin: 0, paddingLeft: "1rem" }}>
      {Object.entries(seed.expected).map(([cible, value]) => (
        <li key={cible}>
          {cible} : <strong>{String(value)}</strong>
        </li>
      ))}
    </ul>
  );
}

function Status({ evaluation }: Pick<SeedRow, "evaluation">) {
  const matches = evaluation.mismatches.length === 0;
  return (
    <>
      <p
        className={`fr-badge fr-badge--sm fr-badge--${matches ? "success" : "error"}`}
      >
        {matches ? "conforme" : "écart"}
      </p>
      {!matches && (
        <ul
          className="fr-text--xs"
          style={{ marginTop: "0.5rem", paddingLeft: "1rem" }}
        >
          {evaluation.mismatches.map((mismatch) => (
            <li key={mismatch.cible}>
              {mismatch.cible} : {String(mismatch.actual)}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
