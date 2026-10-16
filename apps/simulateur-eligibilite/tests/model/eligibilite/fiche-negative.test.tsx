// La fiche patient négative, telle qu'elle s'affiche (#134). La seed
// `issue-non-eligible` donne les textes de l'aperçu de l'éditeur ; le conseil
// sur l'ALD ne vient qu'avec une ALD établie. Les textes viennent du catalogue,
// chargé à la demande derrière un `Suspense`.

import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { catalogueResultats } from "../../../front/models/eligibilite/catalogue-resultats";
import { Eligibilite } from "../../../front/models/eligibilite/Resultats";
import { SEEDS } from "../../../front/models/eligibilite/seeds-catalogue";
import { ciblesDe, type Reponses } from "./reponses-de-la-permission";

const { issues } = await catalogueResultats();
const issue = issues.ISSUE_NON_ELIGIBLE;

const seed = SEEDS.find(({ id }) => id === "issue-non-eligible");
if (!seed) throw new Error("Seed inconnue : issue-non-eligible");

const afficher = async (answers: Reponses) => {
  await act(async () => {
    render(<Eligibilite answers={answers} cibles={ciblesDe(answers)} />);
  });
};

// Une ALD, le patient se déplaçant seul : Q1.3 option 2 établit l'ALD.
const AVEC_ALD = {
  ...seed.answers,
  "Q1.1": "1_SEUL",
  "Q1.4": "1_VEHICULE_PERSONNEL",
  "Q1.3": ["2_ALD"],
} as Reponses;

const fiche = () =>
  within(screen.getByRole("article", { name: "Fiche explicative patient" }));

describe("la fiche de la seed issue-non-eligible", () => {
  it("donne les deux titres de l'éditeur", async () => {
    await afficher(seed.answers);
    expect(
      await screen.findByRole("heading", { level: 2, name: issue.title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: issue.prescriberTitle }),
    ).toBeInTheDocument();
  });

  it("donne la raison de la consultation", async () => {
    await afficher(seed.answers);
    await screen.findByRole("article", { name: "Fiche explicative patient" });
    expect(
      fiche().getByText(/votre déplacement concerne une consultation médicale/),
    ).toBeInTheDocument();
  });

  it("donne l'introduction des cartes et les trois cartes fixes", async () => {
    await afficher(seed.answers);
    await screen.findByRole("article", { name: "Fiche explicative patient" });
    expect(
      fiche().getByRole("heading", { name: issue.cardIntro.title }),
    ).toBeInTheDocument();
    expect(fiche().getByText(issue.cardIntro.text)).toBeInTheDocument();
    for (const { title, text } of issue.fixedCards) {
      expect(fiche().getByRole("heading", { name: title })).toBeInTheDocument();
      expect(fiche().getByText(text)).toBeInTheDocument();
    }
  });

  it("donne les consignes et le bloc des frais", async () => {
    await afficher(seed.answers);
    await screen.findByRole("article", { name: "Fiche explicative patient" });
    const { intro, body } = issue.instructions;
    expect(
      fiche().getByRole("heading", { name: intro.title }),
    ).toBeInTheDocument();
    expect(fiche().getByText(body)).toBeInTheDocument();
    expect(
      fiche().getByRole("heading", { name: issue.finance.title }),
    ).toBeInTheDocument();
    expect(fiche().getByText(issue.finance.text)).toBeInTheDocument();
  });
});

describe("le conseil sur l'ALD", () => {
  it("manque de la fiche quand l'ALD n'est pas établie", async () => {
    await afficher(seed.answers);
    await screen.findByRole("article", { name: "Fiche explicative patient" });
    expect(screen.queryByText(/être en ALD ne vous donne pas/)).toBeNull();
  });

  it("figure dans la fiche quand l'ALD est établie, avec son gras", async () => {
    await afficher(AVEC_ALD);
    await screen.findByRole("article", { name: "Fiche explicative patient" });
    const conseil = fiche().getByRole("complementary", {
      name: "Information importante concernant les affections de longue durée",
    });
    expect(within(conseil).getByText("Important :").tagName).toBe("STRONG");
    expect(conseil).toHaveTextContent(
      "être en ALD ne vous donne pas automatiquement droit à une prescription médicale de transport",
    );
  });

  it("garde alors la raison propre à l'ALD", async () => {
    await afficher(AVEC_ALD);
    await screen.findByRole("article", { name: "Fiche explicative patient" });
    expect(
      fiche().getByText(/les critères de déficience ou d’incapacité/),
    ).toBeInTheDocument();
  });
});

describe("l'impression", () => {
  it("ne garde pas pour le patient ce que le prescripteur lit", async () => {
    await afficher(seed.answers);
    const prescripteur = await screen.findByRole("region", {
      name: "Résultat pour le praticien",
    });
    expect(prescripteur).toHaveClass("fr-no-print");
    const patient = screen.getByRole("article", {
      name: "Fiche explicative patient",
    });
    expect(patient).not.toHaveClass("fr-no-print");
    expect(patient).not.toContainElement(prescripteur);
  });
});
