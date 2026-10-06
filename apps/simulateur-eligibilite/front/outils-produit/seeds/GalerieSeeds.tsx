// Galerie de seeds : écran réservé au **service produit** (n° 4), sur tous les
// environnements (cf. `App.tsx`). Il range le catalogue de `seeds/` par écran
// d'atterrissage et ouvre celui-ci d'un clic : la page de résultat pour les
// seeds complètes, le questionnaire lui-même pour celles qui s'arrêtent en
// chemin.
//
// Le tableau, lui, est dans `TableauDesSeeds.tsx` : ici on sait quels écrans
// existent, pas comment une seed se lit.
//
// La galerie rejoue chaque seed dans la décision **du navigateur** : la colonne
// « État » dit quelles situations de référence divergent, avant même d'ouvrir
// un parcours.

import { EcranPleinePage } from "../../app/EcranPleinePage";
import { decider } from "../../simulateur/parcours-factice";
import { SEEDS } from "./catalogue";
import { evaluerSeed, ouvreLeQuestionnaire, type Seed } from "./seed";
import { type LigneSeed, TableauDesSeeds } from "./TableauDesSeeds";

type Props = {
  /** Injectable pour les tests (défaut = le catalogue). */
  seeds?: readonly Seed[];
  onOuvrir: (seed: Seed) => void;
  onRetour: () => void;
};

const SECTIONS: ReadonlyArray<{
  cle: string;
  titre: string;
  sousTitre: string;
  retient: (seed: Seed) => boolean;
}> = [
  {
    cle: "resultat",
    titre: "Page de résultat",
    sousTitre:
      "Situations complètes, ouvertes sur leur résultat. « Précédent » y rouvre le questionnaire.",
    retient: (seed) => !ouvreLeQuestionnaire(seed),
  },
  {
    cle: "questionnaire",
    titre: "Questionnaire, là où la seed s'arrête",
    sousTitre:
      "Situations volontairement incomplètes, ouvertes sur la première page sans réponse. Elles n'annoncent aucun attendu.",
    retient: ouvreLeQuestionnaire,
  },
];

export function GalerieSeeds({ seeds = SEEDS, onOuvrir, onRetour }: Props) {
  const lignes = seeds.map((seed) => ({
    seed,
    evaluation: evaluerSeed(decider, seed),
  }));

  return (
    <EcranPleinePage>
      <h1 className="fr-h3">Galerie de seeds</h1>
      <p className="fr-text--sm">
        Les {seeds.length} situations de référence du simulateur (
        <code>seeds/</code>), celles-là mêmes que rejouent les tests.
      </p>
      {lignes.length === 0 ? (
        <CatalogueVide />
      ) : (
        <CatalogueParEcranDAtterrissage lignes={lignes} onOuvrir={onOuvrir} />
      )}
      <button
        type="button"
        className="fr-btn fr-btn--secondary"
        onClick={onRetour}
      >
        Retour
      </button>
    </EcranPleinePage>
  );
}

// ---- implémentation ----

function CatalogueVide() {
  return (
    <div className="fr-alert fr-alert--info fr-alert--sm fr-mb-4w">
      <p>
        Le catalogue est vide. Les situations de référence reviendront avec le
        modèle d’éligibilité suivant.
      </p>
    </div>
  );
}

// Le catalogue est présenté par écran d'atterrissage : c'est ce qui distingue
// une situation complète d'une situation qui s'arrête en chemin, et donc ce
// qu'on vient chercher ici.
function CatalogueParEcranDAtterrissage({
  lignes,
  onOuvrir,
}: {
  lignes: LigneSeed[];
  onOuvrir: (seed: Seed) => void;
}) {
  const enEcart = lignes.filter(
    ({ evaluation }) => evaluation.ecarts.length > 0,
  );
  return (
    <>
      <div
        className={`fr-alert fr-alert--sm fr-mb-4w fr-alert--${
          enEcart.length === 0 ? "success" : "error"
        }`}
      >
        <p>
          {enEcart.length === 0
            ? "La décision confirme les attendus des seeds."
            : `${enEcart.length} seed(s) en écart avec leurs attendus : ${enEcart
                .map(({ seed }) => seed.libelle)
                .join(", ")}.`}
        </p>
      </div>
      {SECTIONS.map((section) => (
        <TableauDesSeeds
          key={section.cle}
          section={section}
          lignes={lignes.filter(({ seed }) => section.retient(seed))}
          onOuvrir={onOuvrir}
        />
      ))}
    </>
  );
}
