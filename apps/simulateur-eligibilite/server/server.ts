// Point d'entrée du serveur (production / dev) du simulateur : sert le front
// (build Vite) et l'API référentiel/identité en same-origin.
//
// Il ne lit plus l'environnement lui-même : `configuration.ts` le fait, et refuse
// de rendre une configuration incomplète en production.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { creerApp } from "./app.ts";
import { type Configuration, lireConfiguration } from "./configuration.ts";
import { choisirReferentiel } from "./identification/referentiel-source.ts";

const configuration = configurationOuArret();

const app = creerApp(choisirReferentiel(configuration.grist), {
  secret: configuration.secret,
  pseudonymesEnClair: configuration.pseudonymesEnClair,
  dossierDist: dossierDist(),
});

app.listen(configuration.port, () => {
  console.log(`[simulateur] à l'écoute sur le port ${configuration.port}`);
});

// ---- implémentation ----

// Une variable manquante en production est une erreur d'exploitation, pas un bug
// à déboguer : on sort sur le message, sans trace de pile, avec un code non nul
// pour que la plateforme voie l'échec du déploiement.
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
