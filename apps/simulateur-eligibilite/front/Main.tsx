// Point d'entrée du navigateur : démarre le traceur, puis monte l'app React.

import { startReactDsfr } from "@codegouvfr/react-dsfr/spa";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./socle/app/App";
import "./socle/app/dsfr-overrides.css";
import {
  chargerMatomo,
  configDepuisEnv,
  initAnalytics,
} from "./socle/analytics/matomo";

startReactDsfr({ defaultColorScheme: "system" });

// Prépare le traceur au démarrage, sans cookie. Il demande au CMS le choix de
// l'utilisateur et ne charge Matomo que si le suivi est accepté. Le service est
// rangé en session au rattachement, puis lu à chaque événement.
initAnalytics(configDepuisEnv(), { charger: chargerMatomo });

const racine = document.getElementById("root");
if (!racine) throw new Error("Élément #root absent de index.html.");

createRoot(racine).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
