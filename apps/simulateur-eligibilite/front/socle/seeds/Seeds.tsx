// Le contenu de l'écran des seeds, réservé au service n° 4.
//
// Il rejoue chaque seed dans la préconisation et signale les écarts. Il range les
// seeds en deux sections : celles qui ouvrent un résultat, et celles qui
// s'arrêtent dans le questionnaire.

import { Container } from "../app/Container";
import { type Model, preconisationOf } from "../model";
import { startingScreen } from "../simulateur/start";
import { type SeedRow, SeedsTable } from "./SeedsTable";
import { evaluateSeed, type Seed } from "./seed";

type Props = {
  seeds: readonly Seed[];
  /** Le modèle dont on rejoue les seeds. */
  model: Model;
  onOpen: (seed: Seed) => void;
  onBack: () => void;
};

const SECTIONS: ReadonlyArray<{
  key: string;
  title: string;
  subtitle: string;
  keeps: (row: SeedRow) => boolean;
}> = [
  {
    key: "resultat",
    title: "Résultat",
    subtitle:
      "Situations complètes, ouvertes sur leur résultat. « Précédent » y rouvre le questionnaire.",
    keeps: ({ opensOnResultat }) => opensOnResultat,
  },
  {
    key: "questionnaire",
    title: "Questionnaire, là où la seed s'arrête",
    subtitle:
      "Situations incomplètes, ouvertes sur la première page sans réponse. Elles n'annoncent aucun attendu.",
    keeps: ({ opensOnResultat }) => !opensOnResultat,
  },
];

export function Seeds({ seeds, model, onOpen, onBack }: Props) {
  const rows = seeds.map((seed) => rowOf(model, seed));

  return (
    <Container>
      <h1 className="fr-h3">Seeds</h1>
      <p className="fr-text--sm">
        Les {seeds.length} situations de référence du simulateur (
        <code>seeds/</code>), celles-là mêmes que rejouent les tests.
      </p>
      {rows.length === 0 ? (
        <EmptyCatalogue />
      ) : (
        <CatalogueByScreen rows={rows} onOpen={onOpen} />
      )}
      <button
        type="button"
        className="fr-btn fr-btn--secondary"
        onClick={onBack}
      >
        Retour
      </button>
    </Container>
  );
}

// ---- implémentation ----

function EmptyCatalogue() {
  return (
    <div className="fr-alert fr-alert--info fr-alert--sm fr-mb-4w">
      <p>Le catalogue est vide.</p>
    </div>
  );
}

// Ce que le tableau montre d'une seed : ce que le modèle en préconise, et
// l'écran où ses réponses mènent. Le parcours le déduit, la seed ne le dit pas.
function rowOf(model: Model, seed: Seed): SeedRow {
  const screen = startingScreen(model, seed.answers).name;
  return {
    seed,
    evaluation: evaluateSeed(
      (answers) => preconisationOf(model, answers).cibles,
      seed,
    ),
    opensOnResultat: screen === "resultat" || screen === "cerfa",
  };
}

// Le catalogue est groupé par écran d'ouverture. On distingue ainsi une seed
// complète d'une seed qui s'arrête en chemin.
function CatalogueByScreen({
  rows,
  onOpen,
}: {
  rows: SeedRow[];
  onOpen: (seed: Seed) => void;
}) {
  const mismatching = rows.filter(
    ({ evaluation }) => evaluation.mismatches.length > 0,
  );
  return (
    <>
      <div
        className={`fr-alert fr-alert--sm fr-mb-4w fr-alert--${
          mismatching.length === 0 ? "success" : "error"
        }`}
      >
        <p>
          {mismatching.length === 0
            ? "La préconisation confirme les attendus des seeds."
            : `${mismatching.length} seed(s) en écart avec leurs attendus : ${mismatching
                .map(({ seed }) => seed.label)
                .join(", ")}.`}
        </p>
      </div>
      {SECTIONS.map((section) => (
        <SeedsTable
          key={section.key}
          section={section}
          rows={rows.filter(section.keeps)}
          onOpen={onOpen}
        />
      ))}
    </>
  );
}
