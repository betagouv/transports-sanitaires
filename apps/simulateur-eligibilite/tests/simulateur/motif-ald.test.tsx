// Ce que la Page Résultat 2 dit du motif ALD, dans les deux sens.
//
// Écartée, l'ALD est piégeuse pour le patient : il l'a déclarée, il s'attend à ce
// qu'elle ouvre le droit, et elle ne le fait pas. La page doit donc le lui dire —
// et dire au corps médical ce que cette conclusion ne fait pas : elle ne touche
// ni le mode médical verrouillé, ni les autres motifs réglementaires.
//
// Retenue, elle demande l'inverse : dire d'où vient le motif, et rappeler que le
// droit ne s'arrête pas là — l'acte doit encore être tarifé. C'est la traçabilité
// que la v9.5.0 ajoute, après avoir vu des ALD reconnues servir à ouvrir un droit
// que la prestation ne portait pas.
//
// Chaque bloc tient à une seule cible du modèle
// (`cible_ald_non_retenue_absence_incapacite_deficience`,
// `cible_ald_reconnue_liee_aux_soins`) ; rien ici ne rejoue la qualification.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SEEDS } from "../../front/outils-produit/seeds/catalogue";
import { type Seed, situationDe } from "../../front/outils-produit/seeds/seed";
import { ResultatFinal } from "../../front/simulateur/secretariat/ResultatFinal";

const INFORMATION_PATIENT =
  /l’absence d’incapacité ou de déficience définie par le référentiel ne permet pas de retenir l’ALD/i;
const QUALIFICATION_MEDICALE =
  /le motif ALD .* n’est pas retenu, car aucune incapacité ou déficience/i;
const TRACABILITE =
  /les soins ou examens à l’origine du déplacement concernent le traitement/i;
const RESERVE_TARIFICATION =
  /reste conditionnée au caractère tarifé et remboursable de l’acte/i;

describe("ALD non retenue faute d’incapacité ou de déficience", () => {
  it("l’explique au patient et au corps médical", () => {
    // ALD déclarée, patient autonome, aucun autre motif : le droit se referme,
    // et c'est bien l'ALD écartée qui l'explique.
    afficher("prescripteur-ald-sans-incapacite");
    expect(screen.getByText(INFORMATION_PATIENT)).toBeInTheDocument();
    expect(screen.getByText(QUALIFICATION_MEDICALE)).toBeInTheDocument();
  });

  it("n’empêche pas un autre motif d’ouvrir le droit", () => {
    // Même ALD écartée, mais une hospitalisation ouvre le droit : l'explication
    // reste affichée, et le verdict est une prescription.
    afficher("secretariat-ald-non-retenue-autre-motif");
    expect(screen.getByText(INFORMATION_PATIENT)).toBeInTheDocument();
    expect(screen.getByText(QUALIFICATION_MEDICALE)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /vous êtes éligible à une prise en charge/i,
      }),
    ).toBeInTheDocument();
  });

  it("se tait quand l’ALD est retenue", () => {
    // Un proche accompagnant caractérise l'incapacité : l'ALD est validée, et il
    // n'y a plus rien à expliquer.
    afficher("prescripteur-ald-proche-accompagnant");
    expect(screen.queryByText(INFORMATION_PATIENT)).toBeNull();
    expect(screen.queryByText(QUALIFICATION_MEDICALE)).toBeNull();
  });

  it("se tait quand aucune ALD n’est déclarée", () => {
    afficher("secretariat-prescription");
    expect(screen.queryByText(INFORMATION_PATIENT)).toBeNull();
    expect(screen.queryByText(QUALIFICATION_MEDICALE)).toBeNull();
  });
});

describe("traçabilité du motif ALD retenu", () => {
  it("dit d’où vient le motif, et ce qui reste à vérifier", () => {
    // ALD reconnue et liée aux soins, incapacité caractérisée par un proche
    // accompagnant : le motif est retenu, et le document le trace.
    afficher("prescripteur-ald-proche-accompagnant");
    expect(screen.getByText(TRACABILITE)).toBeInTheDocument();
    expect(screen.getByText(RESERVE_TARIFICATION)).toBeInTheDocument();
  });

  it("se tait quand aucun document n’est établi", () => {
    // L'ALD est bien reconnue et liée aux soins, mais le droit se referme : il
    // n'y a ni PMT ni DAP sur quoi tracer quoi que ce soit.
    afficher("prescripteur-ald-sans-incapacite");
    expect(screen.queryByText(TRACABILITE)).toBeNull();
  });

  it("se tait quand aucune ALD n’est déclarée", () => {
    afficher("secretariat-prescription");
    expect(screen.queryByText(TRACABILITE)).toBeNull();
  });
});

// ---- implémentation ----

function afficher(id: string) {
  render(
    <ResultatFinal
      situation={situationDe(seedParId(id))}
      onNouvelleSimulation={() => {}}
    />,
  );
}

function seedParId(id: string): Seed {
  const seed = SEEDS.find((candidate) => candidate.id === id);
  if (!seed) throw new Error(`seed inconnue : ${id}`);
  return seed;
}
