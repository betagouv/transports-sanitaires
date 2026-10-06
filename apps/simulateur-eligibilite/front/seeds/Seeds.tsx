// Le contenu de l'écran des seeds, réservé au service n° 4.
//
// Il rejoue chaque seed dans la décision et signale les écarts. Il range les
// seeds en deux sections : celles qui ouvrent un résultat, et celles qui
// s'arrêtent dans le questionnaire.

import { Container } from "../app/Container";
import { decide } from "../simulateur/fake-questionnaire";
import { SEEDS } from "./catalogue";
import { type SeedRow, SeedsTable } from "./SeedsTable";
import { evaluateSeed, opensQuestionnaire, type Seed } from "./seed";

type Props = {
  /** Injectable pour les tests (défaut = le catalogue). */
  seeds?: readonly Seed[];
  onOpen: (seed: Seed) => void;
  onBack: () => void;
};

const SECTIONS: ReadonlyArray<{
  key: string;
  title: string;
  subtitle: string;
  keeps: (seed: Seed) => boolean;
}> = [
  {
    key: "result",
    title: "Page de résultat",
    subtitle:
      "Situations complètes, ouvertes sur leur résultat. « Précédent » y rouvre le questionnaire.",
    keeps: (seed) => !opensQuestionnaire(seed),
  },
  {
    key: "questionnaire",
    title: "Questionnaire, là où la seed s'arrête",
    subtitle:
      "Situations volontairement incomplètes, ouvertes sur la première page sans réponse. Elles n'annoncent aucun attendu.",
    keeps: opensQuestionnaire,
  },
];

export function Seeds({ seeds = SEEDS, onOpen, onBack }: Props) {
  const rows = seeds.map((seed) => ({
    seed,
    evaluation: evaluateSeed(decide, seed),
  }));

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
        <CatalogueByLanding rows={rows} onOpen={onOpen} />
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

// Le catalogue est groupé par écran d'atterrissage. On distingue ainsi une seed
// complète d'une seed qui s'arrête en chemin.
function CatalogueByLanding({
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
            ? "La décision confirme les attendus des seeds."
            : `${mismatching.length} seed(s) en écart avec leurs attendus : ${mismatching
                .map(({ seed }) => seed.label)
                .join(", ")}.`}
        </p>
      </div>
      {SECTIONS.map((section) => (
        <SeedsTable
          key={section.key}
          section={section}
          rows={rows.filter(({ seed }) => section.keeps(seed))}
          onOpen={onOpen}
        />
      ))}
    </>
  );
}
