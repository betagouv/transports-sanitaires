import { describe, expect, it } from "vitest";
import { CONTEXTE_VERSION, type Contexte } from "../../shared/contexte";
import {
  getSessionContexte,
  setSessionContexte,
} from "../../front/contexte/session";

const contexte: Contexte = {
  etabRef: "eRef",
  serviceRef: "sRef",
  prescripteurRef: "pRef",
  v: CONTEXTE_VERSION,
};

describe("session contexte", () => {
  it("conserve le contexte renseigné", () => {
    setSessionContexte(contexte);
    expect(getSessionContexte()).toEqual(contexte);
  });

  it("accepte l'absence de contexte (identification sans ref)", () => {
    setSessionContexte(null);
    expect(getSessionContexte()).toBeNull();
  });
});
