import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { emettrePassation } from "../../front/simulateur/passation";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { PARTIE_1_AMBULANCE, repondrePage, terminerParcours } from "./parcours";

beforeEach(() => sessionStorage.clear());

// Les situations partent de la base neutre du catalogue de seeds : une réponse
// oubliée y laisserait des cibles indécises, et le résultat final vide.
const SMUR = {
  ...BASE_NEUTRE,
  // Depuis la v9.5.0, l'urgence vitale est la quatrième réponse de Q1 : elle
  // tranche sans passer par M0, qu'elle rend inapplicable.
  p1_autonomie:
    "'Est en situation d’urgence vitale nécessitant un transport médicalisé par une équipe SMUR (Structure Mobile d’Urgence et de Réanimation).'",
};
const BARIATRIQUE = {
  ...BASE_NEUTRE,
  p1_m0_bariatrique: "oui",
  p1_m0_aucun: "non",
};

describe("secrétariat — parcours administratif", () => {
  it("M1.1 porte le rappel sur la portée de la Partie 2, et elle seule", async () => {
    const user = userEvent.setup({ delay: null });
    emettrePassation(PARTIE_1_AMBULANCE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    const rappel = /ne peuvent pas modifier le mode de transport/i;
    const contexte = /dans quel contexte/i;
    expect(screen.getByRole("group", { name: contexte })).toBeInTheDocument();
    expect(screen.getByText(rappel)).toBeInTheDocument();

    await repondrePage(user, [
      [contexte, /entrée ou sortie d’une hospitalisation/i],
    ]);
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));
    expect(screen.queryByRole("group", { name: contexte })).toBeNull();
    expect(screen.queryByText(rappel)).toBeNull();
  });

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
    expect(
      screen.queryByText("Personne accompagnante si nécessaire."),
    ).toBeNull();
  });

  it("Bloc 3 : coche l'accompagnant quand Q1 désigne un proche", () => {
    // La ligne suit `cible_accompagnant_necessaire`, réintroduite en v9.2.1.
    // Le test précédent la vérifie absente sur un besoin professionnel ; ici
    // c'est la seule réponse de Q1 qui la fait apparaître.
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={{
          ...BASE_NEUTRE,
          p1_autonomie:
            "'Nécessite l’accompagnement d’un proche pour se déplacer ou transmettre les informations nécessaires à l’équipe soignante, sans intervention d’un professionnel pendant le transport.'",
          p2_contexte_hospitalisation: "oui",
          p2_contexte_aucun: "non",
        }}
      />,
    );

    expect(
      screen.getByText("Personne accompagnante si nécessaire."),
    ).toBeInTheDocument();
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

  // ACCOMPAGNANT-UI-001 du livrable : A3.8 a disparu en v9.5.0. L'accompagnement
  // se déduit de la deuxième réponse de Q1, et le motif de DAP avec lui — sans
  // qu'aucune vue administrative ne vienne le redemander.
  it("ACCOMPAGNANT-UI-001 : aucune vue ne redemande l'accompagnement par un tiers", async () => {
    const user = userEvent.setup({ delay: null });
    emettrePassation({
      ...PARTIE_1_AMBULANCE,
      p1_autonomie:
        "'Nécessite l’accompagnement d’un proche pour se déplacer ou transmettre les informations nécessaires à l’équipe soignante, sans intervention d’un professionnel pendant le transport.'",
      p1_critere_oxygene: "non",
    });
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    const posees: string[] = [];
    await terminerParcours(
      user,
      [[/dans quel contexte/i, /entrée ou sortie d’une hospitalisation/i]],
      () => {
        for (const groupe of screen.queryAllByRole("group"))
          posees.push(groupe.textContent ?? "");
      },
    );

    expect(
      posees.filter((pose) => /assistance d’un tiers/i.test(pose)),
    ).toEqual([]);
    // Le motif est bien retenu pour autant : il vient de Q1, pas d'une question.
    expect(
      screen.getAllByText(/assistance d’un tiers/i).length,
    ).toBeGreaterThan(0);
  }, 20_000);

  it("traverse la Partie 2 jusqu'au résultat, saisies d'adresse comprises", async () => {
    // Le seul test qui parcourt la Partie 2 de bout en bout : c'est lui qui voit
    // les douze saisies libres d'adresse (D1-D12), rendues en champs texte.
    //
    // `delay: null` : sans lui, la temporisation par défaut de user-event
    // s'ajoute aux 200 ms d'avancement automatique de chaque page à choix
    // unique, et le parcours entier ne tient plus dans le délai d'un test.
    const user = userEvent.setup({ delay: null });
    // La passation ne porte que la Partie 1 : reprendre la base neutre entière
    // répondrait aussi à la Partie 2, et il n'y aurait plus rien à demander.
    emettrePassation(PARTIE_1_AMBULANCE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    await terminerParcours(user, [
      [/dans quel contexte/i, /entrée ou sortie d’une hospitalisation/i],
    ]);

    expect(
      screen.getByRole("heading", { name: /document à imprimer/i }),
    ).toBeInTheDocument();
  }, 20_000);
});
