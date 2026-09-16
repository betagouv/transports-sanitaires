// `state.convocation_route_revalidation` du contrat v9.7.1 : une convocation
// déjà caractérisée (CONV-AP) dont le trajet change réellement doit reposer
// la mosaïque plutôt que de garder des caractéristiques établies pour un
// autre trajet (`convocation-revalidation.ts`, D3 — sans reprise durable).
//
// CONV971-REVALIDATION-TRAJET-* (tmp/9.7.1/tests/convocation.mjs), transposé
// à notre mécanique de retour en arrière plutôt qu'à la session de
// référence : la garde réelle tient à un changement de valeur détecté sur les
// trois questions à choix unique du trajet, pas à un état de session que
// notre application ne modélise pas de la même façon.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { emettrePassation } from "../../front/simulateur/passation";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { allerAuGroupe, PARTIE_1_AMBULANCE, type Reponse } from "./parcours";

beforeEach(() => sessionStorage.clear());

const VERS_CONV_AP: Reponse[] = [
  [/cas réglementaires/i, /convocation du contrôle médical/i],
];

describe("CONV971-REVALIDATION-TRAJET — un trajet qui change réellement", () => {
  it("reposant la mosaïque CONV-AP, sans caractéristique déjà cochée", async () => {
    const user = userEvent.setup({ delay: null });
    emettrePassation(PARTIE_1_AMBULANCE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    await allerAuGroupe(user, /caractéristiques suivantes/i, VERS_CONV_AP);
    await user.click(screen.getByRole("checkbox", { name: /plus de 150 km/i }));
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    await allerAuGroupe(user, /type de lieu de départ/i);
    await user.click(screen.getByRole("radio", { name: /^domicile$/i }));
    // Sans quoi le clic sur Précédent court-circuite l'avancement automatique.
    await screen.findAllByRole("textbox");

    await reculerJusqua(user, /type de lieu de départ/i);
    // Une réponse différente de celle déjà en place : ça doit requalifier.
    await user.click(screen.getByRole("radio", { name: /^ehpad$/i }));

    await allerAuGroupe(user, /caractéristiques suivantes/i);
    const caracteristiques = screen.getByRole("group", {
      name: /caractéristiques suivantes/i,
    });
    for (const checkbox of within(caracteristiques).getAllByRole("checkbox"))
      expect(checkbox).not.toBeChecked();
  }, 40_000);

  it("ne repose rien quand la réponse revient identique", async () => {
    const user = userEvent.setup({ delay: null });
    emettrePassation(PARTIE_1_AMBULANCE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    await allerAuGroupe(user, /caractéristiques suivantes/i, VERS_CONV_AP);
    await user.click(screen.getByRole("checkbox", { name: /plus de 150 km/i }));
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    await allerAuGroupe(user, /type de lieu de départ/i);
    await user.click(screen.getByRole("radio", { name: /^domicile$/i }));
    // Sans quoi le clic sur Précédent court-circuite l'avancement automatique.
    await screen.findAllByRole("textbox");

    await reculerJusqua(user, /type de lieu de départ/i);
    // Même réponse qu'avant : un aller-retour sans changement réel.
    await user.click(screen.getByRole("radio", { name: /^domicile$/i }));

    expect(
      screen.queryByRole("group", { name: /caractéristiques suivantes/i }),
    ).not.toBeInTheDocument();
  }, 40_000);
});

// ---- implémentation ----

async function reculerJusqua(
  user: ReturnType<typeof userEvent.setup>,
  nom: RegExp,
) {
  for (let i = 0; i < 20; i++) {
    if (screen.queryByRole("group", { name: nom })) return;
    await user.click(screen.getByRole("button", { name: /^précédent$/i }));
  }
  throw new Error(`jamais atteint en reculant : ${nom}`);
}
