// Galerie de seeds — écran réservé au **service produit** (n° 4), sur tous les
// environnements (cf. `App.tsx`). Il range le catalogue de `seeds/` par écran
// d'atterrissage et ouvre celui-ci d'un clic : Page Résultat 1 pour les seeds de
// Partie 1, Page Résultat 2 pour celles dont l'intérêt est le cas final — d'où
// l'on télécharge le CERFA pré-rempli quand le cas s'y prête —, et le
// questionnaire lui-même pour celles qui s'arrêtent en chemin.
//
// Le tableau, lui, est dans `TableauDesSeeds.tsx` : ici on sait quels écrans
// existent, pas comment une seed se lit.
//
// La galerie rejoue chaque seed dans le moteur **du navigateur** — donc, en mode
// labo, sous les règles en cours de test : la colonne « État » dit alors tout de
// suite quelles situations de référence les nouvelles règles font diverger, avant
// même d'ouvrir un parcours.

import { useMemo } from "react";
import { EcranPleinePage } from "../../app/EcranPleinePage";
import { moteur } from "../../simulateur/moteur";
import { SEEDS } from "./catalogue";
import { evaluerSeed, ouvreLeQuestionnaire, type Seed } from "./seed";
import { type LigneSeed, TableauDesSeeds } from "./TableauDesSeeds";

type Props = {
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
    cle: "prescripteur",
    titre: "Page Résultat 1 — résultat médical",
    sousTitre:
      "Situations tranchées en Partie 1. Le parcours reste franchissable jusqu'au résultat final.",
    retient: (seed) =>
      seed.outil === "prescripteur" && !ouvreLeQuestionnaire(seed),
  },
  {
    cle: "secretariat",
    titre: "Page Résultat 2 — résultat final",
    sousTitre:
      "Situations complètes (Partie 1 + Partie 2), ouvertes directement sur le cas final.",
    retient: (seed) =>
      seed.outil === "secretariat" && !ouvreLeQuestionnaire(seed),
  },
  {
    cle: "questionnaire",
    titre: "Questionnaire — là où la seed s'arrête",
    sousTitre:
      "Situations volontairement incomplètes, ouvertes sur la première question sans réponse. Elles ne décident aucune cible : leurs colonnes sont donc vides, et c'est normal.",
    retient: ouvreLeQuestionnaire,
  },
];

export function GalerieSeeds({ onOuvrir, onRetour }: Props) {
  // Une seule passe sur le catalogue : `setSituation` réinitialise le moteur à
  // chaque seed, l'évaluation d'une seed n'influence donc pas la suivante.
  const lignes = useMemo(
    () =>
      SEEDS.map((seed) => ({ seed, evaluation: evaluerSeed(moteur, seed) })),
    [],
  );

  return (
    <EcranPleinePage>
      <h1 className="fr-h3">Galerie de seeds</h1>
      <p className="fr-text--sm">
        Les {SEEDS.length} situations de référence du simulateur (
        <code>seeds/</code>), celles-là mêmes que rejouent les tests. Ouvrez-en
        une pour consulter son résultat — et, pour un cas de prescription, le
        CERFA pré-rempli. Les dernières ouvrent le questionnaire au lieu d'un
        résultat : elles s'arrêtent en chemin, à l'écran qu'on veut voir.
      </p>
      <ConformiteDuCatalogue lignes={lignes} />
      <SeedsParEcranDAtterrissage lignes={lignes} onOuvrir={onOuvrir} />
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

// Le moteur effectivement chargé confirme-t-il les attendus du catalogue ? En
// mode labo, ce bandeau est le premier signal qu'une règle de test a bougé.
function ConformiteDuCatalogue({ lignes }: { lignes: LigneSeed[] }) {
  const enEcart = lignes.filter(
    ({ evaluation }) => evaluation.ecarts.length > 0,
  );
  return (
    <div
      className={`fr-alert fr-alert--sm fr-mb-4w fr-alert--${
        enEcart.length === 0 ? "success" : "error"
      }`}
    >
      <p>
        {enEcart.length === 0
          ? "Le moteur chargé confirme les attendus des seeds."
          : `${enEcart.length} seed(s) en écart avec leurs attendus : ${enEcart
              .map(({ seed }) => seed.libelle)
              .join(", ")}.`}
      </p>
    </div>
  );
}

// Le catalogue est présenté par écran d'atterrissage : c'est ce qui distingue une
// situation tranchée en Partie 1 d'une situation complète, et donc ce qu'on vient
// chercher ici. Un troisième tableau ne mène pas à un résultat mais au
// questionnaire, là où la seed s'arrête.
function SeedsParEcranDAtterrissage({
  lignes,
  onOuvrir,
}: {
  lignes: LigneSeed[];
  onOuvrir: (seed: Seed) => void;
}) {
  return SECTIONS.map((section) => (
    <TableauDesSeeds
      key={section.cle}
      section={section}
      lignes={lignes.filter(({ seed }) => section.retient(seed))}
      onOuvrir={onOuvrir}
    />
  ));
}
