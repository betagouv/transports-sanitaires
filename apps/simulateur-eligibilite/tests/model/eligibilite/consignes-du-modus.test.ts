// La lecture du modus du catalogue (#135) : introduction, étapes numérotées,
// puces, motif administratif et badges. Des modus écrits à la main, avec les
// particularités de ceux de l'éditeur.

import { describe, expect, it } from "vitest";
import { consignesDuModus } from "../../../front/models/eligibilite/consignes-du-modus";
import { segmentsDuTexte } from "../../../front/models/eligibilite/segments-du-texte";

const MODUS = [
  "Une prescription va vous être remise.",
  "",
  "**1. Dès votre rendez-vous fixé**",
  "Contactez un transporteur.",
  "  • Pour un VSL, voyez [l’annuaire](https://annuairesante.ameli.fr/).",
  "  • Pour un taxi, voyez ameli.fr.",
  "",
  "Lors de la réservation, précisez :",
  "  • que le transport sera pris en charge au titre de [motif_Administratif] ;",
  "  • et les besoins particuliers suivants : [badges].",
  "",
  "**2. Le jour du transport**",
  "N’oubliez pas votre prescription.",
].join("<br>");

describe("les consignes du modus", () => {
  const consignes = consignesDuModus(
    MODUS,
    "un transport lié à votre maladie",
    ["Aide professionnelle pour se déplacer"],
  );

  it("sépare l'introduction et les étapes numérotées", () => {
    expect(consignes.introduction).toBe(
      "Une prescription va vous être remise.",
    );
    expect(
      consignes.etapes.map(({ numero, titre }) => [numero, titre]),
    ).toEqual([
      [1, "Dès votre rendez-vous fixé"],
      [2, "Le jour du transport"],
    ]);
  });

  it("range les lignes sans puce en paragraphes et les puces en listes", () => {
    expect(consignes.etapes[0]?.blocs.map(({ type }) => type)).toEqual([
      "paragraphe",
      "liste",
      "paragraphe",
      "liste",
    ]);
    expect(consignes.etapes[1]?.blocs).toEqual([
      { type: "paragraphe", texte: "N’oubliez pas votre prescription." },
    ]);
  });

  it("met le motif dans la phrase, avec l'élision", () => {
    const liste = consignes.etapes[0]?.blocs[3];
    expect(liste).toMatchObject({
      puces: [
        {
          texte:
            "que le transport sera pris en charge au titre d’un transport lié à votre maladie ;",
        },
        {
          texte: "et les besoins particuliers suivants :",
          badges: ["Aide professionnelle pour se déplacer"],
        },
      ],
    });
  });

  it("retire la clause du motif quand la trace n'en établit aucun", () => {
    const sans = consignesDuModus(MODUS, undefined, []);
    expect(JSON.stringify(sans)).not.toContain("au titre d");
    expect(JSON.stringify(sans)).toContain(
      "que le transport sera pris en charge",
    );
  });

  it("retire la puce des besoins quand il n'y a aucun badge", () => {
    expect(
      JSON.stringify(consignesDuModus(MODUS, "un motif", [])),
    ).not.toContain("besoins particuliers");
  });
});

describe("le gras qui se ferme après un saut de ligne", () => {
  it("sort le saut de ligne du titre d'étape", () => {
    const consignes = consignesDuModus(
      "Introduction<br>**2. Comment être remboursé ?<br>**Texte.",
      undefined,
      [],
    );
    expect(consignes.etapes[0]).toMatchObject({
      numero: 2,
      titre: "Comment être remboursé ?",
      blocs: [{ type: "paragraphe", texte: "Texte." }],
    });
  });
});

describe("les segments d'un texte", () => {
  it("sépare le gras et les liens", () => {
    expect(segmentsDuTexte("a **b** [c](https://d.fr/) e")).toMatchObject([
      { texte: "a ", gras: false },
      { texte: "b", gras: true },
      { texte: " ", gras: false },
      { texte: "c", lien: "https://d.fr/" },
      { texte: " e", gras: false },
    ]);
  });

  it("ne lit comme lien que http et https", () => {
    const segments = segmentsDuTexte("[x](javascript:alert(1))");
    expect(segments.every(({ lien }) => lien === undefined)).toBe(true);
  });
});
