import { describe, expect, it } from "vitest";
import { estServiceProduit } from "../../front/outils-produit/acces";

// Garde d'accès commune au mode test des règles et à la galerie de seeds. Elle vaut
// sur tous les environnements : c'est le service du référentiel qui décide, pas le
// build.

describe("estServiceProduit", () => {
  it("reconnaît le service par identifiant Grist", () => {
    expect(estServiceProduit({ id: "4", libelle: "Peu importe" })).toBe(true);
  });

  it("reconnaît le service par libellé (insensible à la casse)", () => {
    expect(estServiceProduit({ id: "s_x", libelle: "transport sanitaire" })).toBe(true);
  });

  it("ignore les autres services", () => {
    expect(estServiceProduit({ id: "s_grenoble_cardio", libelle: "Cardiologie" })).toBe(
      false
    );
  });
});
