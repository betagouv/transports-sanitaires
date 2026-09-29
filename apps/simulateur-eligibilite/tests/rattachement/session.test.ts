import { describe, expect, it } from "vitest";
import {
  rangerRattachement,
  rattachementEnSession,
} from "../../front/rattachement/session";
import {
  type RattachementPseudonymise,
  VERSION,
} from "../../shared/rattachement-pseudonymise";

const rattachement: RattachementPseudonymise = {
  etabRef: "eRef",
  serviceRef: "sRef",
  v: VERSION,
};

describe("session rattachement pseudonymisé", () => {
  it("conserve le rattachement renseigné", () => {
    rangerRattachement(rattachement);
    expect(rattachementEnSession()).toEqual(rattachement);
  });

  it("accepte l'absence de rattachement (échec de l'API)", () => {
    rangerRattachement(null);
    expect(rattachementEnSession()).toBeNull();
  });
});
