// Choix de la source du référentiel côté serveur, à partir de la configuration
// (`server/configuration.ts`) :
//
// - accès Grist présent → référentiel **Grist** réel (ADR-5) ;
// - absent → **snapshot factice** (partagé avec le front), pour le développement
//   local et les tests sans configuration ni secret. Voir
//   docs/architecture/identification.md — §7 (incréments).

import {
  type Referentiel,
  snapshotReferentiel,
} from "../../shared/referentiel.ts";
import type { AccesGrist } from "../configuration.ts";
import { creerReferentielGrist } from "./referentiel-grist.ts";

export function choisirReferentiel(grist: AccesGrist | undefined): Referentiel {
  return grist ? creerReferentielGrist(grist) : snapshotReferentiel;
}
