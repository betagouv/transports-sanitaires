import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startReactDsfr } from "@codegouvfr/react-dsfr/spa";
import { App } from "./App";
import { httpReferentiel } from "./http-referentiel";

startReactDsfr({ defaultColorScheme: "system" });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App referentiel={httpReferentiel} />
  </StrictMode>
);
