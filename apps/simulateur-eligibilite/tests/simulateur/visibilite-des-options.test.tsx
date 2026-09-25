// Trois options du contrat d'interface ne s'affichent que sous condition
// (`option_visibility`) : les trois séances de « raison principale du
// déplacement » restent masquées tant que la Partie 1 ne les a pas déclarées.
// Le modèle ne sait pas cacher une possibilité : c'est `ChampsDePage.tsx` qui
// filtre, table tenue dans `visibilite-des-options.ts`.
//
// Le détail du motif et celui d'un transfert sont des saisies directes depuis
// la v9.7.3 (TS973-15) : le même filtre s'applique à leurs suggestions.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { emettrePassation } from "../../front/simulateur/passation";
import { precisionMedicale } from "../../front/simulateur/precision-medicale";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { allerAuGroupe, PARTIE_1_AMBULANCE } from "./parcours";

beforeEach(() => sessionStorage.clear());

const RAISON = /raison principale du déplacement/i;
const CHIMIOTHERAPIE = /^séance de chimiothérapie$/i;
const RADIOTHERAPIE = /^séance de radiothérapie$/i;
const DIALYSE = /^séance de dialyse en centre/i;

describe("les trois séances ne s'affichent que si la Partie 1 les a déclarées", () => {
  it("la raison principale s'affiche en radios, sans réponse précochée", async () => {
    await ouvrirLaRaisonPrincipale();

    const groupe = screen.getByRole("group", { name: RAISON });
    const radios = within(groupe).getAllByRole("radio");
    expect(radios.length).toBeGreaterThan(0);
    expect(radios.some((radio) => (radio as HTMLInputElement).checked)).toBe(
      false,
    );
  });

  it("sans séance déclarée en Partie 1, les trois séances sont absentes", async () => {
    await ouvrirLaRaisonPrincipale();

    const groupe = screen.getByRole("group", { name: RAISON });
    expect(
      within(groupe).queryByRole("radio", { name: CHIMIOTHERAPIE }),
    ).not.toBeInTheDocument();
    expect(
      within(groupe).queryByRole("radio", { name: RADIOTHERAPIE }),
    ).not.toBeInTheDocument();
    expect(
      within(groupe).queryByRole("radio", { name: DIALYSE }),
    ).not.toBeInTheDocument();
  });

  it("avec une seule séance déclarée, seule celle-là apparaît", async () => {
    await ouvrirLaRaisonPrincipale({
      p1_m0_seance_chimiotherapie: "oui",
      p1_m0_aucun: "non",
    });

    const groupe = screen.getByRole("group", { name: RAISON });
    expect(
      within(groupe).getByRole("radio", { name: CHIMIOTHERAPIE }),
    ).toBeInTheDocument();
    expect(
      within(groupe).queryByRole("radio", { name: RADIOTHERAPIE }),
    ).not.toBeInTheDocument();
    expect(
      within(groupe).queryByRole("radio", { name: DIALYSE }),
    ).not.toBeInTheDocument();
  });

  it("le même filtrage s'applique aux suggestions du détail d'un transfert", () => {
    const suggestions =
      precisionMedicale("p2_transfert_motif_detail", {
        p1_m0_seance_radiotherapie: "oui",
        p1_m0_seance_chimiotherapie: "non",
        p1_m0_seance_dialyse_centre: "non",
      })?.suggestions ?? [];
    expect(suggestions).toContain("Séance de radiothérapie");
    expect(suggestions.join()).not.toMatch(/chimiothérapie|dialyse/i);
  });
});

// ---- implémentation ----

/** Ouvre la Partie 2 et s'arrête sur la question de la raison principale. */
async function ouvrirLaRaisonPrincipale(
  situation: Record<string, string> = {},
) {
  emettrePassation({ ...PARTIE_1_AMBULANCE, ...situation });
  const user = userEvent.setup({ delay: null });
  render(<Secretariat onNouvelleSimulation={() => {}} />);
  await allerAuGroupe(user, RAISON);
  return user;
}
