// Les pièges propres au gabarit du S3141 : ses champs à plusieurs cases, et le
// chevauchement des widgets d'« all » sur ceux d'« assis » et de « mt » (décision
// 3 de la spec 0009). Le reste — couverture du tableau, tailles de police — est
// dans `remplissage.test.ts`, avec ses deux voisins.

import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { GABARIT_S3141, étatsDe } from "./gabarit.ts";

describe("S3141 — les champs qui portent plusieurs cases sous un même nom", () => {
  it.each([
    ["all", ["Oui", "non", "mti", "mtt"]],
    ["mt", ["Oui", "non"]],
    ["exo", ["Oui", "non"]],
    ["rct", ["Oui", "non"]],
  ])("« %s » sait rendre %j", async (champ, états) => {
    expect([...(await étatsDe(GABARIT_S3141, champ))].sort()).toEqual(
      [...états].sort(),
    );
  });

  it("les trois autres états d'« all » chevauchent « assis » et « mt »", async () => {
    // Relevé par introspection sur les rectangles des widgets : `all` porte
    // quatre cases visibles, et trois d'entre elles se superposent aux widgets
    // d'autres champs — au point près (`mt` est décalé d'un point en x, un écart
    // d'auteur du gabarit, pas deux cases distinctes). Un gabarit remanié
    // couvrirait sinon deux cases pour une, en silence — c'est ce que ce test
    // fige, à 2 points près.
    const rectangle = async (champ: string, index = 0) => {
      const document = await PDFDocument.load(GABARIT_S3141);
      const widget = document.getForm().getField(champ).acroField.getWidgets()[
        index
      ];
      return widget?.getRectangle();
    };
    const proche = (
      a?: { x: number; y: number },
      b?: { x: number; y: number },
    ) => !!a && !!b && Math.abs(a.x - b.x) <= 2 && Math.abs(a.y - b.y) <= 2;

    // `/Oui` (position allongée) : aucune autre case à ces coordonnées.
    const oui = await rectangle("all", 0);
    expect(oui && { x: Math.round(oui.x), y: Math.round(oui.y) }).toEqual({
      x: 203,
      y: 488,
    });
    // `/non` : mêmes coordonnées que l'unique widget d'« assis ».
    expect(proche(await rectangle("all", 1), await rectangle("assis"))).toBe(
      true,
    );
    // `/mti` et `/mtt` : mêmes coordonnées que les deux widgets de « mt ».
    expect(proche(await rectangle("all", 2), await rectangle("mt", 0))).toBe(
      true,
    );
    expect(proche(await rectangle("all", 3), await rectangle("mt", 1))).toBe(
      true,
    );
  });
});
