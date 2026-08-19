// L'avancement automatique du questionnaire (contrat d'interface 2.0.0).
//
// Une page qui n'est faite que de choix uniques avance seule 200 ms après avoir
// été répondue, sans que l'utilisateur ait à valider — le délai lui laisse voir
// sa réponse se cocher. Le bouton « Suivant » disparaît alors : lui laisser un
// bouton de validation contredirait le geste qu'on attend.
//
// Sauf au **retour** sur une page déjà répondue : elle rend la main au bouton,
// faute de quoi un « Précédent » renverrait aussitôt d'où l'on vient. Modifier
// la réponse relance l'avancement automatique.

import { useEffect, useRef, useState } from "react";
import { mosaiqueDe } from "./mosaique";
import type { Champ } from "./passation";

export type AvancementAutomatique = {
  /** La page avancera d'elle-même : le bouton « Suivant » n'a pas à s'afficher. */
  avancerSeul: boolean;
  /** À appeler sur toute saisie : elle relance l'avancement automatique. */
  aLaSaisie: () => void;
};

export function useAvancementAutomatique(
  page: number,
  eligible: boolean,
  questionsEnAttente: boolean,
  avancer: () => void,
): AvancementAutomatique {
  const avancerRef = useRef(avancer);
  avancerRef.current = avancer;

  const [pageVue, setPageVue] = useState(page);
  const [rendreLaMain, setRendreLaMain] = useState(false);
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

/**
 * Le contrat d'interface réserve l'avancement automatique aux questions à choix
 * unique et aux oui/non. Une mosaïque, un nombre ou une saisie libre gardent
 * leur bouton — et il suffit d'un seul sur la page pour que toute la page le
 * garde : on n'avance pas une page à moitié remplie.
 */
export function pageAChoixUnique(champs: readonly Champ[]): boolean {
  const posees = champs.filter((c) => c.applicable !== false && !c.hidden);
  return (
    posees.length > 0 &&
    posees.every(
      (c) =>
        !mosaiqueDe(c.id) &&
        (c.element === "RadioGroup" || c.element === "select"),
    )
  );
}

const DELAI_MS = 200;
