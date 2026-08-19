// Pilotage d'un parcours de questions `@publicodes/forms` : l'état dérivé du
// formulaire, ce qu'il reste à répondre, la navigation entre pages, et le suivi
// analytics qui les accompagne. Le rendu, lui, est dans `Parcours.tsx`.

import type {
  EvaluatedFormElement,
  FormPageElementProp,
  FormState,
} from "@publicodes/forms";
import { FormBuilder } from "@publicodes/forms";
import type { Situation } from "publicodes";
import { type RefObject, useEffect, useRef, useState } from "react";
import {
  trackSimulationAbandon,
  trackSimulationComplete,
  trackSimulationStart,
  trackSimulationStep,
} from "../../analytics/evenements";
import { moteur } from "../moteur";
import type { Mosaique } from "./mosaique";
import { mosaiqueDe } from "./mosaique";

export type Champ = EvaluatedFormElement & FormPageElementProp;

// Plusieurs réponses booléennes à appliquer d'un bloc (cf. `repondrePlusieurs`).
export type Reponses = Array<[string, boolean | undefined]>;

export type Options = {
  // Étiquette analytics de l'outil émetteur (`prescripteur` / `secretariat`).
  outil: string;
  // Règles cibles : leur graphe de dépendances détermine les questions posées.
  cibles: readonly string[];
  // Réponses déjà connues (ex. la Partie 1 pour le secrétariat) : les questions
  // correspondantes ne sont pas reposées.
  situationInitiale?: Situation<string>;
  onTermine: (situation: Situation<string>) => void;
};

type Etat = {
  champs: readonly Champ[];
  // État brut du formulaire — la situation saisie, et les pages traversées ou
  // à venir. Seule la trace de debug a besoin de ce niveau de détail.
  formState: FormState<string>;
  current: number;
  pageCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  // Toutes les cibles sont déjà déterminées : il n'y a rien à demander.
  aucuneQuestion: boolean;
  // Une question affichée attend encore sa réponse : on ne peut pas avancer.
  questionsEnAttente: boolean;
  // Avancer conclura le parcours au lieu d'ouvrir une page de plus.
  parcoursTermine: boolean;
};

type Actions = {
  repondre: (id: string, valeur: unknown) => void;
  repondrePlusieurs: (reponses: Reponses) => void;
  avancer: () => void;
  reculer: () => void;
};

export type Passation = Etat & Actions;

// Un même moteur amorcé avec une situation initiale différente produit deux
// questionnaires distincts (Partie 1 vs Partie 2), sans logique dédiée.
export function usePassation(options: Options): Passation {
  const [formState, setFormState] = useState<FormState<string>>(() =>
    formBuilder.start(
      FormBuilder.newState(options.situationInitiale),
      ...options.cibles,
    ),
  );
  const etat = lireEtat(formState);
  const termineRef = useSuiviAnalytics(
    options.outil,
    etat.current,
    !etat.aucuneQuestion,
  );
  useConclusionSansQuestion(etat, formState, options, termineRef);

  return {
    ...etat,
    ...actions({ formState, setFormState, etat, options, termineRef }),
  };
}

// ---- implémentation ----

// `pageBuilder` par défaut : depuis le séquencement conditionnel du modèle
// (`applicable si`, v6), la pagination naturelle suffit — le pageBuilder custom
// est désactivé.
// `selectTreshold` (sic, orthographe de la lib) : une question à N possibilités
// est rendue en boutons radio jusqu'à ce seuil (défaut 5), en liste déroulante
// au-delà. Relevé à 10 pour garder le radio sur les listes un peu longues.
const formBuilder = new FormBuilder({ engine: moteur, selectTreshold: 10 });

type Contexte = {
  formState: FormState<string>;
  setFormState: (etat: FormState<string>) => void;
  etat: Etat;
  options: Options;
  termineRef: RefObject<boolean>;
};

function lireEtat(formState: FormState<string>): Etat {
  const { current, pageCount, hasNextPage, hasPreviousPage } =
    formBuilder.pagination(formState);
  const page = formBuilder.currentPage(formState);
  const questionsEnAttente = resteUneQuestion(
    page.elements,
    formState.situation,
  );
  return {
    champs: page.elements,
    formState,
    current,
    pageCount,
    hasNextPage,
    hasPreviousPage,
    aucuneQuestion: !hasNextPage && page.elements.length === 0,
    questionsEnAttente,
    parcoursTermine: !hasNextPage && !questionsEnAttente,
  };
}

function actions({
  formState,
  setFormState,
  etat,
  options,
  termineRef,
}: Contexte): Actions {
  return {
    repondre: (id, valeur) =>
      setFormState(
        formBuilder.handleInputChange(formState, id, valeur as ValeurSaisie),
      ),
    repondrePlusieurs: (reponses) =>
      setFormState(avecReponses(formState, reponses)),
    avancer: () => {
      // Sécurité : ne jamais avancer (ni conclure le parcours) tant qu'une
      // question posée reste sans réponse — le bouton est déjà désactivé, ceci
      // couvre une soumission clavier éventuelle.
      if (etat.questionsEnAttente) return;
      if (!etat.hasNextPage) return conclure(formState, options, termineRef);
      const suivante = formBuilder.goToNextPage(formState);
      setFormState(suivante);
      trackSimulationStep(
        formBuilder.pagination(suivante).current,
        options.outil,
      );
    },
    reculer: () => setFormState(pagePrecedente(formState)),
  };
}

