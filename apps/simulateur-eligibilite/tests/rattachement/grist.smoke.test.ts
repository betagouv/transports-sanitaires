// @vitest-environment node
//
// Smoke test de lecture contre le vrai Grist, sans mock. Désactivé sans
// `GRIST_API_KEY` : il ne tourne pas en CI, mais en local avec la clé exportée :
//   GRIST_API_KEY=$(grep -E '^GRIST_API_KEY=' .env | cut -d= -f2-) pnpm test
//
// Le référentiel évolue à la main. On vérifie donc la forme et l'enchaînement
// établissement → service, pas des libellés.

import { describe, expect, it } from "vitest";
import { lireConfiguration } from "../../server/configuration.ts";
import { choisirReferentiel } from "../../server/rattachement/referentiel-source.ts";

const cleApi = process.env.GRIST_API_KEY?.trim();

describe.skipIf(!cleApi)("référentiel Grist (smoke)", () => {
  const ref = choisirReferentiel(lireConfiguration().grist);

  it("renvoie des établissements {id, libelle} non vides", async () => {
    const etabs = await ref.listerEtablissements();
    expect(Array.isArray(etabs)).toBe(true);
    for (const e of etabs) {
      expect(e.id).toBeTruthy();
      expect(e.libelle).toBeTruthy();
    }
  });

  it("enchaîne établissement → services", async () => {
    const [etab] = await ref.listerEtablissements();
    if (!etab) return; // référentiel vide : rien à vérifier
    const services = await ref.listerServices(etab.id);
    expect(Array.isArray(services)).toBe(true);
    for (const s of services) {
      expect(s.id).toBeTruthy();
      expect(s.libelle).toBeTruthy();
    }
  });
});
