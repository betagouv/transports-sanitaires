// Choisit la source du référentiel côté serveur : Grist si l'accès est
// configuré, sinon le snapshot factice.

import {
  type Referentiel,
  snapshotReferentiel,
} from "../../shared/referentiel.ts";
import type { AccesGrist } from "../configuration.ts";
import { creerReferentielGrist } from "./referentiel-grist.ts";

export function choisirReferentiel(grist: AccesGrist | undefined): Referentiel {
  return grist ? creerReferentielGrist(grist) : snapshotReferentiel;
}
