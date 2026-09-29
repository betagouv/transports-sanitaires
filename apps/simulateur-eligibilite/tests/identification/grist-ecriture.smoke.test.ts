// @vitest-environment node
//
// Smoke test **d'écriture** contre le vrai Grist (sans mock). Contrairement au smoke
// de lecture (guardé par GRIST_API_KEY), celui-ci **crée de vraies lignes** dans le
// référentiel : il n'est donc lancé que sur opt-in explicite, pour éviter toute
// pollution accidentelle. Les lignes créées portent `Origine=formulaire` (+ un suffixe
// horodaté reconnaissable) et doivent être purgées à la main côté admin.
//
//   GRIST_ECRITURE_TEST=1 GRIST_API_KEY=$(grep -E '^GRIST_API_KEY=' .env | cut -d= -f2-) \
//     pnpm test grist-ecriture
//
// Vérifie l'idempotence : deux enrichissements identiques ne doivent créer qu'une
// seule ligne (dédup sur le Nom normalisé).

import { describe, expect, it } from "vitest";
import { lireConfiguration } from "../../server/configuration.ts";
import { choisirReferentiel } from "../../server/identification/referentiel-source.ts";

const actif =
  process.env.GRIST_ECRITURE_TEST === "1" &&
  !!process.env.GRIST_API_KEY?.trim();

describe.skipIf(!actif)(
  "écriture Grist depuis une saisie libre (smoke)",
  () => {
    const ref = choisirReferentiel(lireConfiguration().grist);

    it("service « Autre » : crée le vrai service, puis le déduplique", async () => {
      const marqueur = `TEST-SVC-${Date.now()}`;
      // Établissement « Libéral / CNAM / CPAM / Autre » (Id2=11) → service « Autre » :
      // on saisit un vrai service (`serviceLibre`) → il est créé sous l'établissement.
      const sel = {
        etabId: "11",
        serviceId: "0", // id « Autre » non utilisé par la branche serviceEstAutre
        serviceEstAutre: true as const,
        serviceLibre: marqueur,
      };

      await ref.enrichirDepuisSaisie!(sel);
      await ref.enrichirDepuisSaisie!(sel);

      // Le vrai service apparaît, une seule fois, dans les services de l'établissement.
      const services = await ref.listerServices("11");
      const svc = services.filter((s) => s.libelle === marqueur);
      expect(svc).toHaveLength(1);
    });
  },
);
