// Le stepper du simulateur : « Étape n sur N ». Il compte des parties, jamais
// des pages. Le questionnaire l'affiche, les résultats aussi.

export function Stepper({ part, total }: { part: number; total: number }) {
  return (
    <div className="fr-stepper" style={{ marginBottom: "2rem" }}>
      <h2 className="fr-stepper__title">
        <span className="fr-stepper__state">
          Étape {part} sur {total}
        </span>
      </h2>
      <div
        className="fr-stepper__steps"
        data-fr-current-step={part}
        data-fr-steps={total}
      />
      {/* L'avancement automatique change d'écran sans clic : le lecteur d'écran
          doit l'annoncer, sans quoi le changement passe inaperçu. */}
      <p className="fr-sr-only" aria-live="polite">
        Étape {part} sur {total}
      </p>
    </div>
  );
}
