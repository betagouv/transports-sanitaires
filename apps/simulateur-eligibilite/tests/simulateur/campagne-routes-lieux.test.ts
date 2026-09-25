// La campagne v9.7.3 de l'éditeur sur les contradictions de motif et de
// trajet (`tests/campagne-v973/routes.mjs`), côté lieux, rejouée au moteur sous
// ses identifiants `ROUTE-*`. Les familles d'anomalies qu'elle vise
// (`AUD-ROUTE-*`) sont nommées à côté de leurs cas.
//
// Non transposé : ce que la campagne lit dans la session de référence et que
// notre moteur nu n'a pas. Les étapes vues (`r.seen`), la trace des saisies
// acceptées et le récapitulatif `result2()` relèvent de l'interface. Ils sont
// couverts par les tests du parcours (`lieu-deduit`, `exceptions-ehpad-usld`,
// `transferts-qualifies-tot`), pas ici. Un « refus » de la campagne (saisie
// rejetée par `Session.submit`) se lit au moteur comme un résultat bloqué.

import { describe, expect, it } from "vitest";
import {
  aboutitEntre,
  CARE,
  CONSULT,
  casFinal,
  ENTRY,
  ER,
  ETABLISSEMENT,
  EXAM,
  EXIT,
  estRefuse,
  OTHER,
  PERMISSION,
  PMT,
  pour,
  RAISONS,
  S3141,
  STRUCTURE,
  TRANSFER,
} from "./trajet-du-livrable";

describe("ROUTE, témoins", () => {
  it.each(RAISONS.map((raison, rang) => [rang + 1, raison] as const))(
    "ROUTE-CONTROL-%i (%s)",
    (_rang, raison) => {
      const attendu =
        raison === TRANSFER
          ? ETABLISSEMENT
          : raison === PERMISSION
            ? S3141
            : PMT;
      expect(casFinal(pour(raison))).toBe(attendu);
    },
  );

  it.each(
    [CONSULT, EXAM, CARE, OTHER, ER].map(
      (raison, rang) => [rang + 1, raison] as const,
    ),
  )("ROUTE-TRANSFER-CONTROL-%i (%s)", (_rang, raison) => {
    expect(casFinal(pour(raison, { transfer: true, depart: STRUCTURE }))).toBe(
      ETABLISSEMENT,
    );
  });
});

describe("ROUTE, entrée et sortie", () => {
  const lieux = ["Domicile", "EHPAD", "USLD", "Établissement pénitentiaire"];
  it.each(lieux.map((lieu, rang) => [rang + 1, lieu] as const))(
    "ROUTE-ENTRY-VALID-%i (depuis %s)",
    (_rang, depart) => {
      aboutitEntre(pour(ENTRY, { depart }), depart, STRUCTURE);
    },
  );
  it.each(lieux.map((lieu, rang) => [rang + 1, lieu] as const))(
    "ROUTE-EXIT-VALID-%i (vers %s)",
    (_rang, arrival) => {
      aboutitEntre(pour(EXIT, { arrival }), STRUCTURE, arrival);
    },
  );

  const incompatibles = [
    "Domicile",
    "EHPAD",
    "Autre lieu",
    "Établissement pénitentiaire",
  ];
  it.each(incompatibles.map((lieu, rang) => [rang + 1, lieu] as const))(
    "ROUTE-ENTRY-INVALID-%i (arrivée %s)",
    (_rang, arrival) => {
      aboutitEntre(
        pour(ENTRY, { depart: STRUCTURE, arrival }),
        STRUCTURE,
        STRUCTURE,
      );
    },
  );
  it.each(incompatibles.map((lieu, rang) => [rang + 1, lieu] as const))(
    "ROUTE-EXIT-INVALID-%i (départ %s)",
    (_rang, depart) => {
      aboutitEntre(pour(EXIT, { depart }), STRUCTURE, "Domicile");
    },
  );
});

describe("ROUTE, urgences (AUD-ROUTE-URG-DEST)", () => {
  const arrivees = [
    "Domicile",
    "EHPAD",
    "USLD",
    "Autre lieu",
    "Établissement pénitentiaire",
  ];
  it.each(arrivees.map((lieu, rang) => [rang + 1, lieu] as const))(
    "ROUTE-ER-DESTINATION-%i (arrivée %s)",
    (_rang, arrival) => {
      aboutitEntre(
        pour(ER, { depart: STRUCTURE, arrival }),
        STRUCTURE,
        STRUCTURE,
      );
    },
  );
  const origines = ["Domicile", "EHPAD", "USLD", "Établissement pénitentiaire"];
  it.each(origines.map((lieu, rang) => [rang + 1, lieu] as const))(
    "ROUTE-ER-ORIGIN-%i (depuis %s)",
    (_rang, depart) => {
      aboutitEntre(pour(ER, { depart }), depart, STRUCTURE);
    },
  );
  it("ROUTE-HAD-ER-CONFLICT", () => {
    estRefuse(
      pour(ER, {
        transfer: true,
        depart: STRUCTURE,
        exceptions: { p2_exception_admission_had: "oui" },
      }),
    );
  });
});
