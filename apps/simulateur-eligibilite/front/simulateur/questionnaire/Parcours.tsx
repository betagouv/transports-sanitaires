// Parcours de questions générique piloté par `@publicodes/forms` : l'étapeur,
// les champs de la page courante, et les boutons de navigation. Toute la
// mécanique d'état est dans `passation.ts`.

import type { CleDeRegle } from "../contrat-regles-publicodes";
import { ChampsDePage } from "./ChampsDePage";
import { mosaiqueDe } from "./mosaique";
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
  // La trace de debug sous le questionnaire est un outil produit : le simulateur
  // sait *où* elle s'affiche, pas à qui elle s'ouvre. Défaut fermé, comme le
  // panneau d'outils : un appelant qui l'oublie n'en montre pas.
  traceDebug?: boolean;
};

export function Parcours({
  libelleFin,
  bandeau,
  traceDebug = false,
  ...options
}: Props) {
  const passation = usePassation(options);

  // En cours de bascule vers la page de résultat : rien à afficher.
  if (passation.aucuneQuestion) return null;

  return (
    <>
      <Etapeur current={passation.current} pageCount={passation.pageCount} />
      <Bandeau bandeau={bandeau} champs={passation.champs} />
      <FormulaireDePage passation={passation} libelleFin={libelleFin} />
      <TraceParcours
        autorisee={traceDebug}
        formState={passation.formState}
        current={passation.current}
        outil={options.outil}
      />
    </>
  );
}

// ---- implémentation ----

// La page elle-même : ses champs, et de quoi la quitter. Valider le formulaire
// avance d'une page, il ne conclut pas le parcours — c'est `passation` qui sait
// quand il n'y a plus rien à poser.
function FormulaireDePage({
  passation,
  libelleFin,
}: {
  passation: ReturnType<typeof usePassation>;
  libelleFin: string;
}) {
  return (
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
  );
}

// Le bandeau ne s'affiche que sur la page où sa question est posée. Une
// mosaïque se désigne par sa règle parente — celle qui porte l'intitulé —, pas
// par l'une de ses options.
function Bandeau({
  bandeau,
  champs,
}: {
  bandeau?: { question: CleDeRegle; texte: string };
  champs: readonly Champ[];
}) {
  if (!bandeau) return null;
  const porteLaQuestion = (champ: Champ) =>
    champ.id === bandeau.question ||
    mosaiqueDe(champ.id)?.parentId === bandeau.question;
  if (!champs.some(porteLaQuestion)) return null;
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
