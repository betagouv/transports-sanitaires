// L'écran du simulateur : le simulateur, et le pied de page en bas.
//
// La page fait au moins la hauteur de la fenêtre. Le pied de page reste donc en
// bas, même quand le contenu est court.

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
