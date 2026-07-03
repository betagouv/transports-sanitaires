import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startReactDsfr } from "@codegouvfr/react-dsfr/spa";
import { App } from "./App";
import { initSession } from "./session";

startReactDsfr({ defaultColorScheme: "system" });

// Lit le contexte d'identification (#ctx) et nettoie l'URL avant le rendu.
initSession();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
