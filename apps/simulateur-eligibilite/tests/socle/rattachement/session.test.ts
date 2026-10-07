import { describe, expect, it } from "vitest";
import {
  rangerRattachement,
  rattachementEnSession,
} from "../../../front/socle/rattachement/session";
import type { RattachementSaisi } from "../../../shared/rattachement-saisi";

const rattachement: RattachementSaisi = { etabId: "7", serviceId: "42" };

describe("session de rattachement", () => {
  it("conserve le rattachement renseigné", () => {
    rangerRattachement(rattachement);
    expect(rattachementEnSession()).toEqual(rattachement);
  });

  it("n'a rien tant que personne ne s'est rattaché", () => {
    rangerRattachement(null);
    expect(rattachementEnSession()).toBeNull();
  });
});
