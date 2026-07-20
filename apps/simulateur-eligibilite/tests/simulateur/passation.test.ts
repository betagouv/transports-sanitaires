import { beforeEach, describe, expect, it } from "vitest";
import {
  effacerPassation,
  emettrePassation,
  reprendrePassation,
} from "../../front/simulateur/passation";

beforeEach(() => sessionStorage.clear());

describe("passation P1 (prescripteur → secrétariat)", () => {
  it("réémet la situation de Partie 1 à l'identique", () => {
    const situationP1 = {
      p1_motif_hospitalisation: "oui",
      p1_critere_oxygene: "oui",
    };
    emettrePassation(situationP1);
    expect(reprendrePassation()).toEqual(situationP1);
  });

  it("retourne null quand aucune passation n'est en attente", () => {
    expect(reprendrePassation()).toBeNull();
  });

  it("effacer supprime la passation", () => {
    emettrePassation({ p1_situation_smur: "oui" });
    effacerPassation();
    expect(reprendrePassation()).toBeNull();
  });
});
