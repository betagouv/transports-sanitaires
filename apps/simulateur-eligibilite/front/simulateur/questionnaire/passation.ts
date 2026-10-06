// Pilotage d'un parcours de questions : la page ouverte, son brouillon, ce
// qu'il reste à répondre et la navigation entre pages. Le rendu est dans
// `ParcoursForm.tsx`, l'avancement automatique dans `avancement-automatique.ts`,
// le suivi analytics dans `suivi-de-parcours.ts`.

import { useState } from "react";
import type { AvancementAutomatique } from "./avancement-automatique";
import { useAvancementAutomatique } from "./avancement-automatique";
import { avecPageValidee } from "./invalidation";
import type { Page, Question, Reponse, Reponses } from "./question";
import { estRepondue, pagesPosees, questionsPosees } from "./question";
import type { SuiviDeParcours } from "./suivi-de-parcours";
import { useSuiviDeParcours } from "./suivi-de-parcours";

/** Où en est un parcours : ses réponses validées, et la page ouverte. */
export type EtatDuParcours = {
  readonly reponses: Reponses;
  readonly page: string;
};

export type Options = {
  // Les pages de ce parcours, dans l'ordre. Au moins une doit se poser.
  pages: readonly Page[];
  // Réponses acquises avant ce parcours. Aucune de ses pages ne les repose :
  // elles sont lues par les conditions, et figées par construction. C'est le
  // verrou.
  reponsesAcquises?: Reponses;
  // Reprise d'un parcours déjà mené, le retour depuis une page de résultat. Il
  // rouvre sur sa page, réponses intactes, sans réémettre un début.
  etatInitial?: EtatDuParcours;
  // Le parcours émet-il ses évènements de mesure d'audience ?
  mesure: boolean;
  onTermine: (reponses: Reponses, etat: EtatDuParcours) => void;
};

type Vue = {
  page: Page;
  // Les pages posées, pour la trace de debug.
  pages: readonly Page[];
  questions: readonly Question[];
  // Les réponses de la page telles qu'elles sont à l'écran. Elles ne comptent
  // qu'une fois la page validée.
  brouillon: Reponses;
  reponses: Reponses;
  aUnePrecedente: boolean;
  // Une question affichée attend encore sa réponse : on ne peut pas avancer.
  questionsEnAttente: boolean;
  // Avancer conclura le parcours au lieu d'ouvrir une page de plus.
  derniere: boolean;
};

type Actions = {
  repondre: (id: string, reponse: Reponse | undefined) => void;
  avancer: () => void;
  reculer: () => void;
};

export type Passation = Vue &
  Actions & {
    // La page avancera d'elle-même : le bouton « Suivant » n'a pas à s'afficher.
    avancerSeul: boolean;
  };

export function usePassation(options: Options): Passation {
  const [etat, changer] = useState<Etat>(() => etatDeDepart(options));
  const vue = lire(options.pages, etat);
  const suivi = useSuiviDeParcours(
    vue.pages.indexOf(vue.page) + 1,
    options.mesure,
    options.etatInitial !== undefined,
  );
  const gestes = actions({ etat, changer, vue, options, suivi });
  const avancement = useAvancementAutomatique(
    etat.page,
    pageAChoixUnique(vue.questions),
    vue.questionsEnAttente,
    gestes.avancer,
  );
  return { ...vue, ...avecRelance(gestes, avancement) };
}

/**
 * L'état qu'aurait laissé un utilisateur ayant donné ces réponses : ouvert sur
 * la première page qui attend encore une réponse, sinon sur la dernière. C'est
 * ce qui permet à une seed d'avoir un parcours derrière elle, et donc un
 * « Précédent ».
 */
export function etatApresLesReponses(
  pages: readonly Page[],
  reponses: Reponses,
): EtatDuParcours & { complet: boolean } {
  const posees = pagesPosees(pages, reponses);
  const enAttente = posees.find((page) =>
    questionsPosees(page, reponses).some(
      (question) => !estRepondue(question, reponses[question.id]),
    ),
  );
  const ouverte = enAttente ?? posees.at(-1);
  if (!ouverte) throw new Error("Ce parcours ne pose aucune page.");
  return { reponses, page: ouverte.id, complet: enAttente === undefined };
}

// ---- implémentation ----

type Etat = EtatDuParcours & { readonly brouillon: Reponses };

type Contexte = {
  etat: Etat;
  changer: (etat: Etat) => void;
  vue: Vue;
  options: Options;
  suivi: SuiviDeParcours;
};

function etatDeDepart(options: Options): Etat {
  const reponses = options.etatInitial?.reponses ?? options.reponsesAcquises;
  const depart =
    options.etatInitial ?? etatApresLesReponses(options.pages, reponses ?? {});
  const page = options.pages.find((p) => p.id === depart.page);
  if (!page) throw new Error(`Page inconnue : « ${depart.page} ».`);
  return surLaPage(page, depart.reponses);
}

