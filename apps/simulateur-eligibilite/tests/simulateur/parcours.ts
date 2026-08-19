// Conduite d'un parcours de questions dans les tests d'interface : répondre à une
// page, aller jusqu'au bout, franchir les filtres d'entrée. Partagé par les tests
// du prescripteur et du secrétariat, qui traversent le même questionnaire.

import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

type User = ReturnType<typeof userEvent.setup>;
export type Reponse = [RegExp, string];

// Répond aux groupes booléens : les libellés ciblés selon `reponses`, puis
// « Non » à tout groupe resté sans réponse (les questions du modèle v3 posées
// pour ces cibles sont toutes des oui/non).
export async function repondrePage(user: User, reponses: Reponse[]) {
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
export async function terminerParcours(user: User, reponses: Reponse[]) {
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
export async function passerFiltresM0(user: User) {
  for (const re of [
    /équipe SMUR/i,
    /contrainte bariatrique/i,
    /permission de sortie/i,
  ]) {
    const g = await screen.findByRole("group", { name: re });
    // M0.3 (permission) est un choix Oui/Non/Non concerné dont les libellés
    // sont en minuscules ; ^non$ cible « non » sans matcher « non concerné ».
    await user.click(within(g).getByRole("radio", { name: /^non$/i }));
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));
  }
}
