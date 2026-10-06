// Point d'entrée du navigateur : démarre le traceur, puis monte l'app React.

import { startReactDsfr } from "@codegouvfr/react-dsfr/spa";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./app/dsfr-overrides.css";
import {
  chargerMatomo,
  configDepuisEnv,
  initAnalytics,
} from "./analytics/matomo";

startReactDsfr({ defaultColorScheme: "system" });

// Prépare le traceur au boot (cookieless) : il demande au CMS le choix de
// l'utilisateur, et ne charge Matomo qu'au suivi. Le service n'est connu qu'après
// le rattachement : il est renseigné en session par l'écran de rattachement (App) et lu au
// moment d'émettre chaque événement.
initAnalytics(configDepuisEnv(), { charger: chargerMatomo });

const racine = document.getElementById("root");
if (!racine) throw new Error("Élément #root absent de index.html.");

createRoot(racine).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
