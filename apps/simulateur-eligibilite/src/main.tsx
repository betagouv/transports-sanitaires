import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startReactDsfr } from "@codegouvfr/react-dsfr/spa";
import { App } from "./App";
import { initSession } from "./session";
import { initAnalytics, loadMatomo, resolveConfig } from "./analytics";

startReactDsfr({ defaultColorScheme: "system" });

// Lit le contexte d'identification (#ctx) et nettoie l'URL avant le rendu, puis
// initialise le traceur (qui lit le prescripteurRef de la session).
initSession();
const analyticsConfig = resolveConfig();
initAnalytics(analyticsConfig);
if (analyticsConfig.enabled) loadMatomo(analyticsConfig.url);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
