import { startReactDsfr } from "@codegouvfr/react-dsfr/spa";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./dsfr-overrides.css";
import {
  chargerMatomo,
  configDepuisEnv,
  initAnalytics,
} from "../analytics/matomo";

startReactDsfr({ defaultColorScheme: "system" });

// Amorce le traceur au boot (cookieless). Le prescripteurRef n'est connu qu'après
// l'étape d'identification : il est renseigné en session par la porte (App) et lu
// au moment d'émettre chaque événement.
const analyticsConfig = configDepuisEnv();
initAnalytics(analyticsConfig);
if (analyticsConfig.enabled) chargerMatomo(analyticsConfig.url);

const racine = document.getElementById("root");
if (!racine) throw new Error("Élément #root absent de index.html.");

createRoot(racine).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
