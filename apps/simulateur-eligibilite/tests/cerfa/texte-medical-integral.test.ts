// Le texte médical intégral dans la rubrique du Cerfa, sans annexe (contrat
// EM-2, TS973-12) : la composition, la mesure, et le remplissage des deux
// gabarits réels.
//
// `EM-MESURE-OBLIGATOIRE`, `EM-MESURE-ASYNC-REFUSEE` et
// `EM-MESURE-INCONNUE-REFUSEE` sont cités, pas portés : la mesure n'est pas
// une fonction fournie par l'appelant, c'est `tailleQuiTient` sur le vrai
// champ, synchrone par construction.

import { PDFDocument, PDFTextField, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { saisiesDepuisSituation as saisiesDap } from "../../front/outils-produit/beta/cerfa/dap/depuis-simulateur.ts";
import { composerElementsMedicaux } from "../../front/outils-produit/beta/cerfa/elements-medicaux/composition.ts";
import { DebordementDuTexteMedical } from "../../front/outils-produit/beta/cerfa/elements-medicaux/debordement-du-texte-medical.ts";
import {
  tailleQuiTient,
  tientDansLaZone,
} from "../../front/outils-produit/beta/cerfa/elements-medicaux/mesure-de-la-zone.ts";
import { saisiesDepuisSituation as saisiesPmt } from "../../front/outils-produit/beta/cerfa/pmt/depuis-simulateur.ts";
import { remplirCerfa } from "../../front/outils-produit/beta/cerfa/remplir-cerfa.ts";
import { reponsesDe } from "../../front/outils-produit/beta/cerfa/reponses.ts";
import { saisiesDepuisSituation as saisiesS3141 } from "../../front/outils-produit/beta/cerfa/s3141/depuis-simulateur.ts";
import { seedParId } from "../../front/outils-produit/seeds/catalogue.ts";
import { situationDe } from "../../front/outils-produit/seeds/seed.ts";
import { moteurDeTest } from "../simulateur/moteur.ts";
import {
  AIDE_PROFESSIONNEL,
  GABARIT,
  GABARIT_DAP,
  relire,
  situation,
} from "./gabarit.ts";

describe("la composition EM-2", () => {
  it("sépare les blocs par « ; », sans saut de ligne", () => {
    const texte = composerElementsMedicaux(
      reponsesDe(
        moteurDeTest(),
        situationDe(seedParId("secretariat-ambulance-ouvre-le-droit")),
      ),
    );
    expect(texte).toBe(
      "Bilan de suivi sans lien avec une ALD. ; Nécessite un brancardage ou un portage, c’est-à-dire que le patient doit être soulevé et transporté par des professionnels, y compris sur une courte distance.",
    );
  });

  it("reprend l'exemple du ticket, entier", () => {
    const texte = composerElementsMedicaux(
      reponsesDe(
        moteurDeTest(),
        situation({
          p1_autonomie: AIDE_PROFESSIONNEL,
          p1_critere_brancardage_portage: "oui",
          p1_critere_aucun: "non",
          p2_raison_principale: "'Sortie d’hospitalisation'",
        }),
      ),
    );
    expect(texte).toBe(
      "Sortie d’hospitalisation ; Nécessite un brancardage ou un portage, c’est-à-dire que le patient doit être soulevé et transporté par des professionnels, y compris sur une courte distance.",
    );
  });

  it("n'y ajoute plus le type d'hospitalisation", () => {
    const texte = composerElementsMedicaux(
      reponsesDe(
        moteurDeTest(),
        situationDe(seedParId("prescripteur-ambulance")),
      ),
    );
    expect(texte).toMatch(/^Entrée en hospitalisation ; /);
    expect(texte).not.toMatch(/hospitalisation (complète|partielle)/i);
  });
});

describe("la mesure", () => {
  it("EM-MESURE-COURT-DEPASSEMENT-EXPLICITE : un texte court tient à 10, un texte long à aucune taille lisible", async () => {
    const document = await PDFDocument.load(GABARIT_DAP);
    const police = await document.embedFont(StandardFonts.Helvetica);
    const champ = document.getForm().getField("elmedic");
    if (!(champ instanceof PDFTextField)) throw new Error("champ attendu");
    expect(tientDansLaZone(champ, police)("Consultation de cardiologie")).toBe(
      true,
    );
    expect(tailleQuiTient(champ, police, "Consultation de cardiologie")).toBe(
      10,
    );
    expect(
      tailleQuiTient(champ, police, "Motif détaillé. ".repeat(50)),
    ).toBeUndefined();
  });
});

describe("remplirCerfa sur les gabarits réels", () => {
  it("un texte qui tient reste entier dans la rubrique, sans page ajoutée", async () => {
    const saisies = saisiesPmt(
      moteurDeTest(),
      situationDe(seedParId("secretariat-ambulance-ouvre-le-droit")),
    );
    const pdf = await remplirCerfa(GABARIT, saisies);

    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(4);
    expect((await relire(pdf))["comm évent"]).toBe(
      "Bilan de suivi sans lien avec une ALD. ; Nécessite un brancardage ou un portage, c’est-à-dire que le patient doit être soulevé et transporté par des professionnels, y compris sur une courte distance.",
    );
  });

  it("EM-MESURE-VIDE-OBLIGATOIRE : un texte vide se génère, rubrique vierge", async () => {
    // Chez l'éditeur, la mesure est exigée même pour un texte vide. Ici, elle
    // n'est pas fournie par l'appelant : le remplissage mesure lui-même, et
    // un texte vide tient par définition.
    const pdf = await remplirCerfa(GABARIT, [
      { champ: "comm évent", texteMédical: "" },
    ]);
    expect((await relire(pdf))["comm évent"]).toBeUndefined();
  });

  it("DAP : un texte qui tient reste entier, police réduite au besoin", async () => {
    const saisies = saisiesDap(
      moteurDeTest(),
      situationDe(seedParId("secretariat-pension-militaire")),
    );
    const pdf = await remplirCerfa(GABARIT_DAP, saisies);

    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(4);
    expect((await relire(pdf)).elmedic).toBe(
      "Entrée en hospitalisation ; Justification du trajet de plus de 150 km : Plateau technique nécessaire indisponible à proximité. ; Soins dispensés au titre d’une pension militaire d’invalidité.",
    );
  });

  it.each([
    ["PMT", "secretariat-prescription", saisiesPmt, GABARIT],
    ["DAP", "secretariat-permission-longue-distance", saisiesDap, GABARIT_DAP],
  ] as const)(
    "EM-LONG-TEXTE-INTEGRAL-SANS-ANNEXE (%s) : un texte qui déborde ne produit aucun PDF, et garde le texte entier",
    async (_document, seed, saisiesDe, gabarit) => {
      const saisies = saisiesDe(moteurDeTest(), situationDe(seedParId(seed)));
      const compose = saisies.find((saisie) => "texteMédical" in saisie);
      const erreur = await remplirCerfa(gabarit, saisies).catch((e) => e);

      expect(erreur).toBeInstanceOf(DebordementDuTexteMedical);
      expect(erreur.texte).toBe(
        compose && "texteMédical" in compose ? compose.texteMédical : "",
      );
      expect(erreur.texte).not.toMatch(/annexe/);
    },
  );
});

describe("confidentialité", () => {
  it.each([
    ["PMT", GABARIT, "comm évent", 2],
    ["DAP", GABARIT_DAP, "elmedic", 1],
  ] as const)(
    "%s : la rubrique médicale n'a qu'un widget, sur le volet 1",
    async (_document, gabarit, nom, pageDuVolet1) => {
      const document = await PDFDocument.load(gabarit);
      const widgets = document
        .getForm()
        .getTextField(nom)
        .acroField.getWidgets();
      const pages = document.getPages().map((page) => page.ref);
      expect(widgets).toHaveLength(1);
      const page = widgets[0]?.P();
      expect(page && pages.indexOf(page)).toBe(pageDuVolet1);
    },
  );

  it("le S3141 ne reçoit aucune rubrique médicale", () => {
    const situation = situationDe(seedParId("secretariat-permission-s3141"));
    const saisies = saisiesS3141(moteurDeTest(), situation);
    expect(saisies.some((saisie) => "texteMédical" in saisie)).toBe(false);
  });
});
