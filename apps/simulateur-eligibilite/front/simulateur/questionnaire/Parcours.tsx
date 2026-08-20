// Parcours de questions générique piloté par `@publicodes/forms` : l'étapeur,
// les champs de la page courante, et les boutons de navigation. Toute la
// mécanique d'état est dans `passation.ts`.

import type { CleDeRegle } from "../contrat-regles-publicodes";
import { ChampsDePage } from "./ChampsDePage";
import type { Champ, Options } from "./passation";
import { usePassation } from "./passation";
import { TraceParcours } from "./TraceParcours";

type Props = Options & {
  // Libellé du bouton de la dernière page.
  libelleFin: string;
  // Message d'information affiché sous l'étapeur, sur la seule page qui pose la
  // question désignée. Le parcours reste générique : c'est l'appelant qui dit
  // quelle question porte quel message.
  bandeau?: { question: CleDeRegle; texte: string };
};

export function Parcours({ libelleFin, bandeau, ...options }: Props) {
  const passation = usePassation(options);

  // En cours de bascule vers la page de résultat : rien à afficher.
  if (passation.aucuneQuestion) return null;

  return (
    <>
      <Etapeur current={passation.current} pageCount={passation.pageCount} />
      <Bandeau bandeau={bandeau} champs={passation.champs} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          passation.avancer();
        }}
      >
        <ChampsDePage
          champs={passation.champs}
          situation={passation.formState.situation}
          onReponse={passation.repondre}
          onReponses={passation.repondrePlusieurs}
        />
        <Navigation passation={passation} libelleFin={libelleFin} />
      </form>
      <Debug passation={passation} outil={options.outil} />
    </>
  );
}

// ---- implémentation ----

function Debug({
  passation,
  outil,
}: {
  passation: ReturnType<typeof usePassation>;
  outil: string;
}) {
  if (!import.meta.env.DEV) return null;
  return (
    <TraceParcours
      formState={passation.formState}
      current={passation.current}
      outil={outil}
    />
  );
}

// Le bandeau ne s'affiche que sur la page où sa question est posée.
function Bandeau({
  bandeau,
  champs,
}: {
  bandeau?: { question: CleDeRegle; texte: string };
  champs: readonly Champ[];
}) {
  if (!bandeau) return null;
  if (!champs.some((champ) => champ.id === bandeau.question)) return null;
  return (
    <div
      className="fr-alert fr-alert--info fr-alert--sm"
      style={{ marginBottom: "2rem" }}
    >
      <p>{bandeau.texte}</p>
    </div>
  );
}

function Etapeur({
  current,
  pageCount,
}: {
  current: number;
  pageCount: number;
}) {
  return (
    <div className="fr-stepper" style={{ marginBottom: "2rem" }}>
      <h2 className="fr-stepper__title">
        <span className="fr-stepper__state">
          Étape {current} sur {pageCount}
        </span>
      </h2>
      <div
        className="fr-stepper__steps"
        data-fr-current-step={current}
        data-fr-steps={pageCount}
      />
      {/* L'avancement automatique change d'écran sans clic : le lecteur d'écran
          doit l'annoncer, sans quoi le changement passe inaperçu. */}
      <p className="fr-sr-only" aria-live="polite">
        Étape {current} sur {pageCount}
      </p>
    </div>
  );
}

function Navigation({
  passation,
  libelleFin,
}: {
  passation: ReturnType<typeof usePassation>;
  libelleFin: string;
}) {
  return (
    <div
      className="fr-btns-group fr-btns-group--inline"
      style={{ marginTop: "2rem" }}
    >
      {passation.hasPreviousPage && (
        <button
          type="button"
          className="fr-btn fr-btn--secondary"
          onClick={passation.reculer}
        >
          Précédent
        </button>
      )}
      {/* Une page à choix unique avance d'elle-même : lui donner un bouton de
          validation contredirait le geste qu'on attend de l'utilisateur. */}
      {!passation.avancerSeul && (
        <button
          type="submit"
          className="fr-btn"
          disabled={passation.questionsEnAttente}
        >
          {passation.parcoursTermine ? libelleFin : "Suivant"}
        </button>
      )}
    </div>
  );
}
