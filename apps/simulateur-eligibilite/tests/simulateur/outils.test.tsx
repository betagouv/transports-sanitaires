import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prescripteur } from "../../front/prescripteur/Prescripteur";
import { Secretariat } from "../../front/secretariat/Secretariat";
import { emettrePassation } from "../../front/simulateur/passation";

type User = ReturnType<typeof userEvent.setup>;
type Reponse = [RegExp, string];

// Répond aux groupes booléens : les libellés ciblés selon `reponses`, puis
// « Non » à tout groupe resté sans réponse (les questions du modèle v3 posées
// pour ces cibles sont toutes des oui/non).
async function repondrePage(user: User, reponses: Reponse[]) {
  for (const [re, value] of reponses) {
    const group = screen.queryByRole("group", { name: re });
    if (group) {
      const radio = within(group).queryByRole("radio", { name: value });
      if (radio) await user.click(radio);
    }
  }
  for (const group of screen.queryAllByRole("group")) {
    if (within(group).queryByRole("radio", { checked: true })) continue;
    const non = within(group).queryByRole("radio", { name: "Non" });
    if (non) await user.click(non);
  }
}

// Remplit le parcours page par page jusqu'au bouton de fin (tout sauf « Suivant »).
async function terminerParcours(user: User, reponses: Reponse[]) {
  for (let i = 0; i < 40; i++) {
    await repondrePage(user, reponses);
    const suivant = screen.queryByRole("button", { name: /^suivant$/i });
    if (suivant) {
      await user.click(suivant);
      continue;
    }
    await user.click(screen.getByRole("button", { name: /^voir/i }));
    return;
  }
  throw new Error("parcours non terminé après 40 pages");
}

// v6 : les filtres M0 (SMUR → bariatrique → permission) se succèdent, une question
// par page. On répond « Non » à chacun pour atteindre la question du motif.
async function passerFiltresM0(user: User) {
  for (const re of [
    /équipe SMUR/i,
    /contrainte bariatrique/i,
    /permission de sortie/i,
  ]) {
    const g = await screen.findByRole("group", { name: re });
    await user.click(within(g).getByRole("radio", { name: "Non" }));
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));
  }
}

beforeEach(() => sessionStorage.clear());

