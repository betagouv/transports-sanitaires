// Le résultat des cinq issues sans fiche patient, tel qu'il s'affiche (#133).
// Chaque seed est affichée par `Eligibilite`, comme le socle le fait : le
// titre de l'issue et un texte de l'éditeur doivent y figurer. Les textes
// viennent du catalogue, chargé à la demande derrière un `Suspense`.

import { act, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { catalogueResultats } from "../../../front/models/eligibilite/catalogue-resultats";
import { Eligibilite } from "../../../front/models/eligibilite/Resultats";
import { SEEDS } from "../../../front/models/eligibilite/seeds-catalogue";
import { ciblesDe } from "./reponses-de-la-permission";

// Le premier chargement du catalogue (900 ko) est long : il se fait avant les
// tests, que le temps d'un `findBy` ne mesure pas.
await catalogueResultats();

const afficher = async (id: string) => {
  const seed = SEEDS.find((candidate) => candidate.id === id);
  if (!seed) throw new Error(`Seed inconnue : ${id}`);
  await act(async () => {
    render(
      <Eligibilite answers={seed.answers} cibles={ciblesDe(seed.answers)} />,
    );
  });
};

// La seed, le titre de l'issue, un texte du scénario, une action.
const CAS: readonly [string, string, string, string][] = [
  [
    "issue-caisse",
    "Un point précis reste à vérifier auprès de l’Assurance Maladie",
    "L’effet de la demande du Centre 15 doit être clarifié",
    "Contacter l’Assurance Maladie et faire préciser le financeur, l’éventuel accord et la pièce à utiliser.",
  ],
  [
    "issue-etablissement",
    "Ce transport relève de la prise en charge de l’établissement",
    "Situation retenue",
    "Contacter le service prescripteur ou la cellule de coordination des transports de l’établissement d’origine.",
  ],
  [
    "issue-permission-patient",
    "Le transport lié à cette permission est à la charge du patient",
    "Qualification de la permission",
    "Ne pas éditer de prescription PMT/DAP Assurance Maladie pour ce trajet.",
  ],
  [
    "issue-convocation",
    "Ce déplacement relève d’une convocation ou d’un appareillage réglementaire",
    "Situation reconnue",
    "Vérifier que la convocation ou l’avis mentionne bien la date, le lieu et l’objet du déplacement.",
  ],
  [
    "issue-dap-etranger-a-examiner",
    "La prise en charge de ce transport à l’étranger doit être examinée par l’Assurance Maladie",
    "Une demande d’examen du transport",
    "Contacter la caisse du patient avant l’organisation du transport pour faire préciser les conditions de prise en charge et les justificatifs attendus.",
  ],
];

describe.each(CAS)("la page de la seed %s", (id, titre, element, action) => {
  it("donne le titre de l'issue, puis le texte de l'éditeur", async () => {
    await afficher(id);
    expect(
      await screen.findByRole("heading", { level: 2, name: titre }),
    ).toBeInTheDocument();
    expect(screen.getByText(element)).toBeInTheDocument();
    expect(screen.getByText(action)).toBeInTheDocument();
  });

  it("n'est pas une fiche patient", async () => {
    await afficher(id);
    await screen.findByRole("heading", { level: 2, name: titre });
    expect(screen.queryByText(/fiche patient/i)).not.toBeInTheDocument();
  });
});

describe("la page de la caisse", () => {
  it("transmet les questions à la caisse", async () => {
    await afficher("issue-caisse");
    expect(
      await screen.findByRole("heading", {
        name: "Questions à transmettre à la caisse",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Quel financeur et quel document doivent être retenus pour ce cas précis ?",
      ),
    ).toBeInTheDocument();
  });
});

describe("la page du transport à l'étranger", () => {
  it("garde la mise en garde de l'éditeur, sans note de publication", async () => {
    await afficher("issue-dap-etranger-a-examiner");
    expect(
      await screen.findByText(/N’appliquez pas la règle d’accord tacite/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/avant publication/)).not.toBeInTheDocument();
  });
});

describe("une issue qui aura sa fiche patient", () => {
  it("montre encore ce que les règles ont calculé", async () => {
    await afficher("issue-pmt");
    expect(screen.getByText("ISSUE_PMT")).toBeInTheDocument();
  });
});
