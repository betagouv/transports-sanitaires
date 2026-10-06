// L'écran du simulateur tel qu'`App` le monte : le simulateur dans sa page, le
// pied de page au bas.
//
// La page fait au minimum la hauteur de la fenêtre et se répartit en colonne :
// le contenu prend la place qu'il lui faut, le pied de page se pose au bas. Sans
// cela, sur un écran où le contenu est court, le pied de page flotte au milieu
// du vide au lieu de fermer la page.

import type { ComponentProps } from "react";
import { Container } from "../app/Container";
import { Footer } from "../app/Footer";
import { Simulateur } from "./Simulateur";

export function SimulateurScreen(props: ComponentProps<typeof Simulateur>) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        // `100dvh` et non `100vh` : sur mobile, la barre d'adresse qui se
        // rétracte change la hauteur utile, et `vh` laisserait le pied de page
        // sous le pli.
        minHeight: "100dvh",
      }}
    >
      <Container>
        <Simulateur {...props} />
      </Container>
      <Footer />
    </div>
  );
}
