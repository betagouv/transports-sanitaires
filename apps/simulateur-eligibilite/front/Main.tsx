// Point d'entrée du navigateur : démarre le traceur, puis monte l'app React
// sur le modèle. C'est le seul fichier qui importe à la fois le socle et le
// modèle.

import { startReactDsfr } from "@codegouvfr/react-dsfr/spa";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./socle/app/dsfr-overrides.css";
import { model } from "./model";
import { App, chargerMatomo, configDepuisEnv, initAnalytics } from "./socle";

startReactDsfr({ defaultColorScheme: "system" });

// Prépare le traceur au démarrage, sans cookie. Il demande au CMS le choix de
// l'utilisateur et ne charge Matomo que si le suivi est accepté. Le service est
// rangé en session au rattachement, puis lu à chaque événement.
initAnalytics(configDepuisEnv(), { charger: chargerMatomo });

const racine = document.getElementById("root");
if (!racine) throw new Error("Élément #root absent de index.html.");

createRoot(racine).render(
  <StrictMode>
    <App model={model} />
  </StrictMode>,
);
