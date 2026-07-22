// Point d'entrée de l'ETL : enchaîne les 4 étapes. Chaque étape reste lançable seule
// (npm run <étape>).

import { Extract } from "./01-extract/extract.ts";
import { Staging } from "./02-staging/staging.ts";
import { Reconcile } from "./03-reconcile/reconcile.ts";
import { Marts } from "./04-marts/marts.ts";
import { FORMATS } from "./01-extract/adapteurs/registry.ts";

export class Etl {
  execute(): void {
    new Extract(FORMATS).execute();
    new Staging().execute();
    new Reconcile().execute();
    new Marts().execute();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) new Etl().execute();
