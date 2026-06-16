import { useState } from "react";
import { FormBuilder } from "@publicodes/forms";
import type { FormState } from "@publicodes/forms";
import { engine } from "./engine";
import { FormField } from "./FormField";
import { Resultats } from "./Resultats";

const TARGETS = [
  "éligible",
  "mode de transport",
  "accord préalable requis",
] as const;

const formBuilder = new FormBuilder({ engine });

export function App() {
  const [formState, setFormState] = useState<FormState<string>>(() =>
    formBuilder.start(FormBuilder.newState(), ...TARGETS)
  );
  const [done, setDone] = useState(false);

  const { current, pageCount, hasNextPage, hasPreviousPage } =
    formBuilder.pagination(formState);

  const currentPage = formBuilder.currentPage(formState);

  function handleChange(id: string, value: unknown) {
    setFormState(
      formBuilder.handleInputChange(
        formState,
        id,
        value as string | number | boolean | undefined
      )
    );
  }

  function handleNext() {
    if (hasNextPage) {
      setFormState(formBuilder.goToNextPage(formState));
    } else {
      setDone(true);
    }
  }

  function handlePrev() {
    setFormState(formBuilder.goToPreviousPage(formState));
  }

  function handleReset() {
    setDone(false);
    setFormState(formBuilder.start(FormBuilder.newState(), ...TARGETS));
  }

  if (done) {
    return (
      <main
        className="fr-container"
        style={{ paddingTop: "2rem", paddingBottom: "4rem" }}
      >
        <h1 className="fr-h3">Résultats</h1>
        <Resultats situation={formState.situation} onReset={handleReset} />
      </main>
    );
  }

  return (
    <main
      className="fr-container"
      style={{ paddingTop: "2rem", paddingBottom: "4rem" }}
    >
      <h1 className="fr-h3">
        Simulateur d'éligibilité aux transports sanitaires
      </h1>

      <div
        className="fr-stepper"
        aria-label="Étapes du formulaire"
        style={{ marginBottom: "2rem" }}
      >
        <h2 className="fr-stepper__title">
          {currentPage.title ?? `Étape ${current}`}
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleNext();
        }}
      >
        {currentPage.elements.map((field) => (
          <FormField
            key={field.id}
            field={field}
            onChange={(value) => handleChange(field.id, value)}
          />
        ))}

        <div
          className="fr-btns-group fr-btns-group--inline"
          style={{ marginTop: "2rem" }}
        >
          {hasPreviousPage && (
            <button
              type="button"
              className="fr-btn fr-btn--secondary"
              onClick={handlePrev}
            >
              Précédent
            </button>
          )}
          <button type="submit" className="fr-btn">
            {hasNextPage ? "Suivant" : "Voir les résultats"}
          </button>
        </div>
      </form>
    </main>
  );
}
