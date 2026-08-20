// Le gabarit CERFA et l'écriture dedans : ce que le PDF accepte, ce qu'il
// refuse, et ce qui survit à une relecture. La traduction d'une situation en
// saisies se teste à côté, dans `depuis-simulateur.test.ts`.

import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  IDENTITÉ,
  MODE_TRANSPORT,
  PRESCRIPTION,
  SITUATION,
} from "../../front/outils-produit/beta/cerfa/champs-cerfa.ts";
import { remplirCerfa } from "../../front/outils-produit/beta/cerfa/remplir-cerfa.ts";
import { GABARIT, relire } from "./gabarit.ts";

describe("gabarit CERFA n° 11574*07", () => {
  it("est un formulaire interactif dont les champs couvrent les deux volets", async () => {
    const document = await PDFDocument.load(GABARIT);
    const champs = document.getForm().getFields();

    expect(document.getPageCount()).toBe(4);
    expect(champs.length).toBe(53);

    // L'essentiel des champs porte un widget sur le Volet 1 (p3) **et** le Volet 2
    // (p4) : c'est ce qui permet de remplir les deux volets en une seule écriture.
    const partagés = champs.filter((c) => c.acroField.getWidgets().length >= 2);
    expect(partagés.length).toBeGreaterThan(45);
  });

  it("n'expose les éléments d'ordre médical que sur le Volet 1", async () => {
    const document = await PDFDocument.load(GABARIT);
    const pages = document.getPages().map((p) => p.ref);
    const champ = document
      .getForm()
      .getField(PRESCRIPTION.élémentsOrdreMédical);

    const numéros = champ.acroField
      .getWidgets()
      // `P()` est optionnel dans pdf-lib ; un widget du gabarit CERFA porte
      // toujours sa page — sinon `indexOf` renverrait -1 et le test échouerait.
      .map((w) => pages.indexOf(w.P()!) + 1);
    expect(numéros).toEqual([3]); // jamais sur le Volet 2, envoyé à l'organisme
  });
});

describe("remplirCerfa", () => {
  it("écrit textes et cases, et les valeurs survivent à une relecture", async () => {
    const pdf = await remplirCerfa(GABARIT, [
      { champ: IDENTITÉ.bénéficiaireNomPrénom, texte: "DUPONT Marie" },
      { champ: IDENTITÉ.bénéficiaireNIR, texte: "2650175116005" },
      { case: MODE_TRANSPORT.brancardagePortage },
    ]);

    expect(await relire(pdf)).toMatchObject({
      [IDENTITÉ.bénéficiaireNomPrénom]: "DUPONT Marie",
      [IDENTITÉ.bénéficiaireNIR]: "2650175116005",
      [MODE_TRANSPORT.brancardagePortage.nom]: "/On",
    });
  });

  it("distingue les deux états d'un faux-radio partageant un même champ", async () => {
    const exonérante = await remplirCerfa(GABARIT, [
      { case: SITUATION.aldExonérante },
    ]);
    const nonExonérante = await remplirCerfa(GABARIT, [
      { case: SITUATION.aldNonExonérante },
    ]);

    // Même nom de champ, sémantique opposée : c'est l'état d'export qui tranche.
    expect(SITUATION.aldExonérante.nom).toBe(SITUATION.aldNonExonérante.nom);
    expect((await relire(exonérante))["ALD exo"]).toBe("/OUI");
    expect((await relire(nonExonérante))["ALD exo"]).toBe("/NON");
  });

  it("refuse une valeur plus longue que le champ plutôt que de la tronquer", async () => {
    // `clé` accepte 2 caractères : tronquer produirait une clé NIR fausse sur un
    // document opposable.
    await expect(
      remplirCerfa(GABARIT, [
        { champ: IDENTITÉ.bénéficiaireClé, texte: "421" },
      ]),
    ).rejects.toThrow(/accepte 2 caractères/);
  });

  it("aplatit les champs dont le cadre ne montre qu'une ligne", async () => {
    const pdf = await remplirCerfa(GABARIT, [
      {
        champ: IDENTITÉ.bénéficiaireAdresse,
        texte: "12 rue des Lilas\n35000 RENNES",
      },
    ]);
    // Un `\n` ici rognerait silencieusement la seconde ligne à l'impression.
    expect((await relire(pdf))[IDENTITÉ.bénéficiaireAdresse]).toBe(
      "12 rue des Lilas - 35000 RENNES",
    );
  });
});
