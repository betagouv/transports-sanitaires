// Ce que les tests du parcours partagent : entrer dans le simulateur par la
// vraie porte, puis répondre comme le ferait un utilisateur.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../front/app/App";
import type { Seed } from "../../front/seeds/seed";
import { snapshotReferentiel } from "../../shared/referentiel";
import { seRattacher, seRattacherProduit } from "../se-rattacher";

type User = ReturnType<typeof userEvent.setup>;

/** Monte l'application et franchit l'écran de rattachement. `produit` : service n° 4. */
export async function ouvrirLeSimulateur(
  options: { produit?: boolean; seeds?: readonly Seed[] } = {},
): Promise<User> {
  const user = userEvent.setup();
  render(
    <App
      referentiel={snapshotReferentiel}
      declarer={() => {}}
      seeds={options.seeds}
    />,
  );
  await (options.produit ? seRattacherProduit(user) : seRattacher(user));
  return user;
}

export const BOISSON = { name: /^quelle boisson souhaitez-vous/i };
export const ACCOMPAGNEMENTS = { name: /^avec quoi/i };
export const QUANTITE = { name: /^combien de tasses/i };

/** La question affichée, attendue le temps d'un avancement automatique. */
export const question = (nom: { name: RegExp }) =>
  screen.findByRole("group", nom);

export const radio = (libelle: string) =>
  screen.getByRole("radio", { name: libelle });

export const caseACocher = (libelle: string) =>
  screen.getByRole("checkbox", { name: libelle });

export const bouton = (libelle: string) =>
  screen.getByRole("button", { name: libelle });

export const sansBouton = (libelle: string) =>
  screen.queryByRole("button", { name: libelle }) === null;

/** Répond « Un thé », puis « Du lait », et s'arrête sur le résultat. */
export async function allerAuResultat(user: User) {
  await question(BOISSON);
  await user.click(radio("Un thé"));
  await question(ACCOMPAGNEMENTS);
  await user.click(caseACocher("Du lait"));
  await user.click(bouton("Voir le résultat"));
  await screen.findByRole("heading", { name: "Résultat" });
}
