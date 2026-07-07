// Point d'entrée du serveur (production / dev). Sur Scalingo, `PORT` est fourni
// par la plateforme et la clé Grist vit en variable d'environnement (jamais dans
// un .env commité). Voir docs/architecture/identification.md — ADR-5.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.ts";
import { chooseReferentiel } from "./referentiel.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(here, "..", "dist");

const app = createApp(chooseReferentiel(), distDir);
const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`[identification] à l'écoute sur le port ${port}`);
});
