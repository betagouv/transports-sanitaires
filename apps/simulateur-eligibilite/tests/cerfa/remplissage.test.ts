import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { dateSurLeChamp } from "../../front/cerfa/dates";
import { DebordementDuTexte } from "../../front/cerfa/debordement-du-texte";
import { remplirCerfa } from "../../front/cerfa/remplir-cerfa";
import {
  laisséÀ,
  saisiesDuTableau,
  type Tableau,
  écrit,
} from "../../front/cerfa/remplissage";
import {
  formulaireDeTest,
  relire,
  tailleDe,
  étatsDe,
} from "./formulaire-de-test";

// Le socle de remplissage d'un PDF : ce qu'un formulaire accepte, ce qu'il
// refuse, ce qui survit à une relecture. Aucun gabarit réel n'est en jeu.

const LONG = "Un motif médical beaucoup trop long pour ce cadre. ".repeat(8);

describe("remplirCerfa", () => {
  it("écrit textes et cases, et les valeurs survivent à une relecture", async () => {
    const gabarit = await formulaireDeTest();
    const [état] = await étatsDe(gabarit, "ald");

    const pdf = await remplirCerfa(gabarit, [
      { champ: "nom", texte: "DUPONT Marie" },
      { champ: "ald", coché: état as string },
    ]);

    expect(await relire(pdf)).toEqual({
      nom: "DUPONT Marie",
      ald: `/${état}`,
    });
  });

  it("refuse un état d'export que la case ne sait pas rendre", async () => {
    const gabarit = await formulaireDeTest();
    await expect(
      remplirCerfa(gabarit, [{ champ: "ald", coché: "OUI" }]),
    ).rejects.toThrow("ne connaît pas l'état « /OUI »");
  });

  it("refuse une valeur plus longue que le champ, plutôt que de la tronquer", async () => {
    const gabarit = await formulaireDeTest();
    await expect(
      remplirCerfa(gabarit, [{ champ: "nir", texte: "26501751160051" }]),
    ).rejects.toThrow("« nir » accepte 13 caractères, 14 fournis");
  });

  it("refuse d'écrire un texte dans une case, et inversement", async () => {
    const gabarit = await formulaireDeTest();
    await expect(
      remplirCerfa(gabarit, [{ champ: "ald", texte: "oui" }]),
    ).rejects.toThrow("n'est pas un champ texte");
    await expect(
      remplirCerfa(gabarit, [{ champ: "nom", coché: "Yes" }]),
    ).rejects.toThrow("n'est pas une case à cocher");
  });

  it("aplatit sur une ligne les champs qui n'en montrent qu'une", async () => {
    const pdf = await remplirCerfa(
      await formulaireDeTest(),
      [{ champ: "nom", texte: "1 rue du Départ\n75001 Paris" }],
      { surUneLigne: ["nom"] },
    );
    expect(await relire(pdf)).toEqual({ nom: "1 rue du Départ - 75001 Paris" });
  });

  it("verrouille les champs remplis sur demande, et eux seuls", async () => {
    const pdf = await remplirCerfa(
      await formulaireDeTest(),
      [{ champ: "nom", texte: "DUPONT Marie" }],
      { verrouiller: true },
    );
    const formulaire = (await PDFDocument.load(pdf)).getForm();
    expect(formulaire.getField("nom").isReadOnly()).toBe(true);
    expect(formulaire.getField("nir").isReadOnly()).toBe(false);
  });
});

describe("texte mesuré", () => {
  it("s'écrit en entier quand il tient, police réduite s'il le faut", async () => {
    const texte =
      "Dialyse en centre, trois séances par semaine, patient en fauteuil.";
    const pdf = await remplirCerfa(await formulaireDeTest(), [
      { champ: "motif", texteMesuré: texte },
    ]);

    expect(await relire(pdf)).toEqual({ motif: texte });
    expect(await tailleDe(pdf, "motif")).toBeLessThan(10);
    expect(await tailleDe(pdf, "motif")).toBeGreaterThanOrEqual(6);
  });

  it("déborde sans rien écrire, et sans citer le texte dans le message", async () => {
    const tentative = remplirCerfa(await formulaireDeTest(), [
      { champ: "motif", texteMesuré: LONG },
    ]);

    await expect(tentative).rejects.toBeInstanceOf(DebordementDuTexte);
    await expect(tentative).rejects.toMatchObject({
      champ: "motif",
      texte: LONG,
      message: "Le texte ne tient pas dans le champ « motif ».",
    });
  });
});

describe("tableau de remplissage", () => {
  type Reponses = { nom: string; motif: string };

  const TABLEAU: Tableau<Reponses> = {
    nom: écrit((réponses) => réponses.nom),
    motif: (réponses) =>
      réponses.motif ? { texteMesuré: réponses.motif } : undefined,
    nir: laisséÀ("le prescripteur", "donnée nominative, hors du simulateur"),
  };

  it("ne rend que ce qui est déduit des réponses", () => {
    expect(saisiesDuTableau(TABLEAU, { nom: "DUPONT", motif: "" })).toEqual([
      { champ: "nom", texte: "DUPONT" },
    ]);
  });

  it("laisse vierge un texte vide, comme un champ laissé à quelqu'un", () => {
    expect(saisiesDuTableau(TABLEAU, { nom: "", motif: "Dialyse" })).toEqual([
      { champ: "motif", texteMesuré: "Dialyse" },
    ]);
  });
});

describe("date sur un champ peigné", () => {
  it("s'écrit sans séparateur sur huit cases, avec sur dix", () => {
    expect(dateSurLeChamp("2026-10-06", 8)).toBe("06102026");
    expect(dateSurLeChamp("2026-10-06", 10)).toBe("06/10/2026");
  });

  it("rend telle quelle une valeur qui n'est pas une date ISO", () => {
    expect(dateSurLeChamp("", 8)).toBe("");
  });
});
