// L'asepsie, part de la matrice de non-régression du livrable v9.7.1
// (tmp/9.7.1/tests/asepsie.mjs). La v9.7.1 reformule le libellé de
// `p1_critere_isolement_asepsie` (recopié ici mot pour mot) sans toucher à ce
// qu'il déclenche : cinq critères ouvrent chacun leur propre justification
// d'ambulance, et l'hygiène/désinfection seule n'en ouvre aucune.
//
// Les reprises de session (ASEPSIE-REPRISE-*) ne sont pas portées : la
// v9.7.1 ne les rend pas possibles côté application (D3, pas de reprise
// durable — `sessionStorage` seulement).

import { describe, expect, it } from "vitest";
import { evaluerLeCas } from "./livrable-v9-7-2";
import { moteurDeTest } from "./moteur";
import { DAP, NON_ELIGIBLE, PMT, S3141 } from "./situations-v9-7-2";

const BASE = {
  organization: "trajets simples",
  reason: "Autre examen ou soin",
  count: 1,
  distance: 0 as const,
};

const CRITERES_AMBULANCE = {
  p1_critere_position_allongee_demi_assise:
    "cible_ambulance_position_allongee_demi_assise",
  p1_critere_brancardage_portage: "cible_ambulance_brancardage_portage",
  p1_critere_surveillance_constante: "cible_ambulance_surveillance_constante",
  p1_critere_oxygene: "cible_ambulance_oxygene",
  p1_critere_isolement_asepsie: "cible_ambulance_isolement_asepsie",
} as const;

describe("matrice v9.7.1 — l’asepsie", () => {
  it("ASEPSIE-LIBELLE-SANS-DESINFECTION", () => {
    // Le libellé livré, recopié mot pour mot dans le modèle
    // (`regles/regles.publicodes`, recopie du flat v9.7.2 — inchangé depuis
    // la v9.7.1 sur cette règle).
    const regle = moteurDeTest().getRule("p1_critere_isolement_asepsie")
      .rawNode as { question?: string; titre?: string };
    expect(regle.question).toBe(
      "L’état du patient nécessite un transport dans des conditions d’asepsie.",
    );
    expect(regle.titre).toBe(regle.question);
    const hygiene = moteurDeTest().getRule("p1_critere_hygiene_desinfection")
      .rawNode as { question?: string };
    expect(hygiene.question).toContain("désinfection du véhicule");
  });

  it.each(Object.entries(CRITERES_AMBULANCE))(
    "ASEPSIE-AMBULANCE-%s",
    (criterion, cible) => {
      const moteur = evaluerLeCas({ ...BASE, criterion });
      expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(PMT);
      expect(
        moteur.evaluate("cible_transport_sanitaire_prescrit").nodeValue,
      ).toBe("ambulance");
      expect(moteur.evaluate(cible).nodeValue).toBe(true);
      // Un seul critère coché : une seule justification d'ambulance retenue.
      const autres = Object.values(CRITERES_AMBULANCE).filter(
        (c) => c !== cible,
      );
      for (const autre of autres)
        expect(moteur.evaluate(autre).nodeValue).not.toBe(true);
    },
  );

  it("ASEPSIE-DESINFECTION-SANS-AUTRE-DROIT", () => {
    // L'hygiène/désinfection seule ne justifie pas l'ambulance : sans autre
    // critère ni contexte, rien n'ouvre le droit.
    const moteur = evaluerLeCas({
      ...BASE,
      criterion: "p1_critere_hygiene_desinfection",
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(NON_ELIGIBLE);
    expect(
      moteur.evaluate("cible_transport_sanitaire_prescrit").nodeValue,
    ).toBe("VSL (Véhicule Sanitaire Léger) ou taxi conventionné");
  });

  it.each([
    ["ASEPSIE-DESINFECTION-HOSP", { reason: "Entrée en hospitalisation" }, PMT],
    ["ASEPSIE-DESINFECTION-DISTANCE", { distance: 2 as const }, DAP],
  ] as const)("%s", (_id, o, cas) => {
    const moteur = evaluerLeCas({
      ...BASE,
      criterion: "p1_critere_hygiene_desinfection",
      ...o,
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(cas);
    expect(
      moteur.evaluate("cible_ambulance_isolement_asepsie").nodeValue,
    ).not.toBe(true);
    expect(moteur.evaluate("cible_mode_tap_ou_tpmr").nodeValue).toBe(true);
  });

  it.each([
    ["ASEPSIE-DAP", { distance: 2 as const }, DAP],
    ["ASEPSIE-S3141", { reason: "Permission temporaire de sortie" }, S3141],
  ] as const)("%s", (_id, o, cas) => {
    const moteur = evaluerLeCas({
      ...BASE,
      criterion: "p1_critere_isolement_asepsie",
      ...o,
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(cas);
    expect(moteur.evaluate("cible_ambulance_isolement_asepsie").nodeValue).toBe(
      true,
    );
  });

  it("ASEPSIE-PRIORITES-FINANCEUR", () => {
    // L'isolement/asepsie ouvre l'ambulance, mais ne fait pas le poids devant
    // un établissement qui charge le transport ou une permission au patient :
    // le financeur se décide toujours du même critère qu'ailleurs.
    expect(
      evaluerLeCas({
        ...BASE,
        criterion: "p1_critere_isolement_asepsie",
        transfer: true,
      }).evaluate("cible_regime_financement").nodeValue,
    ).toBe("Établissement");
    expect(
      evaluerLeCas({
        ...BASE,
        criterion: "p1_critere_isolement_asepsie",
        reason: "Permission temporaire de sortie",
        age: "20 ans ou plus",
        permissionCadre: "Demande du patient sans justification médicale",
      }).evaluate("cible_regime_financement").nodeValue,
    ).toBe("Patient");
  });
});
