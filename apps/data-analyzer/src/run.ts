// Enchaîne les 4 étapes de l'ETL. Chaque étape reste rejouable seule (npm run <étape>).

import { extract } from "./01-extract/extract.ts";
import { staging } from "./02-staging/staging.ts";
import { reconcile } from "./03-reconcile/reconcile.ts";
import { marts } from "./04-marts/marts.ts";

extract();
staging();
reconcile();
marts();