// Ouvrir une page y dépose ses réponses validées : c'est ce qui la rouvre
// telle qu'elle a été quittée, et ce qu'un « Précédent » sans validation
// abandonne.
function surLaPage(page: Page, reponses: Reponses): Etat {
  const brouillon = Object.fromEntries(
    page.questions
      .filter((question) => reponses[question.id] !== undefined)
      .map((question) => [question.id, reponses[question.id] as Reponse]),
  );
  return { reponses, page: page.id, brouillon };
}

function lire(toutes: readonly Page[], etat: Etat): Vue {
  const pages = pagesPosees(toutes, etat.reponses);
  const page = pages.find((p) => p.id === etat.page);
  if (!page) throw new Error(`La page « ${etat.page} » ne se pose plus.`);
  const questions = questionsPosees(page, lues(etat));
  const questionsEnAttente = questions.some(
    (question) => !estRepondue(question, etat.brouillon[question.id]),
  );
  return {
    page,
    pages,
    questions,
    brouillon: etat.brouillon,
    reponses: etat.reponses,
    aUnePrecedente: pages.indexOf(page) > 0,
    questionsEnAttente,
    derniere:
      !questionsEnAttente &&
      pageSuivante(toutes, page, validees(toutes, etat, page)) === undefined,
  };
}

// Ce que les conditions lisent : les réponses validées, et par-dessus celles
// de la page en cours, pour qu'une question puisse en révéler une autre sur la
// même page.
function lues(etat: Etat): Reponses {
  return { ...etat.reponses, ...etat.brouillon };
}

// Les réponses du parcours, la page courante validée. Une question que la
// page ne pose plus n'y laisse pas de réponse.
function validees(toutes: readonly Page[], etat: Etat, page: Page): Reponses {
  const posees = questionsPosees(page, lues(etat)).map((q) => q.id);
  const saisies = Object.fromEntries(
    Object.entries(etat.brouillon).filter(([id]) => posees.includes(id)),
  );
  return avecPageValidee(toutes, etat.reponses, page, saisies);
}

function pageSuivante(toutes: readonly Page[], page: Page, reponses: Reponses) {
  const pages = pagesPosees(toutes, reponses);
  return pages[pages.findIndex((p) => p.id === page.id) + 1];
}

function actions({ etat, changer, vue, options, suivi }: Contexte): Actions {
  return {
    repondre: (id, reponse) =>
      changer({ ...etat, brouillon: avecReponse(etat.brouillon, id, reponse) }),
    avancer: () => {
      // Le bouton est déjà désactivé, ceci couvre une soumission au clavier.
      if (vue.questionsEnAttente) return;
      const reponses = validees(options.pages, etat, vue.page);
      const suivante = pageSuivante(options.pages, vue.page, reponses);
      if (!suivante) {
        suivi.parcoursConclu();
        return options.onTermine(reponses, { reponses, page: vue.page.id });
      }
      changer(surLaPage(suivante, reponses));
      suivi.etapeFranchie(vue.pages.indexOf(vue.page) + 2);
    },
    // Reculer ne valide rien : le brouillon de la page quittée est abandonné,
    // et la page précédente rouvre sur ses réponses validées.
    reculer: () => {
      const precedente = vue.pages[vue.pages.indexOf(vue.page) - 1];
      if (precedente) changer(surLaPage(precedente, etat.reponses));
    },
  };
}

function avecReponse(
  brouillon: Reponses,
  id: string,
  reponse: Reponse | undefined,
): Reponses {
  const { [id]: _retiree, ...reste } = brouillon;
  return reponse === undefined ? reste : { ...reste, [id]: reponse };
}

// Toute saisie relance l'avancement automatique, y compris au retour sur une
// page déjà répondue, où il avait rendu la main au bouton « Suivant ».
function avecRelance(gestes: Actions, avancement: AvancementAutomatique) {
  return {
    ...gestes,
    avancerSeul: avancement.avancerSeul,
    repondre: (id: string, reponse: Reponse | undefined) => {
      avancement.aLaSaisie();
      gestes.repondre(id, reponse);
    },
  };
}

// L'avancement automatique est réservé aux pages faites de choix uniques. Un
// choix multiple ou une saisie gardent leur bouton, et il suffit d'un seul sur
// la page pour que toute la page le garde : on n'avance pas une page à moitié
// remplie.
function pageAChoixUnique(questions: readonly Question[]): boolean {
  return (
    questions.length > 0 &&
    questions.every((question) => question.forme === "choix unique")
  );
}
