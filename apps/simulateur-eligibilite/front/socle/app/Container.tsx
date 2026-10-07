// Le cadre d'un écran : le `<main>` de la page, dans un conteneur DSFR.
// Un seul par écran, jamais imbriqué.

import type { ReactNode } from "react";

type Props = {
  // Les écrans de saisie tiennent sur une colonne étroite. Les tableaux et les
  // résultats prennent toute la largeur.
  etroit?: boolean;
  children: ReactNode;
};

export function Container({ etroit = false, children }: Props) {
  return (
    <main
      className="fr-container"
      style={{
        // Prend la hauteur restante quand l'écran est plus haut que le contenu.
        // Le pied de page se pose ainsi en bas de la fenêtre (voir
        // `SimulateurScreen`). Sans effet hors d'un conteneur flex.
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
