// Les calculs de date de la permission, appelés directement : les formats
// `AAAA-MM-JJ` et `AAAA-MM-JJTHH:mm`, et les cas limites (D-107).

import { describe, expect, it } from "vitest";
import {
  commenceAvantLeQuatorzieme,
  commenceAvantLHospitalisation,
  depasseQuaranteHuitHeures,
  finNonPosterieure,
  periodeAvantLaFinDeLaPermission,
} from "../../../front/models/eligibilite/dates-de-la-permission";

describe("commenceAvantLHospitalisation", () => {
  it.each([
    ["2026-10-01", "2026-09-30T23:59", true],
    ["2026-10-01", "2026-10-01T00:00", false],
    ["2026-10-01", "2026-10-01T08:00", false],
  ])(
    "hospitalisé le %s, début le %s : %s",
    (hospitalisation, debut, attendu) => {
      expect(commenceAvantLHospitalisation(hospitalisation, debut)).toBe(
        attendu,
      );
    },
  );
});

describe("commenceAvantLeQuatorzieme", () => {
  it.each([
    ["2026-10-01", "2026-10-13T23:59", true],
    ["2026-10-01", "2026-10-14T00:00", false],
    ["2026-10-01", "2026-10-20T10:00", false],
    // Le mois et l'année se retournent, février 2028 compte 29 jours.
    ["2026-12-25", "2027-01-06T23:59", true],
    ["2026-12-25", "2027-01-07T00:00", false],
    ["2028-02-20", "2028-03-04T00:00", false],
    ["2028-02-20", "2028-03-03T23:59", true],
  ])(
    "hospitalisé le %s, début le %s : %s",
    (hospitalisation, debut, attendu) => {
      expect(commenceAvantLeQuatorzieme(hospitalisation, debut)).toBe(attendu);
    },
  );
});

describe("finNonPosterieure", () => {
  it.each([
    ["2026-10-14T09:00", "2026-10-14T08:59", true],
    ["2026-10-14T09:00", "2026-10-14T09:00", true],
    ["2026-10-14T09:00", "2026-10-14T09:01", false],
  ])("début %s, fin %s : %s", (debut, fin, attendu) => {
    expect(finNonPosterieure(debut, fin)).toBe(attendu);
  });
});

describe("depasseQuaranteHuitHeures", () => {
  it.each([
    ["2026-10-14T09:00", "2026-10-16T09:00", false],
    ["2026-10-14T09:00", "2026-10-16T09:01", true],
    // Le changement d'heure du 25 octobre 2026 ne décale rien.
    ["2026-10-24T09:00", "2026-10-26T09:00", false],
    ["2026-10-24T09:00", "2026-10-26T09:01", true],
  ])("début %s, fin %s : %s", (debut, fin, attendu) => {
    expect(depasseQuaranteHuitHeures(debut, fin)).toBe(attendu);
  });
});

describe("periodeAvantLaFinDeLaPermission", () => {
  it.each([
    ["2026-10-14", "2026-10-15T09:00", true],
    ["2026-10-15", "2026-10-15T09:00", false],
    ["2026-10-15", "2026-10-15T23:59", false],
    ["2026-11-01", "2026-10-15T09:00", false],
  ])(
    "période jusqu'au %s, permission jusqu'au %s : %s",
    (periode, fin, attendu) => {
      expect(periodeAvantLaFinDeLaPermission(periode, fin)).toBe(attendu);
    },
  );
});

describe("une saisie incomplète ou mal écrite", () => {
  it.each([undefined, "", "2026-10", "14/10/2026", "2026-10-14T9h"])(
    "%j n'est comparée à rien",
    (saisie) => {
      expect(commenceAvantLHospitalisation(saisie, "2026-10-01T00:00")).toBe(
        false,
      );
      expect(commenceAvantLeQuatorzieme("2026-10-01", saisie)).toBe(false);
      expect(finNonPosterieure(saisie, "2026-10-01T00:00")).toBe(false);
      expect(depasseQuaranteHuitHeures("2026-10-01T00:00", saisie)).toBe(false);
      expect(periodeAvantLaFinDeLaPermission(saisie, "2026-10-01T00:00")).toBe(
        false,
      );
    },
  );
});