describe("prescripteur — parcours médical", () => {
  it("commence par la page « Situation particulière » (SMUR en premier, ALD non révélée)", () => {
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />
    );
    // 1re page : situations particulières uniquement — les motifs et l'ALD
    // n'apparaissent que sur les pages suivantes (révélation progressive).
    expect(
      screen.getByRole("group", { name: /équipe SMUR/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: /en lien avec une ALD/i })
    ).toBeNull();
    expect(
      screen.queryByRole("group", { name: /hospitalisation/i })
    ).toBeNull();
  });

  it("SMUR → avis médical favorable, passe la main au secrétariat", async () => {
    const user = userEvent.setup();
    const passer = vi.fn();
    render(
      <Prescripteur
        onPasserAuSecretariat={passer}
        onNouvelleSimulation={() => {}}
      />
    );

    await terminerParcours(user, [[/équipe SMUR/i, "Oui"]]);

    expect(
      screen.getByRole("heading", { name: /avis médical favorable/i })
    ).toBeInTheDocument();

    // Cas tranché dès la Partie 1 : le CTA mène directement au document.
    await user.click(
      screen.getByRole("button", { name: /voir le document/i })
    );
    expect(passer).toHaveBeenCalledTimes(1);
  });

  it("motifs (M1.1) : une seule question à cases à cocher avec exclusivité « Aucun »", async () => {
    const user = userEvent.setup();
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />
    );

    // Page « Situation particulière » (révélation progressive) → page « Motif ».
    await passerFiltresM0(user);

    // Page « Motif » : une seule question, rendue en cases à cocher.
    const motif = screen.getByRole("group", {
      name: /quelle situation justifie le transport/i,
    });
    const hospit = within(motif).getByRole("checkbox", {
      name: /hospitalisation/i,
    });
    const ald = within(motif).getByRole("checkbox", {
      name: /en lien avec une ALD/i,
    });
    const aucun = within(motif).getByRole("checkbox", {
      name: /aucun de ces motifs/i,
    });

    // Choix multiple : deux motifs cochés simultanément (les autres options ne
    // doivent pas se désactiver une fois l'agrégat OU satisfait).
    await user.click(hospit);
    await user.click(ald);
    expect(hospit).toBeChecked();
    expect(ald).toBeChecked();

    // Exclusivité : cocher « Aucun » décoche tous les motifs.
    await user.click(aucun);
    expect(aucun).toBeChecked();
    expect(hospit).not.toBeChecked();
    expect(ald).not.toBeChecked();
  });

  it("critères — « Aucune situation » (aucun à sémantique métier) mène au transport véhicule personnel", async () => {
    const user = userEvent.setup();
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />
    );

    // Situation (révélation progressive) → Motif.
    await passerFiltresM0(user);

    // Motif : cocher « hospitalisation ».
    const motif = screen.getByRole("group", {
      name: /quelle situation justifie le transport/i,
    });
    await user.click(
      within(motif).getByRole("checkbox", { name: /hospitalisation/i })
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    // Autonomie (v6 : gate des critères) : répondre.
    const autonomie = screen.getByRole("group", { name: /^le patient/i });
    await user.click(
      within(autonomie).getByRole("radio", { name: /aucune de ces situations/i })
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    // Critères : cocher « Aucune de ces situations » (option aucun = règle métier
    // p1_critere_aucune_situation_encadree, qui doit être activée).
    const crit = screen.getByRole("group", {
      name: /prise en charge plus encadrée/i,
    });
    await user.click(
      within(crit).getByRole("checkbox", { name: /aucune de ces situations/i })
    );
    await user.click(screen.getByRole("button", { name: /^voir/i }));

    // Résultat déduit : transport véhicule personnel ou transport en commun.
    expect(
      screen.getByRole("heading", { name: /avis médical favorable/i })
    ).toBeInTheDocument();
    // (getAllByText : le panneau de debug répète la valeur du transport.)
    expect(
      screen.getAllByText(/véhicule personnel ou transport en commun/i).length
    ).toBeGreaterThan(0);
  });

  it("critères VSL/taxi → la question « transport partagé » est posée (cible sortie P1)", async () => {
    const user = userEvent.setup();
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />
    );

    await passerFiltresM0(user);
    await user.click(
      within(
        screen.getByRole("group", {
          name: /quelle situation justifie le transport/i,
        })
      ).getByRole("checkbox", { name: /hospitalisation/i })
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));
    await user.click(
      within(screen.getByRole("group", { name: /^le patient/i })).getByRole(
        "radio",
        { name: /aucune de ces situations/i }
      )
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    // Critère menant à un VSL/taxi → transport partagé devient applicable ET, la
    // sortie étant ciblée, la question est posée à l'étape suivante.
    await user.click(
      within(
        screen.getByRole("group", { name: /prise en charge plus encadrée/i })
      ).getByRole("checkbox", { name: /respect rigoureux de règles d’hygiène/i })
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    expect(
      screen.getByRole("group", { name: /transport partagé/i })
    ).toBeInTheDocument();
  });

  it("contrainte bariatrique seule → avis défavorable", async () => {
    const user = userEvent.setup();
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />
    );

    await terminerParcours(user, [[/contrainte bariatrique/i, "Oui"]]);

    expect(
      screen.getByRole("heading", { name: /non justifié médicalement/i })
    ).toBeInTheDocument();
  });
});

describe("secrétariat — parcours administratif", () => {
  it("sans passation : invite à commencer par l'évaluation médicale", () => {
    render(<Secretariat onNouvelleSimulation={() => {}} />);
    expect(
      screen.getByRole("heading", { name: /aucune prescription en attente/i })
    ).toBeInTheDocument();
  });

  it("cas tranché dès la Partie 1 (SMUR) : affiche directement le document", () => {
    emettrePassation({
      p1_situation_smur: "oui",
      p1_situation_bariatrique_seul: "non",
      p1_situation_permission_sans_motif_medical: "non",
    });
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    expect(screen.getByRole("heading", { name: /^SMUR$/i })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /document à remettre au patient/i })
    ).toBeInTheDocument();
  });
});
