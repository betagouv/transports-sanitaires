// Point d'entrée du serveur (production / dev) du simulateur : sert le front
// (build Vite) et l'API référentiel/identité en same-origin. Sur Scalingo, `PORT`
// est fourni par la plateforme et la clé Grist vit en variable d'environnement
// (jamais dans un .env commité). Voir docs/architecture/identification.md — ADR-5.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.ts";
import { chooseReferentiel } from "./identification/referentiel-source.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, "..", "dist");

// Secret de pseudonymisation (HMAC) de l'identité prescripteur. En production
// (Scalingo) il vient d'une variable d'environnement dédiée ; en local sans
// secret on retombe sur une valeur de dev (jamais pour de vrais indicateurs).
function pseudonymisationSecret(): string {
  const secret = process.env.PSEUDONYMISATION_SECRET?.trim();
  if (secret) return secret;
  console.warn(
    "[simulateur] PSEUDONYMISATION_SECRET absente — secret de dev (non sécurisé)."
  );
  return "dev-secret-non-securise";
}

const app = createApp(chooseReferentiel(), {
  secret: pseudonymisationSecret(),
  distDir,
});
const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`[simulateur] à l'écoute sur le port ${port}`);
});
