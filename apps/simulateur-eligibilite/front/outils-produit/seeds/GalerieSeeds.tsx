// Galerie de seeds — écran réservé au **service produit** (n° 4), sur tous les
// environnements (cf. `App.tsx`). Il liste le catalogue de `seeds/` et ouvre, d'un
// clic, la page de résultat correspondante : Page Résultat 1 pour les seeds de
// Partie 1, Page Résultat 2 pour celles dont l'intérêt est le cas final — d'où l'on
// télécharge le CERFA pré-rempli quand le cas s'y prête.
//
// La galerie rejoue chaque seed dans le moteur **du navigateur** — donc, en mode
// labo, sous les règles en cours de test : la colonne « État » dit alors tout de
// suite quelles situations de référence les nouvelles règles font diverger, avant
// même d'ouvrir un parcours.

import { useMemo } from "react";
import type { Outil } from "../../app/outil";
import { moteur } from "../../simulateur/moteur";
import { SEEDS } from "./catalogue";
import {
  type CibleSeed,
  type EvaluationSeed,
  evaluerSeed,
  type Seed,
} from "./seed";

type Props = {
  onOuvrir: (seed: Seed) => void;
  onRetour: () => void;
};

// Intitulés courts des cibles, pour tenir dans une colonne.
const LIBELLE_CIBLE: Record<CibleSeed, string> = {
  cible_resultat_medical: "Résultat médical",
  cible_transport_sanitaire_prescrit: "Transport",
  cible_partie_2_requise: "Partie 2 requise",
  cible_cas_final: "Cas final",
  cible_document_a_remettre_au_patient: "Document",
  cible_regime_financement: "Qui paie",
  cible_article_80_situation_specifique: "Article 80 — situation spécifique",
  cible_article_80_permission_sortie_therapeutique:
    "Article 80 — permission thérapeutique",
};

const SECTIONS: ReadonlyArray<{
  outil: Outil;
  titre: string;
  sousTitre: string;
}> = [
  {
    outil: "prescripteur",
    titre: "Page Résultat 1 — résultat médical",
    sousTitre:
      "Situations tranchées en Partie 1. Le parcours reste franchissable jusqu'au résultat final.",
  },
  {
    outil: "secretariat",
    titre: "Page Résultat 2 — résultat final",
    sousTitre:
      "Situations complètes (Partie 1 + Partie 2), ouvertes directement sur le cas final.",
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

  const enEcart = lignes.filter(
    ({ evaluation }) => evaluation.ecarts.length > 0,
  );

  return (
    <main
      className="fr-container"
      style={{ paddingTop: "2rem", paddingBottom: "4rem" }}
    >
      <h1 className="fr-h3">Galerie de seeds</h1>
      <p className="fr-text--sm">
        Les {SEEDS.length} situations de référence du simulateur (
        <code>seeds/</code>), celles-là mêmes que rejouent les tests. Ouvrez-en
        une pour consulter son résultat — et, pour un cas de prescription, le
        CERFA pré-rempli.
      </p>

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

      {SECTIONS.map(({ outil, titre, sousTitre }) => (
        <section key={outil} className="fr-mb-6w">
          <div className="fr-table fr-table--bordered">
            <table>
              {/* Le titre de section passe par la légende du tableau : DSFR la rend
                  visible (`.fr-table caption`), un `fr-sr-only` y serait annulé. */}
              <caption>
                {titre}
                <span className="fr-table__detail">{sousTitre}</span>
              </caption>
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
              <tbody>
                {lignes
                  .filter(({ seed }) => seed.outil === outil)
                  .map(({ seed, evaluation }) => (
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
      ))}

      <button
        type="button"
        className="fr-btn fr-btn--secondary"
        onClick={onRetour}
      >
        Retour
      </button>
    </main>
  );
}

function Ligne({
  seed,
  evaluation,
  onOuvrir,
}: {
  seed: Seed;
  evaluation: EvaluationSeed;
  onOuvrir: () => void;
}) {
  const conforme = evaluation.ecarts.length === 0;
  const proposeLeCerfa =
    evaluation.valeurs.cible_cas_final === "prescription médicale de transport";

  return (
    <tr>
      <th scope="row" style={{ maxWidth: "22rem" }}>
        <span className="fr-text--bold">{seed.libelle}</span>
        <br />
        <span className="fr-text--xs" style={{ fontWeight: "normal" }}>
          {seed.description}
        </span>
        <br />
        <code className="fr-text--xs">{seed.id}</code>
      </th>
      {/* Le régime de financement a sa colonne : c'est lui qui dit d'un coup d'œil
          si le transport est à la charge de l'Assurance Maladie — donc si la
          situation est une non-conformité. Toutes les seeds le déclarent. */}
      <td className="fr-text--sm">
        <strong>{String(seed.attendu.cible_regime_financement)}</strong>
      </td>
      <td>
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
      </td>
      <td>
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
