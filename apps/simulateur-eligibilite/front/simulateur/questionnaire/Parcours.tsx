// Parcours de questions générique : l'étapeur, les champs de la page courante,
// et les boutons de navigation. Toute la mécanique d'état est dans
// `passation.ts`.

import { ChampDeFormulaire } from "./ChampDeFormulaire";
import type { Options, Passation } from "./passation";
import { usePassation } from "./passation";
import { erreurDe } from "./question";
import { TraceParcours } from "./TraceParcours";

type Props = Options & {
  // Nombre de parties que l'étapeur annonce. Il compte des parties, jamais des
  // pages : une question de plus ne déplace pas le prescripteur dans le parcours.
  nombreDeParties: number;
  // Libellé du bouton de la dernière page.
  libelleFin: string;
  // La trace de debug sous le questionnaire est un developer tool : le simulateur
  // sait *où* elle s'affiche, pas à qui elle s'ouvre. Défaut fermé : un appelant
  // qui l'oublie n'en montre pas.
  traceDebug?: boolean;
};

export function Parcours({
  nombreDeParties,
  libelleFin,
  traceDebug = false,
  ...options
}: Props) {
  const passation = usePassation(options);

  return (
    <>
      <Etapeur partie={passation.page.partie} sur={nombreDeParties} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          passation.avancer();
        }}
      >
        <ChampsDeLaPage passation={passation} />
        <Navigation passation={passation} libelleFin={libelleFin} />
      </form>
      <TraceParcours autorisee={traceDebug} passation={passation} />
    </>
  );
}

// ---- implémentation ----

// La page rend son brouillon : une saisie ne compte qu'une fois la page validée.
// La première question non répondue prend le focus, pour qu'un parcours se mène
// au clavier.
function ChampsDeLaPage({ passation }: { passation: Passation }) {
  const aFocaliser = passation.questions.find(
    (question) => passation.brouillon[question.id] === undefined,
  );
  return passation.questions.map((question) => (
    <ChampDeFormulaire
      key={question.id}
      question={question}
      reponse={passation.brouillon[question.id]}
      erreur={erreurDe(question, passation.brouillon[question.id])}
      focus={question === aFocaliser}
      onChange={(reponse) => passation.repondre(question.id, reponse)}
    />
  ));
}

function Etapeur({ partie, sur }: { partie: number; sur: number }) {
  return (
    <div className="fr-stepper" style={{ marginBottom: "2rem" }}>
      <h2 className="fr-stepper__title">
        <span className="fr-stepper__state">
          Étape {partie} sur {sur}
        </span>
      </h2>
      <div
        className="fr-stepper__steps"
        data-fr-current-step={partie}
        data-fr-steps={sur}
      />
      {/* L'avancement automatique change d'écran sans clic : le lecteur d'écran
          doit l'annoncer, sans quoi le changement passe inaperçu. */}
      <p className="fr-sr-only" aria-live="polite">
        Étape {partie} sur {sur}
      </p>
    </div>
  );
}

function Navigation({
  passation,
  libelleFin,
}: {
  passation: Passation;
  libelleFin: string;
}) {
  return (
    <div
      className="fr-btns-group fr-btns-group--inline"
      style={{ marginTop: "2rem" }}
    >
      {passation.aUnePrecedente && (
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
          {passation.derniere ? libelleFin : "Suivant"}
        </button>
      )}
    </div>
  );
}
