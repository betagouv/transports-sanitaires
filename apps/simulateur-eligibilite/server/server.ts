// Point d'entrée du serveur (production / dev) du simulateur : sert le front
// (build Vite) et l'API référentiel/identité en same-origin.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { creerApp } from "./app.ts";
import { choisirReferentiel } from "./identification/referentiel-source.ts";

const app = creerApp(choisirReferentiel(), {
  secret: pseudonymisationSecret(),
  pseudonymesEnClair: pseudonymesEnClair(),
  dossierDist: dossierDist(),
});

app.listen(port(), () => {
  console.log(`[simulateur] à l'écoute sur le port ${port()}`);
});

// ---- implémentation ----
//
// Sur Scalingo, `PORT` est fourni par la plateforme et la clé Grist vit en
// variable d'environnement (jamais dans un .env commité). Voir
// docs/architecture/identification.md — ADR-5.

// Secret de pseudonymisation (HMAC) de l'identité prescripteur. En production
// (Scalingo) il vient d'une variable d'environnement dédiée ; en local sans
// secret on retombe sur une valeur de dev (jamais pour de vrais indicateurs).
function pseudonymisationSecret(): string {
  const secret = process.env.PSEUDONYMISATION_SECRET?.trim();
  if (secret) return secret;
  console.warn(
    "[simulateur] PSEUDONYMISATION_SECRET absente — secret de dev (non sécurisé).",
  );
  return "dev-secret-non-securise";
}

// Mode debug (phase de test) : renvoie les refs en clair au lieu du HMAC pour les
// lire directement dans Matomo. ⚠️ Révèle des données brutes (dont nom/prénom) —
// à n'activer que hors production.
function pseudonymesEnClair(): boolean {
  const flag = process.env.PSEUDONYMISATION_EN_CLAIR?.trim().toLowerCase();
  const actif = flag === "true" || flag === "1" || flag === "oui";
  if (actif) {
    console.warn(
      "[simulateur] PSEUDONYMISATION_EN_CLAIR active — refs Matomo en clair (debug, hors prod).",
    );
  }
  return actif;
}

function dossierDist(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "dist");
}

function port(): number {
  return Number(process.env.PORT ?? 3000);
}
