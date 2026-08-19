// Parcours de questions générique piloté par `@publicodes/forms` : l'étapeur,
// les champs de la page courante, et les boutons de navigation. Toute la
// mécanique d'état est dans `passation.ts`.

import { ChampsDePage } from "./ChampsDePage";
import type { Options } from "./passation";
import { usePassation } from "./passation";
import { TraceParcours } from "./TraceParcours";

type Props = Options & {
  // Libellé du bouton de la dernière page.
  libelleFin: string;
};

export function Parcours({ libelleFin, ...options }: Props) {
  const passation = usePassation(options);

  // En cours de bascule vers la page de résultat : rien à afficher.
  if (passation.aucuneQuestion) return null;

  return (
    <>
      <Etapeur current={passation.current} pageCount={passation.pageCount} />
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
      <button
        type="submit"
        className="fr-btn"
        disabled={passation.questionsEnAttente}
      >
        {passation.parcoursTermine ? libelleFin : "Suivant"}
      </button>
    </div>
  );
}
