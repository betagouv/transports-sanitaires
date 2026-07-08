import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Simulateur } from "../../front/simulateur/Simulateur";

type User = ReturnType<typeof userEvent.setup>;
type Reponse = [RegExp, string];

function setup() {
  const user = userEvent.setup();
  render(<Simulateur />);
  return { user };
}

// Réponses menant à un patient éligible (PMT) : motif hospitalisation,
// patient autonome.
const ELIGIBLE_PMT: Reponse[] = [
  [/situations suivantes/i, "Aucune de ces situations"],
  [/hospitalisé au moment/i, "Non"],
  [/motif principal/i, "Hospitalisation ou séance assimilée"],
  [/se déplacer seul/i, "Oui"],
];

// Répond aux champs de la page courante selon `reponses`, puis met à « Non »
// tout groupe booléen resté sans réponse (pour avancer de façon déterministe).
async function repondrePage(user: User, reponses: Reponse[]) {
  for (const [re, value] of reponses) {
    const group = screen.queryByRole("group", { name: re });
    if (group) {
      const radio = within(group).queryByRole("radio", { name: value });
      if (radio) await user.click(radio);
      continue;
    }
    const combo = screen.queryByRole("combobox", { name: re });
    if (combo) await user.selectOptions(combo, value);
  }

  for (const group of screen.queryAllByRole("group")) {
    const dejaRepondu = within(group).queryByRole("radio", { checked: true });
    if (dejaRepondu) continue;
    const non = within(group).queryByRole("radio", { name: "Non" });
    if (non) await user.click(non);
  }
}

// Remplit tout le formulaire puis ouvre la page de résultats.
async function remplirEtVoirResultats(user: User, reponses: Reponse[]) {
  for (let i = 0; i < 30; i++) {
    await repondrePage(user, reponses);
    const voir = screen.queryByRole("button", { name: /voir les résultats/i });
    if (voir) {
      await user.click(voir);
      return;
    }
    await user.click(screen.getByRole("button", { name: /suivant/i }));
  }
  throw new Error("Formulaire non terminé après 30 pages");
}

// ---------------------------------------------------------------------------
// Rendu initial
// ---------------------------------------------------------------------------

describe("rendu initial", () => {
  it("affiche le titre du simulateur", () => {
    setup();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /simulateur d'éligibilité/i
    );
  });

  it("affiche la question 1 (situations particulières)", () => {
    setup();
    expect(
      screen.getByRole("group", { name: /situations suivantes/i })
    ).toBeInTheDocument();
  });

  it("affiche le menu déroulant du motif principal", () => {
    setup();
    expect(
      screen.getByRole("combobox", { name: /motif principal/i })
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Questions conditionnelles
// ---------------------------------------------------------------------------

describe("questions conditionnelles", () => {
  it("choisir une situation particulière (SMUR) masque le motif principal", async () => {
    const { user } = setup();
    expect(
      screen.getByRole("combobox", { name: /motif principal/i })
    ).toBeInTheDocument();

    const group = screen.getByRole("group", { name: /situations suivantes/i });
    await user.click(within(group).getByRole("radio", { name: "Transport SMUR" }));

    expect(
      screen.queryByRole("combobox", { name: /motif principal/i })
    ).toBeNull();
    expect(
      screen.queryByRole("group", { name: /hospitalisé au moment/i })
    ).toBeNull();
  });

  it("patient hospitalisé = Oui masque le motif principal (exceptions à qualifier d'abord)", async () => {
    const { user } = setup();
    expect(
      screen.getByRole("combobox", { name: /motif principal/i })
    ).toBeInTheDocument();

    const group = screen.getByRole("group", { name: /hospitalisé au moment/i });
    await user.click(within(group).getByRole("radio", { name: "Oui" }));

    expect(
      screen.queryByRole("combobox", { name: /motif principal/i })
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Résultats — cas éligible (PMT)
// ---------------------------------------------------------------------------

describe("résultats — patient éligible (PMT)", () => {
  it("affiche le statut « patient éligible »", async () => {
    const { user } = setup();
    await remplirEtVoirResultats(user, ELIGIBLE_PMT);
    expect(
      screen.getByRole("heading", { name: /patient éligible/i })
    ).toBeInTheDocument();
  });

  it("affiche la section prescripteur avec le document PMT à compléter", async () => {
    const { user } = setup();
    await remplirEtVoirResultats(user, ELIGIBLE_PMT);
    expect(
      screen.getByRole("heading", { name: /pour le prescripteur/i })
    ).toBeInTheDocument();
    expect(screen.getAllByText(/PMT/).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Résultats — cas non éligible
// ---------------------------------------------------------------------------

describe("résultats — patient non éligible", () => {
  // Motif hospitalisation, mais aucun mode de transport justifié.
  const NON_ELIGIBLE: Reponse[] = [
    [/situations suivantes/i, "Aucune de ces situations"],
    [/hospitalisé au moment/i, "Non"],
    [/motif principal/i, "Hospitalisation ou séance assimilée"],
  ];

  it("affiche « patient non éligible » quand aucun mode n'est justifié", async () => {
    const { user } = setup();
    await remplirEtVoirResultats(user, NON_ELIGIBLE);
    expect(
      screen.getByRole("heading", { name: /non éligible/i })
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Réinitialisation
// ---------------------------------------------------------------------------

describe("réinitialisation", () => {
  it("« Nouvelle simulation » ramène au formulaire vierge", async () => {
    const { user } = setup();
    await remplirEtVoirResultats(user, ELIGIBLE_PMT);
    await user.click(
      screen.getByRole("button", { name: /nouvelle simulation/i })
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /simulateur d'éligibilité/i
    );
    expect(
      screen.getByRole("group", { name: /situations suivantes/i })
    ).toBeInTheDocument();
  });
});