// Une question affichée (applicable et visible) est « posée » : elle doit être
// répondue avant de pouvoir avancer. Le parcours n'est réellement terminé que
// si la page courante est entièrement répondue ET qu'aucune page suivante
// n'existe : avec le séquencement conditionnel du modèle, répondre peut révéler
// de nouvelles pages (`nextPages` recalculées à chaque saisie), donc
// `!hasNextPage` seul ne prouve pas qu'on est au bout — il vaut aussi « vrai »
// sur une page dont les questions ne sont pas encore répondues.
// Une mosaïque (vrai choix multiple) n'est répondue que si au moins une option
// est cochée OU l'option « aucun » l'est. On ne peut PAS se fier à l'`answered`
// par élément : à chaque clic, `repondrePlusieurs` écrit toutes les options
// (dont les non touchées, figées à `false`) dans la situation — elles comptent
// alors toutes comme « answered », y compris après un coche→décoche qui laisse
// le groupe visuellement vide mais sans « aucun » explicite.
function resteUneQuestion(
  champs: readonly Champ[],
  situation: Situation<string>,
): boolean {
  const evalue = moteur.setSituation(situation);
  const coche = (id: string) => evalue.evaluate(id).nodeValue === true;
  const repondue = (m: Mosaique) =>
    m.optionIds.some(coche) || (m.aucun ? coche(m.aucun.id) : false);
  const groupesEvalues = new Set<string>();
  return champs.some((champ) => {
    if (!champ.applicable || champ.hidden) return false;
    const m = mosaiqueDe(champ.id);
    if (!m) return !champ.answered;
    if (groupesEvalues.has(m.parentId)) return false;
    groupesEvalues.add(m.parentId);
    return !repondue(m);
  });
}

// Applique plusieurs réponses booléennes en une passe. La mosaïque s'en sert
// pour, à chaque clic, mettre à jour l'option touchée ET figer les autres
// options du groupe (sinon indéfinies → le moteur les considère non répondues).
function avecReponses(formState: FormState<string>, reponses: Reponses) {
  let etat = formState;
  for (const [id, valeur] of reponses)
    etat = formBuilder.handleInputChange(etat, id, valeur);
  return etat;
}

function pagePrecedente(formState: FormState<string>): FormState<string> {
  // `goToPreviousPage` se contente de décrémenter l'index : les pages en aval
  // restent dans `pages`. Or `computeNextFields` (appelé à chaque saisie)
  // exclut tout ce qui figure déjà dans `pages` — un changement de réponse sur
  // la page de retour ne recalculerait donc jamais la suite du parcours (page
  // suivante figée). On restaure l'état tel qu'il était à l'arrivée sur cette
  // page : les pages en aval repassent de `pages` vers `nextPages`, dans leur
  // ordre d'origine.
  const precedente = formBuilder.goToPreviousPage(formState);
  const i = precedente.currentPageIndex;
  return {
    ...precedente,
    pages: precedente.pages.slice(0, i + 1),
    nextPages: [...precedente.pages.slice(i + 1), ...precedente.nextPages],
  };
}

function conclure(
  formState: FormState<string>,
  options: Options,
  termineRef: RefObject<boolean>,
) {
  termineRef.current = true;
  trackSimulationComplete(options.outil);
  options.onTermine(formState.situation);
}

// Parcours court (ex. cas tranché dès la Partie 1) : aucune question à poser,
// on termine immédiatement. Le ref évite le double-déclenchement en StrictMode.
function useConclusionSansQuestion(
  etat: Etat,
  formState: FormState<string>,
  options: Options,
  termineRef: RefObject<boolean>,
) {
  const { aucuneQuestion } = etat;
  useEffect(() => {
    if (aucuneQuestion && !termineRef.current) {
      termineRef.current = true;
      options.onTermine(formState.situation);
    }
  }, [aucuneQuestion, formState, options, termineRef]);
}

// Début du parcours, et abandon si l'onglet est quitté avant la fin. Le ref
// retourné dit si le parcours s'est conclu — sans lui, l'abandon serait émis
// même après une fin normale.
function useSuiviAnalytics(outil: string, current: number, actif: boolean) {
  const termineRef = useRef(false);
  // Refs pour éviter les valeurs périmées dans le gestionnaire : déclarer
  // `actif` et `outil` en dépendances rejouerait `simulation_start` à chaque
  // changement, `currentRef` existe justement pour lire la valeur fraîche sans
  // redéclarer l'écouteur.
  const currentRef = useRef(current);
  currentRef.current = current;
  // biome-ignore lint/correctness/useExhaustiveDependencies: amorçage unique au montage
  useEffect(() => {
    if (!actif) return;
    trackSimulationStart(outil);
    const onLeave = () => {
      if (!termineRef.current)
        trackSimulationAbandon(currentRef.current, outil);
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, []);
  return termineRef;
}

type ValeurSaisie = string | number | boolean | undefined;
