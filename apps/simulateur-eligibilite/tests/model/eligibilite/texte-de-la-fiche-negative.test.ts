// Le texte de la fiche patient négative (#134). Les phrases attendues sont
// celles de l'aperçu de l'éditeur : un texte qui change sans que son oracle
// change échoue ici.

import { describe, expect, it } from "vitest";
import { catalogueResultats } from "../../../front/models/eligibilite/catalogue-resultats";
import { SEEDS } from "../../../front/models/eligibilite/seeds-catalogue";
import { texteDeLaFicheNegative } from "../../../front/models/eligibilite/texte-de-la-fiche-negative";
import { traceDuResultat } from "../../../front/models/eligibilite/trace-du-resultat";
import { ciblesDe } from "./reponses-de-la-permission";
import { trace } from "./traces-du-praticien";

const catalogue = await catalogueResultats();

const seed = SEEDS.find(({ id }) => id === "issue-non-eligible");
if (!seed) throw new Error("Seed inconnue : issue-non-eligible");

describe("le texte de la seed issue-non-eligible", () => {
  const texte = texteDeLaFicheNegative(
    catalogue,
    traceDuResultat(seed.answers, ciblesDe(seed.answers)),
  );

  it("donne les titres de l'aperçu", () => {
    expect(texte.titreDuPatient).toBe(
      "Votre transport ne peut pas être pris en charge par l’Assurance Maladie",
    );
    expect(texte.titreDuPrescripteur).toBe(
      "Le transport de votre patient ne peut pas être pris en charge par l’Assurance Maladie",
    );
  });

  it("donne la raison de la consultation", () => {
    expect(texte.raison).toBe(
      "Selon les informations recueillies, votre déplacement concerne une consultation médicale. Cette consultation, à elle seule, ne suffit pas à ouvrir droit au remboursement de votre transport par l’Assurance Maladie.",
    );
  });

  it("donne les trois cartes fixes et leur introduction", () => {
    expect(texte.introDesCartes.title).toBe(
      "Si la situation médicale le justifie",
    );
    expect(texte.cartes.map(({ title }) => title)).toEqual([
      "Véhicule personnel ou transports en commun",
      "VSL (véhicule sanitaire léger) ou taxi conventionné",
      "Ambulance",
    ]);
  });

  it("donne les consignes, sans sous-titre ni étape quand le catalogue n'en a pas", () => {
    expect(texte.consignes).toEqual({
      titre: "Que pouvez-vous faire maintenant ?",
      texte:
        "Cette conclusion ne remet pas en cause la nécessité de vos soins. Vous pouvez organiser votre déplacement par vos propres moyens ou demander le tarif d’un transporteur avant toute réservation.",
      etapes: [],
    });
  });

  it("donne le bloc des frais de transport", () => {
    expect(texte.finance.title).toBe("À propos des frais de transport");
  });
});

describe("le conseil sur l'ALD", () => {
  const { aldAdvice } = catalogue.issues.ISSUE_NON_ELIGIBLE;
  const conseil = (precisions: Parameters<typeof trace>[2]) =>
    texteDeLaFicheNegative(catalogue, trace({}, {}, precisions)).conseilAld;

  it("vient du catalogue quand l'ALD est établie", () => {
    expect(conseil({ aldRecognized: true, aldRelated: true })).toBe(aldAdvice);
  });

  it("manque quand la trace ne dit rien de l'ALD", () => {
    expect(conseil({})).toBeUndefined();
  });

  it("manque quand la trace ne la prouve pas", () => {
    expect(conseil({ aldRecognized: false })).toBeUndefined();
  });
});

describe("les parties facultatives du catalogue", () => {
  it("montre le sous-titre et les étapes quand le catalogue en porte", () => {
    const negative = catalogue.issues.ISSUE_NON_ELIGIBLE;
    const avec = {
      ...catalogue,
      issues: {
        ...catalogue.issues,
        ISSUE_NON_ELIGIBLE: {
          ...negative,
          instructions: {
            ...negative.instructions,
            intro: {
              ...negative.instructions.intro,
              subtitle: "Un sous-titre",
            },
            steps: ["Une étape"],
          },
        },
      },
    };
    const { consignes } = texteDeLaFicheNegative(avec, trace({}));
    expect(consignes.sousTitre).toBe("Un sous-titre");
    expect(consignes.etapes).toEqual(["Une étape"]);
  });
});
