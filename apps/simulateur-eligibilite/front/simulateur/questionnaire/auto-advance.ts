// L'avancement automatique du questionnaire.
//
// Une page qui n'est faite que de choix uniques avance seule 200 ms après avoir
// été répondue, sans que l'utilisateur ait à valider : le délai lui laisse voir
// sa réponse se cocher. Le bouton « Suivant » disparaît alors : lui laisser un
// bouton de validation contredirait le geste qu'on attend.
//
// Sauf au **retour** sur une page déjà répondue : elle rend la main au bouton,
// faute de quoi un « Précédent » renverrait aussitôt d'où l'on vient. Modifier
// la réponse relance l'avancement automatique. Peu importe d'où vient le
// retour : le « Précédent » d'une page garde le parcours monté, celui d'une page
// de résultat le remonte. Une page déjà répondue à l'ouverture est donc, elle
// aussi, une page où l'on revient.

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
