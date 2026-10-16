// Le motif administratif du modus et la permission de sortie du S3141 (#135,
// Q2.8.5), lus dans le texte de la fiche. Des traces écrites à la main.

import { describe, expect, it } from "vitest";
import {
  AMBULANCE_NECESSAIRE,
  fiche,
  puces,
  s3141,
  TAP,
} from "./fiches-du-test";

describe("le motif du modus", () => {
  it("PMT : le motif de la trace, après « au titre d’ »", () => {
    const texte = fiche(
      { ...TAP, cible_hospitalisation_ou_seances_assimilees: true },
      { criteres: [1], precisions: { hospitalisation: "H-SEANCE-HE" } },
    );
    expect(puces(texte).map(({ texte: ligne }) => ligne)).toContain(
      "que votre transport sera pris en charge par l’Assurance Maladie au titre d’un transport lié à une séance de dialyse, prise en compte comme une hospitalisation pour le transport ;",
    );
  });

  it("PMT sans motif établi : la clause « au titre de » disparaît", () => {
    const texte = fiche(TAP, { criteres: [1] });
    expect(texte?.raison).toBeUndefined();
    expect(JSON.stringify(texte)).not.toContain("au titre d");
  });
});

describe("la permission de sortie (S3141, Q2.8.5)", () => {
  const phrase = (id: string) =>
    s3141.permissionPhrases.find((entree) => entree.id === id)?.text;

  it.each([
    [false, TAP, "E-S3141-U"],
    [true, TAP, "E-S3141-R"],
    [false, AMBULANCE_NECESSAIRE, "E-S3141-U-B"],
    [true, AMBULANCE_NECESSAIRE, "E-S3141-R-B"],
  ] as const)("Q2.8.5 %s, %j : %s", (repetee, cibles, id) => {
    const texte = fiche(cibles, { permissionRepeated: repetee }, "ISSUE_S3141");
    expect(texte?.raison).toBe(phrase(id));
    expect(texte?.raison).toBeTruthy();
  });

  it("une permission unique : la phrase de l'éditeur", () => {
    expect(
      fiche(TAP, { permissionRepeated: false }, "ISSUE_S3141")?.raison,
    ).toMatch(
      /^Vous avez moins de 20 ans et votre permission de sortie a été autorisée pendant votre hospitalisation, à compter du quatorzième jour\./,
    );
  });

  it("le motif du modus suit Q2.8.5", () => {
    const motif = (repetee: boolean) =>
      puces(fiche(TAP, { permissionRepeated: repetee }, "ISSUE_S3141")).map(
        ({ texte }) => texte,
      );
    expect(motif(false)).toContain(
      "que le transport pourra être pris en charge par l’Assurance Maladie au titre d’un transport lié à une permission de sortie autorisée pendant votre hospitalisation ;",
    );
    expect(motif(true).join(" ")).toContain(
      "au titre d’un transport lié à des permissions de sortie autorisées pendant votre hospitalisation",
    );
  });

  it("sans réponse à Q2.8.5, ni phrase ni clause « au titre de »", () => {
    const texte = fiche(TAP, {}, "ISSUE_S3141");
    expect(texte?.raison).toBeUndefined();
    expect(JSON.stringify(texte)).not.toContain("au titre d");
  });

  it("ne reprend ni le contexte du soin ni les motifs de la prescription médicale", () => {
    const texte = fiche(
      {
        ...TAP,
        cible_hospitalisation_ou_seances_assimilees: true,
        cible_ald_juridiquement_qualifiante_3_ou_4_degres: true,
      },
      {
        permissionRepeated: false,
        precisions: { hospitalisation: "H-SEANCE-HE" },
      },
      "ISSUE_S3141",
    );
    expect(texte?.raison).toBe(phrase("E-S3141-U"));
    expect(JSON.stringify(texte)).not.toContain("maladie de longue durée");
    expect(JSON.stringify(texte)).not.toContain("dialyse");
  });
});
