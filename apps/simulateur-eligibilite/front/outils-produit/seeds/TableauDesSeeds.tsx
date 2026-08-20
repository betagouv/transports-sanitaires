// Le tableau du catalogue : une seed par ligne, cinq colonnes — ce qu'elle pose,
// qui paie, ce qu'elle attend, ce que le moteur chargé en dit, et de quoi
// l'ouvrir. Le découpage en sections, lui, est dans `GalerieSeeds.tsx` : ici on
// sait lire une seed, pas comment le catalogue se range.

import type { CibleSeed, EvaluationSeed, Seed } from "./seed";

export type LigneSeed = { seed: Seed; evaluation: EvaluationSeed };

// Intitulés courts des cibles, pour tenir dans une colonne.
const LIBELLE_CIBLE: Record<CibleSeed, string> = {
  cible_resultat_medical: "Résultat médical",
  cible_transport_sanitaire_prescrit: "Transport",
  cible_partie_2_requise: "Partie 2 requise",
  cible_cas_final: "Cas final",
  cible_document_a_remettre_au_patient: "Document",
  cible_regime_financement: "Qui paie",
  cible_article_80_situation_specifique: "Article 80 — situation spécifique",
};

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

// La colonne « Qui paie » porte le régime de financement : c'est lui qui dit d'un
// coup d'œil si le transport est à la charge de l'Assurance Maladie — donc si la
// situation est une non-conformité. Toutes les seeds le déclarent.
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
      <td className="fr-text--sm">
        <strong>{String(seed.attendu.cible_regime_financement)}</strong>
      </td>
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

// Les cinq colonnes décrivant une seed, identiques dans les deux tableaux : ce
// qu'elle pose, qui paie, ce qu'elle attend, ce que le moteur en dit, et de quoi
// l'ouvrir.
function ColonnesDuCatalogue() {
  return (
    <thead>
      <tr>
        <th scope="col">Situation</th>
        <th scope="col">Qui paie</th>
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
// lequel les tests et `apercu-cerfa` la nomment.
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
      {Object.entries(seed.attendu)
        .filter(([cible]) => cible !== "cible_regime_financement")
        .map(([cible, valeur]) => (
          <li key={cible}>
            {LIBELLE_CIBLE[cible as CibleSeed]} :{" "}
            <strong>{String(valeur)}</strong>
          </li>
        ))}
    </ul>
  );
}

function Etat({ evaluation }: Pick<LigneSeed, "evaluation">) {
  const conforme = evaluation.ecarts.length === 0;
  const proposeLeCerfa =
    evaluation.valeurs.cible_cas_final === "prescription médicale de transport";
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
          {evaluation.ecarts.map((e) => (
            <li key={e.cible}>
              {LIBELLE_CIBLE[e.cible]} : {String(e.obtenu)}
            </li>
          ))}
        </ul>
      )}
      {proposeLeCerfa && (
        <p className="fr-badge fr-badge--sm fr-badge--info fr-mt-1w">CERFA</p>
      )}
    </>
  );
}
