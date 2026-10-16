// La fiche patient d'une demande d'accord préalable, telle qu'elle s'affiche
// (#136). Les seeds `issue-dap-sans-urgence` et `issue-dap-urgence-attestee`
// donnent les textes des aperçus PDF de l'éditeur, recopiés ici. Les aperçus
// HTML ne servent pas de référence : leur corps est réécrit par un script. Les
// textes viennent du catalogue, chargé à la demande derrière un `Suspense`.

import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { catalogueResultats } from "../../../front/models/eligibilite/catalogue-resultats";
import { Eligibilite } from "../../../front/models/eligibilite/Resultats";
import { SEEDS } from "../../../front/models/eligibilite/seeds-catalogue";
import { ciblesDe, type Reponses } from "./reponses-de-la-permission";

await catalogueResultats();

const afficher = async (id: string) => {
  const seed = SEEDS.find((candidate) => candidate.id === id);
  if (!seed) throw new Error(`Seed inconnue : ${id}`);
  const answers = seed.answers as Reponses;
  await act(async () => {
    render(<Eligibilite answers={answers} cibles={ciblesDe(answers)} />);
  });
  await screen.findByRole("article", { name: "Fiche explicative patient" });
};

const fiche = () =>
  within(screen.getByRole("article", { name: "Fiche explicative patient" }));

const TITRE =
  "Une prescription médicale de transport avec demande d’accord préalable va vous être remise.";
const ENVOI =
  "Si le professionnel qui vous a remis la demande d’accord préalable ne l’a pas déjà envoyée, adressez dès que possible les volets 1 et 2 du document sous enveloppe au service médical de votre caisse d’assurance maladie, à l’attention du médecin-conseil. Vous trouverez l’adresse sur ";
const DIALYSE =
  "Votre déplacement est lié à une séance de dialyse, prise en compte comme une hospitalisation pour le transport.";
const BADGES = [
  "Transport non partagé",
  "Aide professionnelle pour se déplacer",
  "Risque de malaise ou de complications pendant le trajet",
];

