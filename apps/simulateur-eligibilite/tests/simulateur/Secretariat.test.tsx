import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { emettrePassation } from "../../front/simulateur/passation";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";

beforeEach(() => sessionStorage.clear());

// Les situations partent de la base neutre du catalogue de seeds : une réponse
// oubliée y laisserait des cibles indécises, et le résultat final vide.
const SMUR = { ...BASE_NEUTRE, p1_m0_smur: "oui", p1_m0_aucun: "non" };
const BARIATRIQUE = {
  ...BASE_NEUTRE,
  p1_m0_bariatrique: "oui",
  p1_m0_aucun: "non",
};

describe("secrétariat — parcours administratif", () => {
  it("sans passation : invite à commencer par l'évaluation médicale", () => {
    render(<Secretariat onNouvelleSimulation={() => {}} />);
    expect(
      screen.getByRole("heading", { name: /aucune prescription en attente/i }),
    ).toBeInTheDocument();
  });

  it("cas tranché dès la Partie 1 (SMUR) : affiche directement la Page Résultat 2", () => {
    emettrePassation(SMUR);
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    // Bloc 1 — résultat final (titre du cas SMUR).
    expect(
      screen.getByRole("heading", { name: /transport par équipe SMUR/i }),
    ).toBeInTheDocument();
    // Bloc 2 — information destinée au patient, avec les étapes.
    expect(
      screen.getByRole("heading", { name: /information destinée au patient/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /ce que vous devez faire maintenant/i,
      }),
    ).toBeInTheDocument();
    // Bloc 3 — informations pour le corps médical, avec le document (en texte).
    expect(
      screen.getByRole("heading", {
        name: /informations pour le corps médical/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/document à remettre au patient/i),
    ).toBeInTheDocument();
  });

  it("cas défavorable sans transport (bariatrique) : bloc patient sur les deux conditions et reste à charge", () => {
    emettrePassation(BARIATRIQUE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    // Bloc 1 — aucun transport prescrit.
    expect(
      screen.getByRole("heading", {
        name: /au titre du seul motif « bariatrique »/i,
      }),
    ).toBeInTheDocument();
    // Bloc 2 — variante « aucun transport » : rappel des deux conditions, pas de
    // section critères retenus.
    expect(
      screen.getByText(/deux éléments doivent être réunis/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /critères médicaux retenus/i }),
    ).toBeNull();
    expect(
      screen.getByRole("heading", {
        name: /prise en charge \/ reste à charge/i,
      }),
    ).toBeInTheDocument();
    // Bloc 3 — cas retenu détaillé pour le corps médical.
    expect(
      screen.getByText(/contrainte bariatrique seule insuffisante/i),
    ).toBeInTheDocument();
  });

  it("Bloc 3 « Mode de transport » : ne liste que les cases validées par la simulation", () => {
    // Cas succès (PMT, transport déduit = ambulance via critère « position
    // allongée »). La section « Mode de transport » ne doit afficher que les
    // cases établies par la simulation, pas la liste complète.
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={{
          ...BASE_NEUTRE,
          // Un besoin professionnel et le seul critère « position allongée » :
          // l'ambulance est justifiée par lui et par lui seul.
          p1_autonomie:
            "'Nécessite une prise en charge spécifique pendant le trajet ou l’aide d’un professionnel pour se déplacer ou accomplir les formalités liées au transport.'",
          p1_critere_position_allongee_demi_assise: "oui",
          p2_contexte_hospitalisation: "oui",
          p2_contexte_aucun: "non",
        }}
      />,
    );

    // On est bien sur le cas PMT (ambulance).
    expect(
      screen.getByRole("heading", {
        name: /vous êtes éligible à une prise en charge/i,
      }),
    ).toBeInTheDocument();

    // Cases validées affichées.
    expect(screen.getByText("Ambulance.")).toBeInTheDocument();
    expect(
      screen.getByText("Position allongée ou demi-assise."),
    ).toBeInTheDocument();

    // Cases non établies par la simulation : absentes.
    expect(
      screen.queryByText("Surveillance par une personne qualifiée."),
    ).toBeNull();
    expect(screen.queryByText("Administration d’oxygène.")).toBeNull();
    expect(screen.queryByText("VSL ou taxi conventionné.")).toBeNull();
    expect(screen.queryByText("Moyen de transport individuel.")).toBeNull();
  });

  it("raccourci `situationFinale` : ouvre directement la Page Résultat 2, sans passation", () => {
    // Aucune passation émise : sans le raccourci, le secrétariat afficherait
    // « aucune prescription ». Une situation complète en `situationFinale`
    // court-circuite le parcours et rend le résultat final.
    render(
      <Secretariat onNouvelleSimulation={() => {}} situationFinale={SMUR} />,
    );

    expect(
      screen.getByRole("heading", { name: /transport par équipe SMUR/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: /aucune prescription en attente/i,
      }),
    ).toBeNull();
  });
});
