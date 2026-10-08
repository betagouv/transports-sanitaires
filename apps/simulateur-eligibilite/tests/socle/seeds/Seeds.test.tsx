import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Seeds } from "../../../front/socle/seeds/Seeds";
import type { Seed } from "../../../front/socle/seeds/seed";
import { modeleDeTest } from "../modele-de-test";
import {
  ACCOMPAGNEMENTS,
  bouton,
  caseACocher,
  ouvrirLeSimulateur,
  question,
  sansBouton,
} from "../simulateur/questionnaire";

// L'écran des seeds liste les seeds reçues, dit si la préconisation confirme leurs
// attendus, et ouvre l'écran correspondant. Le catalogue est vide : les seeds
// sont écrites ici, sur le questionnaire factice.

const THE_AU_LAIT: Seed = {
  id: "the-au-lait",
  label: "Résultat : un thé au lait",
  description: "Situation complète.",
  answers: { boisson: "the", accompagnements: ["lait"] },
  expected: { commande: "thé, lait" },
};

const ATTENDU_DEMENTI: Seed = {
  id: "attendu-dementi",
  label: "Résultat : un café annoncé à tort",
  description: "L'attendu contredit la décision.",
  answers: { boisson: "the", accompagnements: ["aucun"] },
  expected: { commande: "café" },
};

const ARRETEE_EN_CHEMIN: Seed = {
  id: "arretee-en-chemin",
  label: "Questionnaire : les accompagnements",
  description: "S'arrête avant la deuxième question.",
  answers: { boisson: "cafe" },
  expected: {},
};

const DEUX_TASSES: Seed = {
  id: "deux-tasses",
  label: "Commande complétée : deux thés au lait",
  description: "Répond aussi à la question d'après le verrou.",
  answers: { boisson: "the", accompagnements: ["lait"], quantite: 2 },
  expected: { commande: "thé, lait" },
};

const SEEDS = [THE_AU_LAIT, ATTENDU_DEMENTI, ARRETEE_EN_CHEMIN, DEUX_TASSES];

// L'écran rendu seul : le modèle de test, et aucune action.
const SANS_ACTION = { model: modeleDeTest, onOpen: () => {}, onBack: () => {} };

const ouvrir = (seed: Seed) => bouton(`Ouvrir : ${seed.label}`);

async function ouvrirLesSeeds() {
  const user = await ouvrirLeSimulateur({ produit: true, seeds: SEEDS });
  await user.click(await screen.findByRole("button", ECRAN_SEEDS));
  await screen.findByRole("heading", ECRAN_SEEDS);
  return user;
}

const ECRAN_SEEDS = { name: "Seeds" } as const;

describe("écran des seeds", () => {
  it("range les seeds selon l'écran où leurs réponses mènent", () => {
    render(<Seeds seeds={SEEDS} {...SANS_ACTION} />);

    const [resultat, questionnaire] = screen.getAllByRole("table") as [
      HTMLElement,
      HTMLElement,
    ];
    expect(within(resultat).getAllByRole("button")).toHaveLength(3);
    expect(within(questionnaire).getAllByRole("button")).toHaveLength(1);
  });

  it("dit quelles seeds la décision dément", () => {
    render(<Seeds seeds={SEEDS} {...SANS_ACTION} />);

    expect(
      screen.getByText(
        `1 seed(s) en écart avec leurs attendus : ${ATTENDU_DEMENTI.label}.`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("écart")).toBeInTheDocument();
    expect(screen.getAllByText("conforme")).toHaveLength(3);
  });

  it("annonce un catalogue vide plutôt que des tableaux sans ligne", () => {
    render(<Seeds seeds={[]} {...SANS_ACTION} />);

    expect(screen.getByText(/^Le catalogue est vide/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("ouverture d'une seed", () => {
  it("une seed complète ouvre son résultat, questionnaire derrière elle", async () => {
    const user = await ouvrirLesSeeds();

    await user.click(ouvrir(THE_AU_LAIT));
    expect(await screen.findByText("Commande : thé, lait")).toBeInTheDocument();

    await user.click(bouton("Précédent"));
    await question(ACCOMPAGNEMENTS);
    expect(caseACocher("Du lait")).toBeChecked();
  });

  it("une seed qui répond après le verrou ouvre le second résultat, verrou franchi", async () => {
    const user = await ouvrirLesSeeds();

    await user.click(ouvrir(DEUX_TASSES));
    expect(
      await screen.findByText("Commande : thé, lait, 2 tasses"),
    ).toBeInTheDocument();

    await user.click(bouton("Précédent"));
    expect(screen.getByRole("spinbutton")).toHaveValue(2);
    expect(sansBouton("Précédent")).toBe(true);
  });

  it("une seed arrêtée en chemin ouvre la première page sans réponse", async () => {
    const user = await ouvrirLesSeeds();

    await user.click(ouvrir(ARRETEE_EN_CHEMIN));

    await question(ACCOMPAGNEMENTS);
    expect(caseACocher("Du lait")).not.toBeChecked();
    expect(bouton("Précédent")).toBeInTheDocument();
  });
});
