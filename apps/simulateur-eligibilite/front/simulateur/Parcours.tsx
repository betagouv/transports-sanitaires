import { useEffect, useRef, useState } from "react";
import { FormBuilder } from "@publicodes/forms";
import type {
  EvaluatedFormElement,
  FormPageElementProp,
  FormState,
} from "@publicodes/forms";
import type { Situation } from "publicodes";
import { engine } from "./engine";
import { FormField } from "./FormField";
import { Mosaique } from "./Mosaique";
import { mosaiqueDe, valeurBool } from "./mosaique";
import {
  trackSimulationAbandon,
  trackSimulationComplete,
  trackSimulationStart,
  trackSimulationStep,
} from "../analytics/analytics";

// pageBuilder par défaut : depuis le séquencement conditionnel du modèle
// (`applicable si`, v6), la pagination naturelle suffit — le pageBuilder custom
// est désactivé.
const formBuilder = new FormBuilder({ engine });

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

  // Une question affichée (applicable et visible) est « posée » : elle doit être
  // répondue avant de pouvoir avancer. Le parcours n'est réellement terminé que
  // si la page courante est entièrement répondue ET qu'aucune page suivante
  // n'existe : avec le séquencement conditionnel du modèle, répondre peut révéler
  // de nouvelles pages (`nextPages` recalculées à chaque saisie), donc
  // `!hasNextPage` seul ne prouve pas qu'on est au bout — il vaut aussi « vrai »
  // sur une page dont les questions ne sont pas encore répondues.
  const questionsEnAttente = currentPage.elements.some(
    (e) => e.applicable && !e.hidden && !e.answered
  );
  const parcoursTermine = !hasNextPage && !questionsEnAttente;

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

  // Valeur booléenne courante d'une règle : depuis son champ de page s'il est
  // présent, sinon par évaluation (cas d'une règle « aucun » inerte, hors page).
  function valeurRegle(
    id: string,
    champ?: EvaluatedFormElement & FormPageElementProp
  ): boolean {
    if (champ) return valeurBool(champ) === true;
    return (
      engine.setSituation(formState.situation).evaluate(id).nodeValue === true
    );
  }

  function handleNext() {
    // Sécurité : ne jamais avancer (ni conclure le parcours) tant qu'une
    // question posée reste sans réponse — le bouton est déjà désactivé, ceci
    // couvre une soumission clavier éventuelle.
    if (questionsEnAttente) return;
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
    // `goToPreviousPage` se contente de décrémenter l'index : les pages en aval
    // restent dans `pages`. Or `computeNextFields` (appelé à chaque saisie)
    // exclut tout ce qui figure déjà dans `pages` — un changement de réponse sur
    // la page de retour ne recalculerait donc jamais la suite du parcours (page
    // suivante figée). On restaure l'état tel qu'il était à l'arrivée sur cette
    // page : les pages en aval repassent de `pages` vers `nextPages`, dans leur
    // ordre d'origine.
    const prev = formBuilder.goToPreviousPage(formState);
    const i = prev.currentPageIndex;
    setFormState({
      ...prev,
      pages: prev.pages.slice(0, i + 1),
      nextPages: [...prev.pages.slice(i + 1), ...prev.nextPages],
    });
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
      const aucunId = m.aucun?.id;
      // État de « aucun » lu sur SA règle (champ de page si présent, sinon
      // évaluation) — pas dérivé des autres options, car cette règle peut porter
      // de la logique métier (ex. p1_critere_aucune_situation_encadree).
      const aucunCoche = aucunId
        ? valeurRegle(aucunId, parId.get(aucunId))
        : false;
      // Écritures liées à « aucun » (exclusivité) ajoutées à chaque bascule.
      const ecrireAucun = (
        v: boolean | undefined
      ): Array<[string, boolean | undefined]> =>
        aucunId ? [[aucunId, v]] : [];
      return (
        <Mosaique
          key={m.parentId}
          question={m.question}
          options={opts}
          aucun={m.aucun ? { label: m.aucun.label, coche: aucunCoche } : undefined}
          onToggleOption={(id, coche) =>
            appliquerMosaique([
              ...opts.map((o): [string, boolean | undefined] =>
                o.id === id ? [o.id, coche] : [o.id, valeurBool(o) === true]
              ),
              // Cocher/décocher une option exclut « aucun ».
              ...ecrireAucun(false),
            ])
          }
          onToggleAucun={(coche) =>
            appliquerMosaique([
              // « Aucun » décoche toutes les options…
              ...opts.map((o): [string, boolean | undefined] => [o.id, false]),
              // …et active/désactive sa propre règle.
              ...ecrireAucun(coche),
            ])
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
          <button
            type="submit"
            className="fr-btn"
            disabled={questionsEnAttente}
          >
            {parcoursTermine ? labelFin : "Suivant"}
          </button>
        </div>
      </form>

      {import.meta.env.DEV && (
        <details
          style={{ marginTop: "2.5rem", fontSize: "0.8rem", color: "#555" }}
        >
          <summary style={{ cursor: "pointer" }}>
            Debug — chemin parcouru ({outil})
          </summary>
          <div style={{ marginTop: "0.75rem" }}>
            <strong>Pages (◀ = page courante) :</strong>
            <ol style={{ margin: "0.25rem 0 1rem" }}>
              {[...formState.pages, ...formState.nextPages].map((page, i) => (
                <li
                  key={i}
                  style={{ fontWeight: i === current - 1 ? 700 : 400 }}
                >
                  <code>{page.elements.join(", ") || "—"}</code>
                  {i === current - 1 ? " ◀" : ""}
                </li>
              ))}
            </ol>
            <strong>Réponses saisies :</strong>
            <ul style={{ margin: "0.25rem 0" }}>
              {Object.keys(formState.situation).length === 0 && (
                <li>(aucune)</li>
              )}
              {Object.entries(formState.situation).map(([id, valeur]) => (
                <li key={id}>
                  <code>{id}</code> = <code>{JSON.stringify(valeur)}</code>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </>
  );
}
