import { describe, expect, it } from "vitest";
import {
  identiteEnSession,
  rangerIdentite,
} from "../../front/identification/session";
import {
  type IdentitePseudonymisee,
  VERSION,
} from "../../shared/identite-pseudonymisee";

const identite: IdentitePseudonymisee = {
  etabRef: "eRef",
  serviceRef: "sRef",
  prescripteurRef: "pRef",
  v: VERSION,
};

describe("session identité pseudonymisée", () => {
  it("conserve l'identité renseignée", () => {
    rangerIdentite(identite);
    expect(identiteEnSession()).toEqual(identite);
  });

  it("accepte l'absence d'identité (identification sans ref)", () => {
    rangerIdentite(null);
    expect(identiteEnSession()).toBeNull();
  });
});
