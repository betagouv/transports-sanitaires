import { describe, expect, it } from "vitest";
import { publicodesEngine } from "../../../front/socle/decision-engine/publicodes";

// Le moteur de décision, sur des règles écrites ici : il ne connaît celles
// d'aucun modèle.

type Faits = { fait_pluie: boolean; fait_invites: number; fait_pret: boolean };
type Cibles = {
  cible_parapluie: boolean | null;
  cible_table: string | null;
};

const REGLES = {
  fait_pluie: { titre: "Il pleut" },
  fait_invites: { titre: "Nombre d'invités", type: "nombre" },
  fait_pret: { titre: "Tout est prêt" },
  cible_parapluie: { valeur: "fait_pluie" },
  cible_table: {
    "applicable si": "fait_pret",
    valeur: {
      variations: [
        { si: "fait_invites >= 6", alors: "'GRANDE'" },
        { sinon: "'PETITE'" },
      ],
    },
  },
};

const moteur = publicodesEngine<Faits, Cibles>(REGLES, [
  "cible_parapluie",
  "cible_table",
]);
const SOIREE: Faits = { fait_pluie: true, fait_invites: 8, fait_pret: true };

describe("le moteur de décision publicodes", () => {
  it("rend chaque cible demandée", () => {
    expect(moteur.cibles(SOIREE)).toEqual({
      cible_parapluie: true,
      cible_table: "GRANDE",
    });
  });

  it("lit un fait faux comme un « non »", () => {
    expect(
      moteur.cibles({ ...SOIREE, fait_pluie: false }).cible_parapluie,
    ).toBe(false);
  });

  it("compare un fait numérique à un seuil", () => {
    expect(moteur.cibles({ ...SOIREE, fait_invites: 2 }).cible_table).toBe(
      "PETITE",
    );
  });

  it("rend `null` pour une cible qui ne s'applique pas", () => {
    expect(
      moteur.cibles({ ...SOIREE, fait_pret: false }).cible_table,
    ).toBeNull();
  });

  it("rend une seule cible sur demande", () => {
    expect(moteur.cible(SOIREE, "cible_table")).toBe("GRANDE");
  });

  it("ne garde rien d'un calcul à l'autre", () => {
    moteur.cibles(SOIREE);
    expect(
      moteur.cible({ ...SOIREE, fait_pluie: false }, "cible_parapluie"),
    ).toBe(false);
  });
});
