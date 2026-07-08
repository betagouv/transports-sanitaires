import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startReactDsfr } from "@codegouvfr/react-dsfr/spa";
import { App } from "./App";
import { initAnalytics, loadMatomo, resolveConfig } from "../analytics/analytics";

startReactDsfr({ defaultColorScheme: "system" });

// Amorce le traceur au boot (cookieless). Le prescripteurRef n'est connu qu'après
// l'étape d'identification : il est renseigné en session par la porte (App) et lu
// au moment d'émettre chaque événement.
const analyticsConfig = resolveConfig();
initAnalytics(analyticsConfig);
if (analyticsConfig.enabled) loadMatomo(analyticsConfig.url);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
