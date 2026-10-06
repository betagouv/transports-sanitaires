import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { formatDateForField } from "../../front/cerfa/dates";
import {
  entriesFrom,
  type FieldMapping,
  leftTo,
  textFrom,
} from "../../front/cerfa/field-mapping";
import { fillCerfa } from "../../front/cerfa/fill-cerfa";
import { TextOverflowError } from "../../front/cerfa/text-overflow";
import { fontSizeOf, readBack, statesOf, testForm } from "./test-form";

// Le socle de remplissage d'un PDF : ce qu'un formulaire accepte, ce qu'il
// refuse, ce qui survit à une relecture. Aucun gabarit réel n'est en jeu.

const LONG = "Un motif médical beaucoup trop long pour ce cadre. ".repeat(8);

describe("fillCerfa", () => {
  it("écrit textes et cases, et les valeurs survivent à une relecture", async () => {
    const template = await testForm();
    const [state] = await statesOf(template, "ald");

    const pdf = await fillCerfa(template, [
      { field: "nom", text: "DUPONT Marie" },
      { field: "ald", checked: state as string },
    ]);

    expect(await readBack(pdf)).toEqual({
      nom: "DUPONT Marie",
      ald: `/${state}`,
    });
  });

  it("refuse un état d'export que la case ne sait pas rendre", async () => {
    const template = await testForm();
    await expect(
      fillCerfa(template, [{ field: "ald", checked: "OUI" }]),
    ).rejects.toThrow("ne connaît pas l'état « /OUI »");
  });

  it("refuse une valeur plus longue que le champ, plutôt que de la tronquer", async () => {
    const template = await testForm();
    await expect(
      fillCerfa(template, [{ field: "nir", text: "26501751160051" }]),
    ).rejects.toThrow("« nir » accepte 13 caractères, 14 fournis");
  });

  it("refuse d'écrire un texte dans une case, et inversement", async () => {
    const template = await testForm();
    await expect(
      fillCerfa(template, [{ field: "ald", text: "oui" }]),
    ).rejects.toThrow("n'est pas un champ texte");
    await expect(
      fillCerfa(template, [{ field: "nom", checked: "Yes" }]),
    ).rejects.toThrow("n'est pas une case à cocher");
  });

  it("aplatit sur une ligne les champs qui n'en montrent qu'une", async () => {
    const pdf = await fillCerfa(
      await testForm(),
      [{ field: "nom", text: "1 rue du Départ\n75001 Paris" }],
      { singleLineFields: ["nom"] },
    );
    expect(await readBack(pdf)).toEqual({
      nom: "1 rue du Départ - 75001 Paris",
    });
  });

  it("verrouille les champs remplis sur demande, et eux seuls", async () => {
    const pdf = await fillCerfa(
      await testForm(),
      [{ field: "nom", text: "DUPONT Marie" }],
      { readOnly: true },
    );
    const form = (await PDFDocument.load(pdf)).getForm();
    expect(form.getField("nom").isReadOnly()).toBe(true);
    expect(form.getField("nir").isReadOnly()).toBe(false);
  });
});

describe("texte mesuré", () => {
  it("s'écrit en entier quand il tient, police réduite s'il le faut", async () => {
    const text =
      "Dialyse en centre, trois séances par semaine, patient en fauteuil.";
    const pdf = await fillCerfa(await testForm(), [
      { field: "motif", measuredText: text },
    ]);

    expect(await readBack(pdf)).toEqual({ motif: text });
    expect(await fontSizeOf(pdf, "motif")).toBeLessThan(10);
    expect(await fontSizeOf(pdf, "motif")).toBeGreaterThanOrEqual(6);
  });

  it("déborde sans rien écrire, et sans citer le texte dans le message", async () => {
    const attempt = fillCerfa(await testForm(), [
      { field: "motif", measuredText: LONG },
    ]);

    await expect(attempt).rejects.toBeInstanceOf(TextOverflowError);
    await expect(attempt).rejects.toMatchObject({
      field: "motif",
      text: LONG,
      message: "Le texte ne tient pas dans le champ « motif ».",
    });
  });
});

describe("tableau de remplissage", () => {
  type Answers = { nom: string; motif: string };

  const MAPPING: FieldMapping<Answers> = {
    nom: textFrom((answers) => answers.nom),
    motif: (answers) =>
      answers.motif ? { measuredText: answers.motif } : undefined,
    nir: leftTo("le prescripteur", "donnée nominative, hors du simulateur"),
  };

  it("ne rend que ce qui est déduit des answers", () => {
    expect(entriesFrom(MAPPING, { nom: "DUPONT", motif: "" })).toEqual([
      { field: "nom", text: "DUPONT" },
    ]);
  });

  it("laisse vierge un texte vide, comme un champ laissé à quelqu'un", () => {
    expect(entriesFrom(MAPPING, { nom: "", motif: "Dialyse" })).toEqual([
      { field: "motif", measuredText: "Dialyse" },
    ]);
  });
});

describe("date sur un champ peigné", () => {
  it("s'écrit sans séparateur sur huit cases, avec sur dix", () => {
    expect(formatDateForField("2026-10-06", 8)).toBe("06102026");
    expect(formatDateForField("2026-10-06", 10)).toBe("06/10/2026");
  });

  it("rend telle quelle une valeur qui n'est pas une date ISO", () => {
    expect(formatDateForField("", 8)).toBe("");
  });
});
