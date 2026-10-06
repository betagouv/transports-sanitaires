// Le cadre d'un écran : le `<main>` de la page, dans un conteneur DSFR.
// Un seul par écran, jamais imbriqué.

import type { ReactNode } from "react";

type Props = {
  // Les écrans de saisie se lisent mieux sur une colonne étroite ; les tableaux
  // et les pages de résultat prennent toute la largeur du conteneur.
  etroit?: boolean;
  children: ReactNode;
};

export function Container({ etroit = false, children }: Props) {
  return (
    <main
      className="fr-container"
      style={{
        // Absorbe la hauteur restante quand l'écran est plus haut que le
        // contenu, pour que le pied de page se pose au bas de la fenêtre (voir
        // `SimulateurScreen`). Inerte hors d'un conteneur flex.
        flex: "1 0 auto",
        paddingTop: "2rem",
        paddingBottom: "4rem",
        ...(etroit ? { maxWidth: "60rem" } : {}),
      }}
    >
      {children}
    </main>
  );
}
