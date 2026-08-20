// Pilotage d'un parcours de questions `@publicodes/forms` : l'état dérivé du
// formulaire, ce qu'il reste à répondre et la navigation entre pages. Le rendu
// est dans `Parcours.tsx`, l'avancement automatique dans
// `avancement-automatique.ts`, le suivi analytics dans `suivi-de-parcours.ts`.

import type {
  EvaluatedFormElement,
  FormPageElementProp,
  FormState,
} from "@publicodes/forms";
import { FormBuilder } from "@publicodes/forms";
import type { Situation } from "publicodes";
import { type RefObject, useEffect, useState } from "react";
import { moteur } from "../moteur";
import type { AvancementAutomatique } from "./avancement-automatique";
import {
  pageAChoixUnique,
  useAvancementAutomatique,
} from "./avancement-automatique";
import type { Mosaique } from "./mosaique";
import { mosaiqueDe } from "./mosaique";
import { pagesDuParcours } from "./pagination";
import type { SuiviDeParcours } from "./suivi-de-parcours";
import { useSuiviDeParcours } from "./suivi-de-parcours";

export type Champ = EvaluatedFormElement & FormPageElementProp;

// Plusieurs réponses booléennes à appliquer d'un bloc (cf. `repondrePlusieurs`).
export type Reponses = Array<[string, boolean | undefined]>;

export type Options = {
  // Étiquette analytics de l'outil émetteur (`prescripteur` / `secretariat`).
  outil: string;
  // Règles cibles : leur graphe de dépendances détermine les questions posées.
  cibles: readonly string[];
  // Questions posées mais non bloquantes : la page se quitte sans y répondre.
  // Une question ciblée l'est d'ordinaire parce qu'il *faut* sa réponse ; ces
  // règles-là sont ciblées pour être offertes, pas pour être exigées.
  facultatives?: readonly string[];
  // Réponses déjà connues (ex. la Partie 1 pour le secrétariat) : les questions
  // correspondantes ne sont pas reposées.
  situationInitiale?: Situation<string>;
  // Reprise d'un parcours déjà mené — le retour depuis une page de résultat.
  // Le questionnaire rouvre sur sa dernière page, réponses intactes, et le
  // suivi analytics ne réémet pas un début de simulation.
  etatInitial?: FormState<string>;
  onTermine: (situation: Situation<string>, etat: FormState<string>) => void;
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
  // La page n'est faite que de choix uniques : elle relève de l'avancement
  // automatique, et non du bouton « Suivant » (cf. `useAvancementAutomatique`).
  pageAChoixUnique: boolean;
};

type Actions = {
  repondre: (id: string, valeur: unknown) => void;
  repondrePlusieurs: (reponses: Reponses) => void;
  avancer: () => void;
  reculer: () => void;
};

export type Passation = Etat &
  Actions & {
    // La page avancera d'elle-même : le bouton « Suivant » n'a pas à s'afficher.
    avancerSeul: boolean;
  };

// Un même moteur amorcé avec une situation initiale différente produit deux
// questionnaires distincts (Partie 1 vs Partie 2), sans logique dédiée.
export function usePassation(options: Options): Passation {
  const [formState, setFormState] = useState<FormState<string>>(() =>
    etatDeDepart(options),
  );
  const etat = lireEtat(formState, options.facultatives ?? []);
  const suivi = useSuiviDeParcours(
    options.outil,
    etat.current,
    // Une reprise ne réémet pas un début de simulation : c'est le même parcours.
    !etat.aucuneQuestion && options.etatInitial === undefined,
  );
  useConclusionSansQuestion(etat, formState, options, suivi.termine);

  const gestes = actions({ formState, setFormState, etat, options, suivi });
  const avancement = useAvancementAutomatique(
    etat.current,
    etat.pageAChoixUnique,
    etat.questionsEnAttente,
    gestes.avancer,
  );

  return { ...etat, ...avecRelance(gestes, avancement) };
}

// ---- implémentation ----

// `pageBuilder` : la pagination naturelle de la bibliothèque, à une exception
// près — les douze saisies d'adresse tiennent sur une page (cf. `pagination.ts`).
// `selectTreshold` (sic, orthographe de la lib) : une question à N possibilités
// est rendue en boutons radio jusqu'à ce seuil (défaut 5), en liste déroulante
// au-delà. Relevé à 10 pour garder le radio sur les listes un peu longues.
const formBuilder = new FormBuilder({
  engine: moteur,
  pageBuilder: pagesDuParcours,
  selectTreshold: 10,
});

type Contexte = {
  formState: FormState<string>;
  setFormState: (etat: FormState<string>) => void;
  etat: Etat;
  options: Options;
  suivi: SuiviDeParcours;
};

function lireEtat(
  formState: FormState<string>,
  facultatives: readonly string[],
): Etat {
  const { current, pageCount, hasNextPage, hasPreviousPage } =
    formBuilder.pagination(formState);
  const page = formBuilder.currentPage(formState);
  const questionsEnAttente = resteUneQuestion(
    page.elements.filter((champ) => !facultatives.includes(champ.id)),
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
    pageAChoixUnique: pageAChoixUnique(page.elements),
  };
}

function etatDeDepart(options: Options): FormState<string> {
  return (
    options.etatInitial ??
    formBuilder.start(
      FormBuilder.newState(options.situationInitiale),
      ...options.cibles,
    )
  );
}

function actions({
  formState,
  setFormState,
  etat,
  options,
  suivi,
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
      if (!etat.hasNextPage) return conclure(formState, options, suivi);
      const suivante = formBuilder.goToNextPage(formState);
      setFormState(suivante);
      suivi.etapeFranchie(formBuilder.pagination(suivante).current);
    },
    reculer: () => setFormState(pagePrecedente(formState)),
  };
}

// Toute saisie relance l'avancement automatique — y compris au retour sur une
// page déjà répondue, où il avait rendu la main au bouton « Suivant ».
function avecRelance(gestes: Actions, avancement: AvancementAutomatique) {
  return {
    ...gestes,
    avancerSeul: avancement.avancerSeul,
    repondre: (id: string, valeur: unknown) => {
      avancement.aLaSaisie();
      gestes.repondre(id, valeur);
    },
    repondrePlusieurs: (reponses: Reponses) => {
      avancement.aLaSaisie();
      gestes.repondrePlusieurs(reponses);
    },
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
  suivi: SuiviDeParcours,
) {
  suivi.parcoursConclu();
  options.onTermine(formState.situation, formState);
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
      options.onTermine(formState.situation, formState);
    }
  }, [aucuneQuestion, formState, options, termineRef]);
}

type ValeurSaisie = string | number | boolean | undefined;
