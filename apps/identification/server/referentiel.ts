// Choix de la source du référentiel côté serveur.
//
// - `GRIST_API_KEY` présente → référentiel **Grist** réel (ADR-5).
// - absente → **snapshot factice** (partagé avec le front), pour le développement
//   local et les tests sans configuration ni secret. Voir
//   docs/architecture/identification.md — §7 (incréments).

import { snapshotReferentiel, type Referentiel } from "../src/referentiel.ts";
import { createGristReferentiel } from "./grist.ts";

const DEFAULT_DOC_URL =
  "https://grist.numerique.gouv.fr/o/transports-sanitaires/api/docs/gbPomRAyU3M6P5NR6x6Qac";

export function chooseReferentiel(env = process.env): Referentiel {
  const apiKey = env.GRIST_API_KEY?.trim();
  if (!apiKey) {
    console.warn(
      "[identification] GRIST_API_KEY absente — référentiel snapshot (dev/fallback)."
    );
    return snapshotReferentiel;
  }
  const docUrl = env.GRIST_DOC_URL?.trim() || DEFAULT_DOC_URL;
  return createGristReferentiel({ docUrl, apiKey });
}
