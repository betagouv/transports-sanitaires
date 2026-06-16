import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { App } from "../src/App";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup() {
  const user = userEvent.setup();
  render(<App />);
  return { user };
}

async function repondre(
  user: ReturnType<typeof userEvent.setup>,
  questionPattern: RegExp,
  reponse: string
) {
  const fieldset = screen.getByRole("group", { name: questionPattern });
  await user.click(within(fieldset).getByRole("radio", { name: reponse }));
}

async function saisirDistance(
  user: ReturnType<typeof userEvent.setup>,
  km: number
) {
  const input = screen.getByRole("spinbutton", { name: /distance aller/i });
  await user.clear(input);
  await user.type(input, String(km));
}

async function clicSuivant(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /suivant/i }));
}

async function clicVoirResultats(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /voir les résultats/i }));
}

// Navigue jusqu'à la fin du formulaire quelle que soit la structure de pages.
async function allerJusquAuBoutDuFormulaire(
  user: ReturnType<typeof userEvent.setup>
) {
  while (screen.queryByRole("button", { name: /voir les résultats/i }) === null) {
    await clicSuivant(user);
  }
  await clicVoirResultats(user);
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

  it("affiche la question hospitalisation", () => {
    setup();
    expect(
      screen.getByRole("group", { name: /hospitalisé/i })
    ).toBeInTheDocument();
  });

  it("affiche la question accident du travail", () => {
    setup();
    expect(
      screen.getByRole("group", { name: /accident du travail/i })
    ).toBeInTheDocument();
  });

  it("affiche 'Voir les résultats' quand rien n'est éligible (1 seule page)", () => {
    setup();
    expect(
      screen.getByRole("button", { name: /voir les résultats/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /suivant/i })
    ).toBeNull();
  });

  it("le bouton passe à 'Suivant' quand hospitalisation = Oui (page autonomie ajoutée)", async () => {
    const { user } = setup();
    await repondre(user, /hospitalisé/i, "Oui");
    expect(
      screen.getByRole("button", { name: /suivant/i })
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Questions conditionnelles — ALD
// ---------------------------------------------------------------------------

describe("questions conditionnelles — ALD", () => {
  it("les sous-questions ALD sont absentes si ALD non reconnue", () => {
    setup();
    expect(screen.queryByRole("group", { name: /lien avec/i })).toBeNull();
    expect(screen.queryByRole("group", { name: /déficience/i })).toBeNull();
  });

  it("ALD = Oui → page 2 : question 'lien avec le transport'", async () => {
    const { user } = setup();
    await repondre(user, /ALD.*reconnue/i, "Oui");
    await clicSuivant(user);
    expect(
      screen.getByRole("group", { name: /lien avec/i })
    ).toBeInTheDocument();
  });

  it("lien avec ALD = Oui → page 3 : question 'déficience ou incapacité'", async () => {
    const { user } = setup();
    await repondre(user, /ALD.*reconnue/i, "Oui");
    await clicSuivant(user);
    await repondre(user, /lien avec/i, "Oui");
    await clicSuivant(user);
    expect(
      screen.getByRole("group", { name: /déficience/i })
    ).toBeInTheDocument();
  });

  it("revenir en arrière et choisir ALD = Non rend la page ALD vide (champs non applicables)", async () => {
    const { user } = setup();
    await repondre(user, /ALD.*reconnue/i, "Oui");
    await clicSuivant(user);
    await user.click(screen.getByRole("button", { name: /précédent/i }));
    await repondre(user, /ALD.*reconnue/i, "Non");
    await clicSuivant(user);
    // La page ALD existe encore dans `pages` mais ses champs ne sont plus applicables
    expect(screen.queryByRole("group", { name: /lien avec/i })).toBeNull();
    expect(screen.queryByRole("group", { name: /déficience/i })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Questions conditionnelles — trajets
// ---------------------------------------------------------------------------

describe("questions conditionnelles — trajets", () => {
  it("le champ nombre de trajets est absent pour distance ≤ 50 km", async () => {
    const { user } = setup();
    await saisirDistance(user, 40);
    // même après navigation, le champ n'existe pas
    expect(
      screen.queryByRole("button", { name: /suivant/i })
    ).toBeNull();
    expect(
      screen.queryByRole("spinbutton", { name: /trajets/i })
    ).toBeNull();
  });

  it("le champ nombre de trajets apparaît sur la page suivante pour distance > 50 km", async () => {
    const { user } = setup();
    await saisirDistance(user, 60);
    await clicSuivant(user);
    expect(
      screen.getByRole("spinbutton", { name: /trajets/i })
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Navigation multi-pages
// ---------------------------------------------------------------------------

describe("navigation", () => {
  it("le bouton Précédent est absent sur la page 1", () => {
    setup();
    expect(screen.queryByRole("button", { name: /précédent/i })).toBeNull();
  });

  it("passer à la page autonomie affiche le bouton Précédent", async () => {
    const { user } = setup();
    await repondre(user, /hospitalisé/i, "Oui");
    await clicSuivant(user);
    expect(
      screen.getByRole("button", { name: /précédent/i })
    ).toBeInTheDocument();
  });

  it("la page autonomie contient la question 'position allongée'", async () => {
    const { user } = setup();
    await repondre(user, /hospitalisé/i, "Oui");
    await clicSuivant(user);
    expect(
      screen.getByRole("group", { name: /position allongée/i })
    ).toBeInTheDocument();
  });

  it("Précédent depuis la page autonomie ramène à la page situation", async () => {
    const { user } = setup();
    await repondre(user, /hospitalisé/i, "Oui");
    await clicSuivant(user);
    await user.click(screen.getByRole("button", { name: /précédent/i }));
    expect(
      screen.getByRole("group", { name: /hospitalisé/i })
    ).toBeInTheDocument();
  });

  it("Suivant navigue vers la page autonomie quand distance = 0 et hospitalisation = Oui", async () => {
    const { user } = setup();
    await saisirDistance(user, 0);
    await repondre(user, /Le patient est-il hospitalisé ou suit-il une séance assimilée/i, "Oui");
    await clicSuivant(user);
    expect(
      screen.getByRole("group", { name: /position allongée/i })
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Résultats — cas éligible
// ---------------------------------------------------------------------------

describe("résultats — cas éligible (hospitalisation)", () => {
  async function allerAuResultat(user: ReturnType<typeof userEvent.setup>) {
    await repondre(user, /hospitalisé/i, "Oui");
    await allerJusquAuBoutDuFormulaire(user);
  }

  it("affiche le message 'Transport pris en charge'", async () => {
    const { user } = setup();
    await allerAuResultat(user);
    expect(screen.getByText(/transport pris en charge/i)).toBeInTheDocument();
  });

  it("affiche la section Mode de transport", async () => {
    const { user } = setup();
    await allerAuResultat(user);
    expect(
      screen.getByRole("heading", { name: /mode de transport/i })
    ).toBeInTheDocument();
  });

  it("affiche la section Accord préalable", async () => {
    const { user } = setup();
    await allerAuResultat(user);
    expect(
      screen.getByRole("heading", { name: /accord préalable/i })
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Résultats — cas non éligible
// ---------------------------------------------------------------------------

describe("résultats — cas non éligible", () => {
  it("affiche 'non éligible' quand aucune condition n'est remplie", async () => {
    const { user } = setup();
    await clicVoirResultats(user);
    expect(screen.getByText(/non éligible/i)).toBeInTheDocument();
  });

  it("n'affiche pas de section Mode de transport si non éligible", async () => {
    const { user } = setup();
    await clicVoirResultats(user);
    expect(
      screen.queryByRole("heading", { name: /mode de transport/i })
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Résultats — accord préalable
// ---------------------------------------------------------------------------

describe("résultats — accord préalable", () => {
  it("affiche 'accord préalable requis' pour longue distance (> 150 km)", async () => {
    const { user } = setup();
    await saisirDistance(user, 200);
    await allerJusquAuBoutDuFormulaire(user);
    expect(
      screen.getByText(/accord préalable de l'assurance maladie est requis/i)
    ).toBeInTheDocument();
  });

  it("affiche 'aucun accord préalable' pour hospitalisation courte distance", async () => {
    const { user } = setup();
    await repondre(user, /hospitalisé/i, "Oui");
    await saisirDistance(user, 30);
    await allerJusquAuBoutDuFormulaire(user);
    expect(screen.getByText(/aucun accord préalable/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Réinitialisation
// ---------------------------------------------------------------------------

describe("réinitialisation", () => {
  it("le bouton 'Nouvelle simulation' ramène au formulaire vierge", async () => {
    const { user } = setup();
    await clicVoirResultats(user);
    await user.click(
      screen.getByRole("button", { name: /nouvelle simulation/i })
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /simulateur d'éligibilité/i
    );
    expect(screen.queryByText(/transport pris en charge/i)).toBeNull();
    expect(screen.queryByText(/non éligible/i)).toBeNull();
  });
});