describe("la fiche de la seed issue-dap-sans-urgence (dialyse à plus de 150 km)", () => {
  it("donne le titre du patient et celui du prescripteur", async () => {
    await afficher("issue-dap-sans-urgence");
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Votre transport sanitaire peut être pris en charge sous réserve de l’accord préalable de l’Assurance Maladie",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Le transport sanitaire de votre patient peut être pris en charge sous réserve de l’accord préalable de l’Assurance Maladie",
      }),
    ).toBeInTheDocument();
  });

  it("garde le bloc du prescripteur hors de l'impression, pas la fiche", async () => {
    await afficher("issue-dap-sans-urgence");
    expect(
      screen.getByRole("region", { name: "Résultat pour le praticien" }),
    ).toHaveClass("fr-no-print");
    expect(
      screen.getByRole("article", { name: "Fiche explicative patient" }),
    ).not.toHaveClass("fr-no-print");
  });

  it("dit la dialyse, puis pourquoi l'accord est nécessaire", async () => {
    await afficher("issue-dap-sans-urgence");
    expect(
      fiche().getByText(
        `${DIALYSE} La prise en charge de votre transport nécessite l’accord préalable de l’Assurance Maladie car le trajet dépasse 150 km.`,
      ),
    ).toBeInTheDocument();
  });

  it("donne l'introduction une seule fois, avec le délai de 15 jours", async () => {
    await afficher("issue-dap-sans-urgence");
    expect(fiche().getAllByRole("heading", { name: TITRE })).toHaveLength(1);
    expect(
      fiche().getByText(/^Si le professionnel qui vous a remis la demande/),
    ).toHaveTextContent(`${ENVOI}ameli.fr.`);
    expect(
      fiche().getByText(
        "L’absence de réponse dans les 15 jours à compter de l’envoi de la demande vaut accord. En cas de refus, vous recevez un courrier de l’Assurance Maladie.",
      ),
    ).toBeInTheDocument();
    expect(
      fiche().getByText(
        "Attendez l’accord avant d’effectuer votre transport. Un accord reçu avant la fin des 15 jours permet de réaliser le transport plus tôt.",
      ),
    ).toBeInTheDocument();
  });

  it("ouvre le lien d'ameli.fr dans une nouvelle fenêtre, sans HTML injecté", async () => {
    await afficher("issue-dap-sans-urgence");
    const lien = fiche()
      .getAllByRole("link", { name: "ameli.fr" })
      .find(
        (candidat) => candidat.getAttribute("href") === "https://www.ameli.fr/",
      );
    expect(lien).toBeDefined();
    if (!lien) return;
    expect(lien).toHaveAttribute("target", "_blank");
    expect(lien).toHaveAttribute("rel", "noopener noreferrer");
    expect(fiche().queryByText(/<br>|\[INTRO\]/)).toBeNull();
  });

  it("donne les deux étapes, le motif et les badges", async () => {
    await afficher("issue-dap-sans-urgence");
    expect(
      fiche().getByRole("heading", { name: "1. Dès votre rendez-vous fixé" }),
    ).toBeInTheDocument();
    expect(
      fiche().getByRole("heading", { name: "2. Le jour du transport" }),
    ).toBeInTheDocument();
    expect(
      fiche().getByText(
        `que votre transport sera pris en charge par l’Assurance Maladie au titre d’un transport lié à une séance de dialyse, prise en compte comme une hospitalisation pour le transport, sur un trajet de plus de 150 km ;`,
      ),
    ).toBeInTheDocument();
    const liste = fiche().getByRole("list", {
      name: "Besoins particuliers à signaler lors de la réservation",
    });
    expect(
      within(liste)
        .getAllByRole("listitem")
        .map((badge) => badge.textContent),
    ).toEqual(BADGES);
  });

  it("donne le rappel d'attente, puis le bloc des frais", async () => {
    await afficher("issue-dap-sans-urgence");
    const rappel = fiche().getByText(
      "La prise en charge de votre transport nécessite l’accord préalable de l’Assurance Maladie. Sans réponse dans les 15 jours suivant l’envoi de votre demande, l’accord est considéré comme obtenu. Attendez cet accord avant d’effectuer le transport.",
    );
    const frais = fiche().getByRole("heading", { name: "Le saviez-vous ?" });
    expect(
      rappel.compareDocumentPosition(frais) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("la fiche de la seed issue-dap-urgence-attestee (urgence attestée en Q2.3.4)", () => {
  it("donne le titre sans réserve d'accord", async () => {
    await afficher("issue-dap-urgence-attestee");
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Votre transport sanitaire peut être pris en charge par l’Assurance Maladie",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Le transport sanitaire de votre patient peut être pris en charge par l’Assurance Maladie",
      }),
    ).toBeInTheDocument();
  });

  it("dit la distance, puis la dispense d'attendre", async () => {
    await afficher("issue-dap-urgence-attestee");
    expect(
      fiche().getByText(
        `${DIALYSE} Votre trajet dépasse 150 km. L’urgence étant attestée par votre médecin, vous pouvez effectuer ce transport sans attendre l’accord préalable de l’Assurance Maladie.`,
      ),
    ).toBeInTheDocument();
  });

  it("donne l'introduction de l'urgence, sans délai d'attente", async () => {
    await afficher("issue-dap-urgence-attestee");
    expect(fiche().getByRole("heading", { name: TITRE })).toBeInTheDocument();
    expect(
      fiche().getByText(
        "Votre médecin atteste l’urgence de votre transport. Vous pouvez effectuer ce transport sans attendre l’accord préalable de l’Assurance Maladie.",
      ),
    ).toBeInTheDocument();
    expect(fiche().queryByText(/15 jours/)).toBeNull();
  });

  it("ouvre sur « Aussi tôt que possible » et dit l'urgence au transporteur", async () => {
    await afficher("issue-dap-urgence-attestee");
    expect(
      fiche().getByRole("heading", { name: "1. Aussi tôt que possible" }),
    ).toBeInTheDocument();
    expect(
      fiche().getByText(
        "que l’urgence de votre transport est attestée par votre médecin ;",
      ),
    ).toBeInTheDocument();
    expect(
      fiche().getByText(
        "que votre transport pourra être pris en charge par l’Assurance Maladie, au titre d’un transport lié à une séance de dialyse, prise en compte comme une hospitalisation pour le transport, sur un trajet de plus de 150 km ;",
      ),
    ).toBeInTheDocument();
  });

  it("donne le rappel de l'urgence, pas celui de l'attente", async () => {
    await afficher("issue-dap-urgence-attestee");
    expect(
      fiche().getByText(
        "L’urgence de votre transport est attestée par votre médecin. Vous pouvez effectuer ce transport sans attendre l’accord préalable de l’Assurance Maladie.",
      ),
    ).toBeInTheDocument();
    expect(fiche().queryByText(/Attendez cet accord/)).toBeNull();
  });
});
