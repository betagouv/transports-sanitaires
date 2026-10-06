import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GalerieSeeds } from "../../front/outils-produit/seeds/GalerieSeeds";
import type { Seed } from "../../front/outils-produit/seeds/seed";
import {
  ACCOMPAGNEMENTS,
  bouton,
  caseACocher,
  ouvrirLeSimulateur,
  question,
} from "../simulateur/parcours";

// La galerie montre les seeds qu'on lui donne, dit pour chacune si la décision
// confirme ses attendus, et ouvre l'écran correspondant. Le catalogue étant
// vide, les seeds sont écrites ici, sur le parcours factice.

const THE_AU_LAIT: Seed = {
  id: "the-au-lait",
  libelle: "Résultat : un thé au lait",
  description: "Situation complète.",
  reponses: { boisson: "the", accompagnements: ["lait"] },
  attendu: { commande: "thé, lait" },
};

const ATTENDU_DEMENTI: Seed = {
  id: "attendu-dementi",
  libelle: "Résultat : un café annoncé à tort",
  description: "L'attendu contredit la décision.",
  reponses: { boisson: "the", accompagnements: ["aucun"] },
  attendu: { commande: "café" },
};

const ARRETEE_EN_CHEMIN: Seed = {
  id: "arretee-en-chemin",
  libelle: "Questionnaire : les accompagnements",
  description: "S'arrête avant la deuxième question.",
  atterrissage: "questionnaire",
  reponses: { boisson: "cafe" },
  attendu: {},
};

const SEEDS = [THE_AU_LAIT, ATTENDU_DEMENTI, ARRETEE_EN_CHEMIN];

const ouvrir = (seed: Seed) => bouton(`Ouvrir : ${seed.libelle}`);

async function ouvrirLaGalerie() {
  const user = await ouvrirLeSimulateur({ produit: true, seeds: SEEDS });
  await user.click(await screen.findByRole("button", GALERIE));
  await screen.findByRole("heading", GALERIE);
  return user;
}

const GALERIE = { name: "Galerie de seeds" } as const;

describe("écran de galerie", () => {
  it("range les seeds selon l'écran sur lequel elles atterrissent", () => {
    render(
      <GalerieSeeds seeds={SEEDS} onOuvrir={() => {}} onRetour={() => {}} />,
    );

    const [resultat, questionnaire] = screen.getAllByRole("table") as [
      HTMLElement,
      HTMLElement,
    ];
    expect(within(resultat).getAllByRole("button")).toHaveLength(2);
    expect(within(questionnaire).getAllByRole("button")).toHaveLength(1);
  });

  it("dit quelles seeds la décision dément", () => {
    render(
      <GalerieSeeds seeds={SEEDS} onOuvrir={() => {}} onRetour={() => {}} />,
    );

    expect(
      screen.getByText(
        `1 seed(s) en écart avec leurs attendus : ${ATTENDU_DEMENTI.libelle}.`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("écart")).toBeInTheDocument();
    expect(screen.getAllByText("conforme")).toHaveLength(2);
  });

  it("annonce un catalogue vide plutôt que des tableaux sans ligne", () => {
    render(<GalerieSeeds seeds={[]} onOuvrir={() => {}} onRetour={() => {}} />);

    expect(screen.getByText(/^Le catalogue est vide/)).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });
});

describe("ouverture d'une seed", () => {
  it("une seed complète ouvre son résultat, questionnaire derrière elle", async () => {
    const user = await ouvrirLaGalerie();

    await user.click(ouvrir(THE_AU_LAIT));
    expect(await screen.findByText("Commande : thé, lait")).toBeInTheDocument();

    await user.click(bouton("Précédent"));
    await question(ACCOMPAGNEMENTS);
    expect(caseACocher("Du lait")).toBeChecked();
  });

  it("une seed arrêtée en chemin ouvre la première page sans réponse", async () => {
    const user = await ouvrirLaGalerie();

    await user.click(ouvrir(ARRETEE_EN_CHEMIN));

    await question(ACCOMPAGNEMENTS);
    expect(caseACocher("Du lait")).not.toBeChecked();
    expect(bouton("Précédent")).toBeInTheDocument();
  });
});
