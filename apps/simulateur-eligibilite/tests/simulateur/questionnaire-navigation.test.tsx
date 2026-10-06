import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ACCOMPAGNEMENTS,
  allerAuResultat,
  BOISSON,
  bouton,
  caseACocher,
  ouvrirLeSimulateur,
  question,
  radio,
  sansBouton,
} from "./questionnaire";

// La navigation que le vrai questionnaire reprendra telle quelle. Elle est
// testée sur le questionnaire factice, par la vraie application.

describe("avancement automatique", () => {
  it("un choix unique avance seul, sans bouton « Suivant »", async () => {
    const user = await ouvrirLeSimulateur();
    await question(BOISSON);
    expect(sansBouton("Suivant")).toBe(true);

    await user.click(radio("Un thé"));

    expect(await question(ACCOMPAGNEMENTS)).toBeInTheDocument();
  });

  it("un choix multiple attend « Suivant », grisé tant que rien n'est coché", async () => {
    const user = await ouvrirLeSimulateur();
    await user.click(radio("Un thé"));
    await question(ACCOMPAGNEMENTS);
    expect(bouton("Suivant")).toBeDisabled();

    await user.click(caseACocher("Du lait"));

    expect(bouton("Voir le résultat")).toBeEnabled();
    expect(screen.getByRole("group", ACCOMPAGNEMENTS)).toBeInTheDocument();
  });
});

describe("retour sur une question", () => {
  it("garde la réponse, et rend la main au bouton « Suivant »", async () => {
    const user = await ouvrirLeSimulateur();
    await user.click(radio("Un thé"));
    await question(ACCOMPAGNEMENTS);

    await user.click(bouton("Précédent"));

    expect(radio("Un thé")).toBeChecked();
    await user.click(bouton("Suivant"));
    expect(await question(ACCOMPAGNEMENTS)).toBeInTheDocument();
  });

  it("avance aussitôt quand la réponse change", async () => {
    const user = await ouvrirLeSimulateur();
    await user.click(radio("Un thé"));
    await question(ACCOMPAGNEMENTS);
    await user.click(bouton("Précédent"));

    await user.click(radio("Un café"));

    expect(await question(ACCOMPAGNEMENTS)).toBeInTheDocument();
  });

  it("n'a pas de « Précédent » sur la première page", async () => {
    await ouvrirLeSimulateur();
    await question(BOISSON);
    expect(sansBouton("Précédent")).toBe(true);
  });
});

describe("brouillon d'une page", () => {
  it("« Précédent » l'abandonne : une saisie non validée ne compte pas", async () => {
    const user = await ouvrirLeSimulateur();
    await user.click(radio("Un thé"));
    await question(ACCOMPAGNEMENTS);
    await user.click(caseACocher("Du lait"));

    await user.click(bouton("Précédent"));
    await user.click(bouton("Suivant"));

    await question(ACCOMPAGNEMENTS);
    expect(caseACocher("Du lait")).not.toBeChecked();
  });

  it("une page validée rouvre telle qu'elle a été quittée", async () => {
    const user = await ouvrirLeSimulateur();
    await allerAuResultat(user);

    await user.click(bouton("Précédent"));

    await question(ACCOMPAGNEMENTS);
    expect(caseACocher("Du lait")).toBeChecked();
  });
});

describe("choix multiple", () => {
  it("l'option exclusive décoche les autres, et inversement", async () => {
    const user = await ouvrirLeSimulateur();
    await user.click(radio("Un thé"));
    await question(ACCOMPAGNEMENTS);
    await user.click(caseACocher("Du lait"));
    await user.click(caseACocher("Du sucre"));

    await user.click(caseACocher("Rien de plus"));
    expect(caseACocher("Du lait")).not.toBeChecked();
    expect(caseACocher("Du sucre")).not.toBeChecked();

    await user.click(caseACocher("Du sucre"));
    expect(caseACocher("Rien de plus")).not.toBeChecked();
  });
});

describe("séquence du parcours", () => {
  it("ne pose pas une question sans objet", async () => {
    const user = await ouvrirLeSimulateur();
    await question(BOISSON);

    await user.click(radio("Rien"));

    expect(await screen.findByText("Commande : aucune")).toBeInTheDocument();
  });

  it("efface la réponse qui dépendait d'une réponse changée", async () => {
    const user = await ouvrirLeSimulateur();
    await allerAuResultat(user);
    await user.click(bouton("Précédent"));
    await user.click(bouton("Précédent"));

    await user.click(radio("Un café"));

    await question(ACCOMPAGNEMENTS);
    expect(caseACocher("Du lait")).not.toBeChecked();
    expect(bouton("Suivant")).toBeDisabled();
  });

  it("le stepper compte des parties, pas des pages", async () => {
    const user = await ouvrirLeSimulateur();
    const etape = { name: "Étape 1 sur 2" };
    expect(await screen.findByRole("heading", etape)).toBeInTheDocument();

    await user.click(radio("Un thé"));
    await question(ACCOMPAGNEMENTS);

    expect(screen.getByRole("heading", etape)).toBeInTheDocument();
  });
});
