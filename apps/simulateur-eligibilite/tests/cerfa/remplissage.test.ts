// Le gabarit CERFA et l'écriture dedans : ce que le PDF accepte, ce qu'il
// refuse, ce qui survit à une relecture — et la couture entre le gabarit et le
// tableau de remplissage, qui doit le couvrir champ pour champ. La traduction
// d'une situation en saisies se teste à côté, dans `depuis-simulateur.test.ts`.

import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { remplirCerfa } from "../../front/outils-produit/beta/cerfa/pmt/remplir-cerfa.ts";
import { REMPLISSAGE_PMT } from "../../front/outils-produit/beta/cerfa/pmt/remplissage-pmt.ts";
import { VALEURS_COMPAREES } from "../../front/outils-produit/beta/cerfa/pmt/reponses.ts";
import { moteurDeTest } from "../simulateur/moteur.ts";
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
    const champ = document.getForm().getField("comm évent");

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
      { champ: "N et P bénéficiaire", texte: "DUPONT Marie" },
      { champ: "N° immat bénéf", texte: "2650175116005" },
      { champ: "brancardage ou dun portage", coché: "On" },
    ]);

    expect(await relire(pdf)).toMatchObject({
      "N et P bénéficiaire": "DUPONT Marie",
      "N° immat bénéf": "2650175116005",
      "brancardage ou dun portage": "/On",
    });
  });

  it("distingue les deux états d'un faux-radio partageant un même champ", async () => {
    // Même nom de champ, sémantique opposée : c'est l'état d'export qui tranche.
    const exonérante = await remplirCerfa(GABARIT, [
      { champ: "ALD exo", coché: "OUI" },
    ]);
    const nonExonérante = await remplirCerfa(GABARIT, [
      { champ: "ALD exo", coché: "NON" },
    ]);

    expect((await relire(exonérante))["ALD exo"]).toBe("/OUI");
    expect((await relire(nonExonérante))["ALD exo"]).toBe("/NON");
  });

  it("refuse une valeur plus longue que le champ plutôt que de la tronquer", async () => {
    // `clé` accepte 2 caractères : tronquer produirait une clé NIR fausse sur un
    // document opposable.
    await expect(
      remplirCerfa(GABARIT, [{ champ: "clé", texte: "421" }]),
    ).rejects.toThrow(/accepte 2 caractères/);
  });

  it("aplatit les champs dont le cadre ne montre qu'une ligne", async () => {
    const pdf = await remplirCerfa(GABARIT, [
      { champ: "adresse", texte: "12 rue des Lilas\n35000 RENNES" },
    ]);
    // Un `\n` ici rognerait silencieusement la seconde ligne à l'impression.
    expect((await relire(pdf))["adresse"]).toBe(
      "12 rue des Lilas - 35000 RENNES",
    );
  });
});

describe("le tableau de remplissage et le gabarit", () => {
  it("couvre les 53 champs du formulaire, ni plus ni moins", async () => {
    // Le tableau est le seul inventaire des champs du CERFA : c'est ce qui permet
    // d'y lire, pour chacun, comment il se remplit — ou qui le remplira. Un champ
    // absent passerait inaperçu, un nom mal recopié ferait lever `pdf-lib` au clic
    // du prescripteur, et pas avant.
    const gabarit = (await PDFDocument.load(GABARIT))
      .getForm()
      .getFields()
      .map((champ) => champ.getName());

    expect(Object.keys(REMPLISSAGE_PMT).sort()).toEqual([...gabarit].sort());
  });

  it("ne compare que des valeurs que le modèle déclare", () => {
    // Le tableau recopie des libellés du modèle pour les comparer aux réponses.
    // Une reformulation livrée avec les règles laisserait sinon une case
    // durablement décochée, sans que rien ne le signale.
    const règles = moteurDeTest().getParsedRules();
    for (const [règle, comparées] of VALEURS_COMPAREES) {
      const brut = règles[règle]?.rawNode as
        | { "une possibilité"?: string[] }
        | undefined;
      // Les possibilités sont écrites entre quotes dans le YAML : on les ôte.
      const déclarées = new Set(
        (brut?.["une possibilité"] ?? []).map((v) => v.slice(1, -1)),
      );
      for (const valeur of comparées)
        expect(déclarées, `${règle} — « ${valeur} »`).toContain(valeur);
    }
  });
});
