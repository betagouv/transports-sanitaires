// @vitest-environment node
//
// Smoke test d'intégration contre le **vrai** Grist (sans mock, conformément aux
// conventions). Désactivé si `GRIST_API_KEY` est absente de l'environnement — il
// ne tourne donc pas en CI, mais en local avec la clé exportée :
//   GRIST_API_KEY=$(grep -E '^GRIST_API_KEY=' .env | cut -d= -f2-) npm test
//
// Assertions volontairement structurelles (le référentiel est maintenu à la main
// et évolue) : on vérifie la forme et l'enchaînement établissement → service →
// prescripteur, pas des libellés figés.

import { describe, expect, it } from "vitest";
import { lireConfiguration } from "../../server/configuration.ts";
import { choisirReferentiel } from "../../server/identification/referentiel-source.ts";

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

  it("enchaîne établissement → services → prescripteurs", async () => {
    const [etab] = await ref.listerEtablissements();
    if (!etab) return; // référentiel vide : rien à vérifier
    const services = await ref.listerServices(etab.id);
    expect(Array.isArray(services)).toBe(true);

    const [service] = services;
    if (!service) return;
    const prescripteurs = await ref.listerPrescripteurs(service.id);
    expect(Array.isArray(prescripteurs)).toBe(true);
    for (const p of prescripteurs) {
      expect(p.id).toBeTruthy();
      expect(p.libelle).toBeTruthy();
    }
  });
});
