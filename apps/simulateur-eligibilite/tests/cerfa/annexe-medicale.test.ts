// Le plan d'impression et l'annexe des éléments d'ordre médical (contrat
// EM-1, spec 0005) : `planDImpression`, `paginer` et `tientDansLaZone` se
// testent directement, ce sont des fonctions pures ou proches — l'annexe
// dessinée, elle, ne se relit pas par `relire`, seul `remplirCerfa` sur les
// deux gabarits réels le confirme.
//
// `EM-MESURE-OBLIGATOIRE`, `EM-MESURE-ASYNC-REFUSEE` et
// `EM-MESURE-INCONNUE-REFUSEE` sont cités, pas portés : la signature de
// `planDImpression`, `(texte: string, tient: (valeur: string) => boolean)`,
// les rend impossibles à la compilation plutôt qu'à l'exécution.

import { PDFDocument, PDFTextField, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { saisiesDepuisSituation as saisiesDap } from "../../front/outils-produit/beta/cerfa/dap/depuis-simulateur.ts";
import {
  paginer,
  tientDansLaZone,
} from "../../front/outils-produit/beta/cerfa/elements-medicaux/annexe.ts";
import {
  RENVOI_A_L_ANNEXE,
  TITRE_DE_L_ANNEXE,
} from "../../front/outils-produit/beta/cerfa/elements-medicaux/libelles.ts";
import { planDImpression } from "../../front/outils-produit/beta/cerfa/elements-medicaux/plan-d-impression.ts";
import { saisiesDepuisSituation as saisiesPmt } from "../../front/outils-produit/beta/cerfa/pmt/depuis-simulateur.ts";
import { remplirCerfa } from "../../front/outils-produit/beta/cerfa/remplir-cerfa.ts";
import { seedParId } from "../../front/outils-produit/seeds/catalogue.ts";
import { situationDe } from "../../front/outils-produit/seeds/seed.ts";
import { moteurDeTest } from "../simulateur/moteur.ts";
import { GABARIT, GABARIT_DAP, relire } from "./gabarit.ts";

describe("planDImpression", () => {
  it("EM-TEXTE-COURT-SANS-ANNEXE", () => {
    expect(planDImpression("IRM", () => true)).toEqual({
      texteDuChamp: "IRM",
      annexe: null,
    });
  });

  it("EM-RENVOI-TROP-LONG-ERREUR-EXPLICITE", () => {
    expect(() => planDImpression("IRM", () => false)).toThrow(/renvoi/);
  });

  it("EM-LONG-TEXTE-ANNEXE-INTEGRALE — le plan pur", () => {
    const long = "Motif détaillé. ".repeat(50);
    const plan = planDImpression(
      long,
      (valeur) => valeur === RENVOI_A_L_ANNEXE,
    );
    expect(plan.texteDuChamp).toBe(RENVOI_A_L_ANNEXE);
    expect(plan.annexe).toEqual({ titre: TITRE_DE_L_ANNEXE, texte: long });
  });
});

describe("paginer", () => {
  it("découpe un texte long en plusieurs pages qui tiennent dans le cadre", async () => {
    const police = await (await PDFDocument.create()).embedFont(
      StandardFonts.Helvetica,
    );
    const texte =
      "Un motif médical assez long pour occuper plusieurs lignes. ".repeat(20);
    const pages = paginer(texte, police, { largeur: 200, hauteur: 60 });
    expect(pages.length).toBeGreaterThan(1);
    for (const lignes of pages) expect(lignes.length).toBeGreaterThan(0);
  });
});

describe("tientDansLaZone", () => {
  it("un texte court tient, un texte long ne tient pas", async () => {
    const document = await PDFDocument.load(GABARIT_DAP);
    const police = await document.embedFont(StandardFonts.Helvetica);
    const champ = document.getForm().getField("elmedic");
    if (!(champ instanceof PDFTextField)) throw new Error("champ attendu");
    const tient = tientDansLaZone(champ, police);
    expect(tient("Consultation de cardiologie")).toBe(true);
    expect(tient("Motif détaillé. ".repeat(50))).toBe(false);
  });
});

describe("remplirCerfa — plan et annexe sur les gabarits réels", () => {
  it("un texte qui tient reste dans le champ, sans annexe", async () => {
    const moteur = moteurDeTest();
    const situation = situationDe(
      seedParId("secretariat-consultation-cardiologie"),
    );
    const saisies = saisiesPmt(moteur, situation);
    const pdf = await remplirCerfa(GABARIT, saisies);
    const document = await PDFDocument.load(pdf);

    expect(document.getPageCount()).toBe(4);
    expect((await relire(pdf))["comm évent"]).toBe(
      "Consultation de cardiologie",
    );
  });

  it("un texte qui déborde renvoie à une annexe insérée après le volet 1 (DAP)", async () => {
    const moteur = moteurDeTest();
    const situation = situationDe(seedParId("secretariat-pension-militaire"));
    const saisies = saisiesDap(moteur, situation);
    const pdf = await remplirCerfa(GABARIT_DAP, saisies);
    const document = await PDFDocument.load(pdf);

    // Le gabarit fait 4 pages, `elmedic` sur la page 2 : l'annexe, une seule
    // page pour ce texte, devient la page 3.
    expect(document.getPageCount()).toBe(5);
    expect((await relire(pdf)).elmedic).toBe(RENVOI_A_L_ANNEXE);
  });
});
