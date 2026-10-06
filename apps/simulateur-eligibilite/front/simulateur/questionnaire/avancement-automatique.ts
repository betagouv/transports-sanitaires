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

export type AvancementAutomatique = {
  /** La page avancera d'elle-même : le bouton « Suivant » n'a pas à s'afficher. */
  avancerSeul: boolean;
  /** À appeler sur toute saisie : elle relance l'avancement automatique. */
  aLaSaisie: () => void;
};

export function useAvancementAutomatique(
  page: string,
  eligible: boolean,
  questionsEnAttente: boolean,
  avancer: () => void,
): AvancementAutomatique {
  const avancerRef = useRef(avancer);
  avancerRef.current = avancer;

  const [pageVue, setPageVue] = useState(page);
  const [rendreLaMain, setRendreLaMain] = useState(!questionsEnAttente);
  if (pageVue !== page) {
    setPageVue(page);
    setRendreLaMain(!questionsEnAttente);
  }

  const avancerSeul = eligible && !rendreLaMain;
  const declenche = avancerSeul && !questionsEnAttente;
  useEffect(() => {
    if (!declenche) return;
    const minuteur = setTimeout(() => avancerRef.current(), DELAI_MS);
    return () => clearTimeout(minuteur);
  }, [declenche]);

  return { avancerSeul, aLaSaisie: () => setRendreLaMain(false) };
}

// ---- implémentation ----

const DELAI_MS = 200;
