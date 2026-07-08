import { useEffect, useRef, useState } from "react";
import { FormBuilder } from "@publicodes/forms";
import type { FormState } from "@publicodes/forms";
import { engine } from "./engine";
import { FormField } from "./FormField";
import { Resultats } from "./Resultats";
import {
  trackResultat,
  trackSimulationAbandon,
  trackSimulationComplete,
  trackSimulationStart,
  trackSimulationStep,
} from "../analytics/analytics";

const TARGETS = [
  "resultat . statut",
  "resultat . document",
  "resultat . mode transport",
] as const;

const formBuilder = new FormBuilder({ engine });

export function Simulateur() {
  const [formState, setFormState] = useState<FormState<string>>(() =>
    formBuilder.start(FormBuilder.newState(), ...TARGETS)
  );
  const [done, setDone] = useState(false);

  const { current, pageCount, hasNextPage, hasPreviousPage } =
    formBuilder.pagination(formState);

  // Suivi analytics : début du parcours, et abandon si l'onglet est quitté
  // avant d'atteindre le résultat (refs pour éviter les valeurs périmées).
  const completedRef = useRef(false);
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    trackSimulationStart();
    const onLeave = () => {
      if (!completedRef.current) trackSimulationAbandon(currentRef.current);
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, []);

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
      const next = formBuilder.goToNextPage(formState);
      setFormState(next);
      trackSimulationStep(formBuilder.pagination(next).current);
    } else {
      setDone(true);
      completedRef.current = true;
      trackSimulationComplete();
      const statut = engine
        .setSituation(formState.situation)
        .evaluate("resultat . statut").nodeValue;
      trackResultat(typeof statut === "string" ? statut : "");
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
