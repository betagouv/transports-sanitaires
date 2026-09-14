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
// Une situation complète, qui conclut sur une prescription. La v9.5.1 employait
// ici l'urgence vitale, quatrième réponse de Q1 qui tranchait la Partie 1 ; la
// v9.7 a retiré cette réponse comme le cas final « SMUR ».
const PRESCRIPTION = {
  ...BASE_NEUTRE,
  p2_raison_principale: "'Entrée en hospitalisation'",
};
const BARIATRIQUE = {
  ...BASE_NEUTRE,
  p1_m0_bariatrique: "oui",
  p1_m0_aucun: "non",
};

describe("secrétariat — parcours administratif", () => {
  it("la première question porte le rappel sur la portée de la Partie 2, et elle seule", async () => {
    const user = userEvent.setup({ delay: null });
    emettrePassation(PARTIE_1_AMBULANCE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    // La v9.7 ouvre la Partie 2 sur la raison principale, un choix unique de
    // douze réponses, là où la v9.5.1 posait une mosaïque de contextes.
    const rappel = /ne peuvent pas modifier le mode de transport/i;
    const raison = /raison principale du déplacement/i;
    expect(screen.getByRole("group", { name: raison })).toBeInTheDocument();
    expect(screen.getByText(rappel)).toBeInTheDocument();

    await repondrePage(user, [[raison, /entrée en hospitalisation/i]]);
    expect(
      await screen.findByRole("group", { name: /type d’hospitalisation/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: raison })).toBeNull();
    expect(screen.queryByText(rappel)).toBeNull();
  });

  it("sans passation : invite à commencer par l'évaluation médicale", () => {
    render(<Secretariat onNouvelleSimulation={() => {}} />);
    expect(
      screen.getByRole("heading", { name: /aucune prescription en attente/i }),
    ).toBeInTheDocument();
  });

  it("situation complète : affiche directement la Page Résultat 2", () => {
    // Par le raccourci `situationFinale` : une passation, elle, rouvrirait le
    // questionnaire, dont il reste toujours les saisies facultatives d'adresse.
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={PRESCRIPTION}
      />,
    );

    // Bloc 1 — résultat final.
    expect(
      screen.getByRole("heading", {
        name: /votre transport peut être pris en charge/i,
      }),
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
    // Deux fois : le verdict nomme le document, la fiche du corps médical aussi.
    expect(
      screen.getAllByText(/document à remettre au patient/i).length,
    ).toBeGreaterThan(0);
  });

  // La v9.5.1 donnait à la contrainte bariatrique seule un cas final à elle,
  // avec son verdict et sa consigne d'orientation. La v9.7 l'a retiré : le
  // parcours va jusqu'au bout, et c'est l'absence de motif qui conclut.
  it("cas défavorable sans droit ouvert : reste à charge et deux conditions", () => {
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={BARIATRIQUE}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /ne peut pas être remboursé/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /prise en charge \/ reste à charge/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/le transport reste à votre charge/i).length,
    ).toBeGreaterThan(0);
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
            "'Nécessite une prise en charge spécifique pendant le trajet, une aide d’un professionnel pour se déplacer ou, en l’absence d’un proche accompagnant, pour transmettre les informations nécessaires à l’équipe soignante.'",
          p1_critere_position_allongee_demi_assise: "oui",
          p1_critere_aucun: "non",
          p2_raison_principale: "'Entrée en hospitalisation'",
        }}
      />,
    );

    // On est bien sur le cas PMT (ambulance).
    expect(
      screen.getByRole("heading", {
        name: /votre transport peut être pris en charge/i,
      }),
    ).toBeInTheDocument();

    // La case validée, et elle seule. Il n'existe pas de case « Ambulance » sur
    // les trois Cerfa : le mode se déclare par ses justifications, et la v9.7
    // ne rend celles-ci vraies que sous une ambulance.
    expect(
      screen.getByText("Ambulance : position allongée ou demi-assise."),
    ).toBeInTheDocument();

    // Cases non établies par la simulation : absentes.
    expect(
      screen.queryByText(
        "Ambulance : surveillance par une personne qualifiée.",
      ),
    ).toBeNull();
    expect(
      screen.queryByText("Ambulance : administration d’oxygène."),
    ).toBeNull();
    expect(screen.queryByText(/transport assis professionnalisé/i)).toBeNull();
    expect(screen.queryByText("Moyen de transport individuel.")).toBeNull();
    expect(screen.queryByText("Personne accompagnante.")).toBeNull();
  });

  it("Bloc 3 : coche l'accompagnant quand Q1 désigne un proche", () => {
    // La ligne suit `cible_personne_accompagnante` depuis la v9.7, et le Cerfa
    // ne l'offre que sous l'accolade « moyen individuel / transport en commun ».
    // Le test précédent la vérifie absente sur un besoin professionnel ; ici
    // c'est la seule réponse de Q1 qui la fait apparaître.
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={{
          ...BASE_NEUTRE,
          p1_autonomie:
            "'Nécessite l’accompagnement d’un proche pour se déplacer ou transmettre les informations nécessaires à l’équipe soignante, sans intervention d’un professionnel pendant le transport.'",
          p2_raison_principale: "'Entrée en hospitalisation'",
        }}
      />,
    );

    expect(screen.getByText("Personne accompagnante.")).toBeInTheDocument();
  });

  it("raccourci `situationFinale` : ouvre directement la Page Résultat 2, sans passation", () => {
    // Aucune passation émise : sans le raccourci, le secrétariat afficherait
    // « aucune prescription ». Une situation complète en `situationFinale`
    // court-circuite le parcours et rend le résultat final.
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={PRESCRIPTION}
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: /votre transport peut être pris en charge/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: /aucune prescription en attente/i,
      }),
    ).toBeNull();
  });

  // ACCOMPAGNANT-UI-001 du livrable : A3.8 a disparu en v9.5.0, et le besoin d'un
  // proche se déduit depuis de la deuxième réponse de Q1. La v9.5.0 en tirait
  // aussi une cause d'accord préalable ; la v9.5.1 la retire. Reste une donnée
  // médicale, qu'aucune vue administrative ne redemande et qui ne pèse plus sur
  // le document conclu.
  it("ACCOMPAGNANT-UI-001 : le besoin d'un proche n'est ni redemandé ni cause de DAP", async () => {
    const user = userEvent.setup({ delay: null });
    emettrePassation({
      ...PARTIE_1_AMBULANCE,
      p1_autonomie:
        "'Nécessite l’accompagnement d’un proche pour se déplacer ou transmettre les informations nécessaires à l’équipe soignante, sans intervention d’un professionnel pendant le transport.'",
      p1_critere_oxygene: "non",
      // Aucun critère coché : la sortie exclusive de Q1.1 reprend sa place, sans
      // quoi la mosaïque reste sans réponse et la Partie 1 ne conclut pas.
      p1_critere_aucun: "oui",
    });
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    const posees: string[] = [];
    await terminerParcours(
      user,
      [[/raison principale du déplacement/i, /entrée en hospitalisation/i]],
      () => {
        for (const groupe of screen.queryAllByRole("group"))
          posees.push(groupe.textContent ?? "");
      },
    );

    expect(
      posees.filter((pose) => /assistance d’un tiers/i.test(pose)),
    ).toEqual([]);
    // Ni cause d'accord préalable : le document conclu est une prescription, et
    // l'accompagnement n'y figure que comme case à cocher du mode de transport.
    expect(screen.queryAllByText(/assistance d’un tiers/i)).toEqual([]);
    expect(
      screen.getByRole("heading", {
        name: /votre transport peut être pris en charge/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^personne accompagnante\.$/i)).toBeInTheDocument();
  }, 40_000);

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
  }, 40_000);
});
