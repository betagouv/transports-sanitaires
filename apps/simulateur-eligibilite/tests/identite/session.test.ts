import { describe, expect, it } from "vitest";
import {
  VERSION,
  type IdentitePseudonymisee,
} from "../../shared/identite-pseudonymisee";
import { getIdentite, setIdentite } from "../../front/identite/session";

const identite: IdentitePseudonymisee = {
  etabRef: "eRef",
  serviceRef: "sRef",
  prescripteurRef: "pRef",
  v: VERSION,
};

describe("session identité pseudonymisée", () => {
  it("conserve l'identité renseignée", () => {
    setIdentite(identite);
    expect(getIdentite()).toEqual(identite);
  });

  it("accepte l'absence d'identité (identification sans ref)", () => {
    setIdentite(null);
    expect(getIdentite()).toBeNull();
  });
});
