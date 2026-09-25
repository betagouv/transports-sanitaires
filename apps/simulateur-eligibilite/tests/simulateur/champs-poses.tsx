// Ce qu'un parcours du secrétariat a posé : les champs rencontrés, dans
// l'ordre, du premier écran de la Partie 2 au résultat. Partagé par les tests
// d'ordre du parcours (TS973-16, TS973-17).

import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { emettrePassation } from "../../front/simulateur/passation";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { PARTIE_1_AMBULANCE, type Reponse, terminerParcours } from "./parcours";

/** Mène la Partie 2 au bout, et rend les noms des champs posés, dans l'ordre. */
export async function champsPoses(reponses: Reponse[]): Promise<string[]> {
  const user = userEvent.setup({ delay: null });
  emettrePassation(PARTIE_1_AMBULANCE);
  render(<Secretariat onNouvelleSimulation={() => {}} />);
  const posees: string[] = [];
  await terminerParcours(user, reponses, () => {
    for (const champ of document.querySelectorAll("input[name]")) {
      const nom = champ.getAttribute("name") ?? "";
      if (!posees.includes(nom)) posees.push(nom);
    }
  });
  return posees;
}
