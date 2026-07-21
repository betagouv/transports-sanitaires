// @vitest-environment node
//
// Smoke test **d'écriture** contre le vrai Grist (sans mock). Contrairement au smoke
// de lecture (guardé par GRIST_API_KEY), celui-ci **crée de vraies lignes** dans le
// référentiel : il n'est donc lancé que sur opt-in explicite, pour éviter toute
// pollution accidentelle. Les lignes créées portent `Origine=formulaire` (+ un suffixe
// horodaté reconnaissable) et doivent être purgées à la main côté admin.
//
//   GRIST_ECRITURE_TEST=1 GRIST_API_KEY=$(grep -E '^GRIST_API_KEY=' .env | cut -d= -f2-) \
//     npm test -- grist-ecriture
//
// Vérifie l'idempotence : deux enrichissements identiques ne doivent créer qu'une
// seule ligne (dédup sur Nom/Prénom normalisés).

import { describe, expect, it } from "vitest";
import { chooseReferentiel } from "../../server/identification/referentiel-source.ts";

const actif =
  process.env.GRIST_ECRITURE_TEST === "1" && !!process.env.GRIST_API_KEY?.trim();

describe.skipIf(!actif)("écriture Grist depuis une saisie libre (smoke)", () => {
  const ref = chooseReferentiel();

  it("crée un prescripteur hors liste puis le déduplique (service Libéral)", async () => {
    const marqueur = `TEST-${Date.now()}`;
    // Établissement « Libéral / CNAM / CPAM / Autre » (Id2=11) → service « Libéral »
    // (Id2=3) → prescripteur hors liste : plus de branche « non rattaché » dédiée.
    const sel = {
      etabId: "11",
      serviceId: "3",
      prescripteurId: "prescripteur_hors_liste" as const,
      nom: marqueur,
      prenom: "Smoke",
    };

    // 1er appel : crée. 2e appel identique : doit réutiliser (pas de doublon).
    await ref.enrichirDepuisSaisie!(sel);
    await ref.enrichirDepuisSaisie!(sel);

    // Service « Libéral » (Id2=3). La nouvelle saisie doit apparaître exactement 1 fois.
    const prescripteurs = await ref.getPrescripteurs("3");
    const trouves = prescripteurs.filter((p) => p.libelle.includes(marqueur));
    expect(trouves).toHaveLength(1);
  });
});
