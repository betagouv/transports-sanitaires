// L'impression du Résultat 2, et la date qu'elle porte.
//
// Le contrat de la v9.7 demande trois choses, et le guide les redit à sa recette
// (§ 7, point 5) : l'impression est **toujours** offerte, quel que soit le cas
// final ; elle ne pose aucune question d'identité, de RPPS, de structure ni de
// signature ; et quand aucun CERFA n'est dû, c'est cette page qui s'imprime — une
// synthèse, jamais une prescription factice.
//
// La date, elle, ne vient pas du modèle : « Le moteur ne lit jamais une date
// système implicite ». C'est l'application qui la pose, à l'arrivée sur cet
// écran, en heure de Paris.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { dateDePrescription } from "../../front/simulateur/secretariat/date-de-prescription";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";

beforeEach(() => sessionStorage.clear());

/** Une situation par cas final que le Résultat 2 sait afficher. */
const SITUATIONS: ReadonlyArray<[nom: string, situation: object]> = [
  [
    "une prescription",
    { ...BASE_NEUTRE, p2_raison_principale: "'Entrée en hospitalisation'" },
  ],
  ["un refus, qui n’ouvre aucun document", { ...BASE_NEUTRE }],
  [
    "un transport à la charge de l’établissement",
    {
      ...BASE_NEUTRE,
      p2_raison_principale:
        "'Transfert d’un patient hospitalisé vers un autre établissement de santé'",
      p2_transfert_en_cours: "oui",
      p2_nature_transfert: "'Définitif'",
    },
  ],
];

describe("l’impression du Résultat 2", () => {
  it.each(SITUATIONS)("est offerte pour %s", (_nom, situation) => {
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={situation}
      />,
    );
    expect(
      screen.getByRole("button", { name: /^imprimer$/i }),
    ).toBeInTheDocument();
  });

  it("n’ajoute aucune question d’identité, de RPPS ni de signature", () => {
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={{
          ...BASE_NEUTRE,
          p2_raison_principale: "'Entrée en hospitalisation'",
        }}
      />,
    );
    // Le contrat les laisse hors du questionnaire et hors des gardes : l'écran
    // ne doit rien réclamer de plus avant de pouvoir imprimer.
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(screen.queryByText(/RPPS|signature/i)).toBeNull();
  });

  it("appelle l’impression du navigateur, sans quitter la page", async () => {
    const imprimer = vi.fn();
    vi.stubGlobal("print", imprimer);
    const user = userEvent.setup();
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={{
          ...BASE_NEUTRE,
          p2_raison_principale: "'Entrée en hospitalisation'",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^imprimer$/i }));
    expect(imprimer).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("porte la date du jour, et la même à chaque relecture", () => {
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={{
          ...BASE_NEUTRE,
          p2_raison_principale: "'Entrée en hospitalisation'",
        }}
      />,
    );
    expect(
      screen.getByText(dateDePrescription(), { exact: false }),
    ).toBeInTheDocument();
  });
});

describe("la date de prescription", () => {
  it("se prend en heure de Paris, et non en heure du navigateur", () => {
    // 22 h 30 UTC le 8 septembre, c'est déjà le 9 à Paris. Un calcul en UTC
    // daterait la prescription de la veille.
    expect(dateDePrescription(new Date("2026-09-08T22:30:00Z"))).toBe(
      "09/09/2026",
    );
    expect(dateDePrescription(new Date("2026-09-08T10:00:00Z"))).toBe(
      "08/09/2026",
    );
  });
});
