import { useEffect, useRef, useState } from "react";
import { FormBuilder } from "@publicodes/forms";
import type { FormState } from "@publicodes/forms";
import type { Situation } from "publicodes";
import { engine } from "./engine";
import { construirePages } from "./pages";
import { FormField } from "./FormField";
import { Mosaique } from "./Mosaique";
import { mosaiqueDe, valeurBool } from "./mosaique";
import {
  trackSimulationAbandon,
  trackSimulationComplete,
  trackSimulationStart,
  trackSimulationStep,
} from "../analytics/analytics";

// pageBuilder custom : les noms plats du modèle v3 n'ont pas de namespace pour
// paginer (cf. `pages.ts`).
const formBuilder = new FormBuilder({ engine, pageBuilder: construirePages });

type Props = {
  // Étiquette analytics de l'outil émetteur (`prescripteur` / `secretariat`).
  outil: string;
  // Règles cibles : leur graphe de dépendances détermine les questions posées.
  cibles: readonly string[];
  // Réponses déjà connues (ex. la Partie 1 pour le secrétariat) : les questions
  // correspondantes ne sont pas reposées.
  situationInitiale?: Situation<string>;
  // Libellé du bouton de la dernière page.
  labelFin: string;
  onTermine: (situation: Situation<string>) => void;
};

// Parcours de questions générique piloté par `@publicodes/forms`. Un même
// moteur amorcé avec une situation initiale différente produit deux
// questionnaires distincts (Partie 1 vs Partie 2), sans logique dédiée.
export function Parcours({
  outil,
  cibles,
  situationInitiale,
  labelFin,
  onTermine,
}: Props) {
  const [formState, setFormState] = useState<FormState<string>>(() =>
    formBuilder.start(FormBuilder.newState(situationInitiale), ...cibles)
  );

  const { current, pageCount, hasNextPage, hasPreviousPage } =
    formBuilder.pagination(formState);
  const currentPage = formBuilder.currentPage(formState);

  // Toutes les cibles sont déjà déterminées par la situation initiale : aucune
  // question à poser (parcours court, ex. cas tranché dès la Partie 1). On
  // termine immédiatement. Le ref évite le double-déclenchement en StrictMode.
  const aucuneQuestion = !hasNextPage && currentPage.elements.length === 0;
  const termineRef = useRef(false);

  useEffect(() => {
    if (aucuneQuestion && !termineRef.current) {
      termineRef.current = true;
      onTermine(formState.situation);
    }
  }, [aucuneQuestion, formState, onTermine]);

  // Suivi analytics : début du parcours, abandon si l'onglet est quitté avant
  // la fin (refs pour éviter les valeurs périmées dans le gestionnaire).
  const currentRef = useRef(current);
  currentRef.current = current;
  useEffect(() => {
    if (aucuneQuestion) return;
    trackSimulationStart(outil);
    const onLeave = () => {
      if (!termineRef.current) trackSimulationAbandon(currentRef.current, outil);
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
    // Amorçage unique au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(id: string, value: unknown) {
    setFormState(
      formBuilder.handleInputChange(
        formState,
        id,
        value as string | number | boolean | undefined
      )
    );
  }

  // Applique plusieurs réponses booléennes en une passe. La mosaïque s'en sert
  // pour, à chaque clic, mettre à jour l'option touchée ET figer les autres
  // options du groupe (sinon indéfinies → le moteur les considère non répondues).
  function appliquerMosaique(updates: Array<[string, boolean | undefined]>) {
    let s = formState;
    for (const [id, val] of updates) s = formBuilder.handleInputChange(s, id, val);
    setFormState(s);
  }

  function handleNext() {
    if (hasNextPage) {
      const next = formBuilder.goToNextPage(formState);
      setFormState(next);
      trackSimulationStep(formBuilder.pagination(next).current, outil);
    } else {
      termineRef.current = true;
      trackSimulationComplete(outil);
      onTermine(formState.situation);
    }
  }

  function handlePrev() {
    setFormState(formBuilder.goToPreviousPage(formState));
  }

  // En cours de bascule vers la page de résultat : rien à afficher.
  if (aucuneQuestion) return null;

  // Plan de rendu : une case-à-cocher groupée (Mosaique) pour les champs
  // appartenant à une mosaïque, un FormField pour les autres.
  const parId = new Map(
    currentPage.elements.map((e) => [e.id, e] as const)
  );
  const groupesVus = new Set<string>();
  const champs = currentPage.elements
    .map((field) => {
      const m = mosaiqueDe(field.id);
      if (!m) {
        return (
          <FormField
            key={field.id}
            field={field}
            onChange={(value) => handleChange(field.id, value)}
          />
        );
      }
      if (groupesVus.has(m.parentId)) return null;
      groupesVus.add(m.parentId);
      const opts = m.optionIds
        .map((id) => parId.get(id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e));
      const aucunCoche =
        opts.length > 0 && opts.every((o) => valeurBool(o) === false);
      return (
        <Mosaique
          key={m.parentId}
          question={m.question}
          options={opts}
          aucun={m.aucun ? { label: m.aucun.label, coche: aucunCoche } : undefined}
          onToggleOption={(id, coche) =>
            appliquerMosaique(
              opts.map((o): [string, boolean | undefined] =>
                o.id === id ? [o.id, coche] : [o.id, valeurBool(o) === true]
              )
            )
          }
          onToggleAucun={(coche) =>
            appliquerMosaique(
              opts.map((o): [string, boolean | undefined] => [
                o.id,
                coche ? false : undefined,
              ])
            )
          }
        />
      );
    })
    .filter(Boolean);

  return (
    <>
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
        {champs}

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
            {hasNextPage ? "Suivant" : labelFin}
          </button>
        </div>
      </form>
    </>
  );
}
