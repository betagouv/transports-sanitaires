// L'avancement automatique du questionnaire.
//
// Une page faite de choix uniques avance seule, 200 ms après la réponse. Le
// bouton « Suivant » n'est alors pas affiché.
//
// Au retour sur une page déjà répondue, le bouton revient. Sinon « Précédent »
// renverrait aussitôt d'où l'on vient. Changer la réponse relance l'avancement.

import { useEffect, useRef, useState } from "react";

export type AutoAdvance = {
  /** La page avancera d'elle-même : le bouton « Suivant » n'a pas à s'afficher. */
  autoAdvances: boolean;
  /** À appeler sur toute saisie : elle relance l'avancement automatique. */
  onInput: () => void;
};

export function useAutoAdvance(
  page: string,
  eligible: boolean,
  hasPendingQuestions: boolean,
  next: () => void,
): AutoAdvance {
  const nextRef = useRef(next);
  nextRef.current = next;

  const [seenPage, setSeenPage] = useState(page);
  const [waitsForButton, setWaitsForButton] = useState(!hasPendingQuestions);
  if (seenPage !== page) {
    setSeenPage(page);
    setWaitsForButton(!hasPendingQuestions);
  }

  const autoAdvances = eligible && !waitsForButton;
  const triggered = autoAdvances && !hasPendingQuestions;
  useEffect(() => {
    if (!triggered) return;
    const timer = setTimeout(() => nextRef.current(), DELAY_MS);
    return () => clearTimeout(timer);
  }, [triggered]);

  return { autoAdvances, onInput: () => setWaitsForButton(false) };
}

// ---- implémentation ----

const DELAY_MS = 200;
