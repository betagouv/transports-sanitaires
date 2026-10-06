// Point d'entrée du serveur : il sert le front et l'API. La configuration est
// lue par `configuration.ts`.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { creerApp } from "./app.ts";
import { type Configuration, lireConfiguration } from "./configuration.ts";
import { choisirReferentiel } from "./rattachement/referentiel-source.ts";

const configuration = configurationOuArret();

const app = creerApp(choisirReferentiel(configuration.grist), {
  dossierDist: dossierDist(),
});

app.listen(configuration.port, () => {
  console.log(`[simulateur] à l'écoute sur le port ${configuration.port}`);
});

// ---- implémentation ----

// Une variable manquante en production est une erreur d'exploitation. On sort
// sur le message, sans trace de pile, avec un code non nul : la plateforme voit
// l'échec du déploiement.
function configurationOuArret(): Configuration {
  try {
    return lireConfiguration();
  } catch (erreur) {
    console.error(`[simulateur] ${(erreur as Error).message}`);
    process.exit(1);
  }
}

function dossierDist(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "dist");
}
