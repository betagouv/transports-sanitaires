// Ce que les tests du questionnaire partagent : entrer dans le simulateur par
// l'écran de rattachement, puis répondre comme un utilisateur.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../../front/socle/app/App";
import type { Seed } from "../../../front/socle/seeds/seed";
import { snapshotReferentiel } from "../../../shared/referentiel";
import { modeleDeTest } from "../modele-de-test";
import { seRattacher, seRattacherProduit } from "../se-rattacher";

type User = ReturnType<typeof userEvent.setup>;

/** Monte l'application et franchit l'écran de rattachement. `produit` : service n° 4. */
export async function ouvrirLeSimulateur(
  options: { produit?: boolean; seeds?: readonly Seed[] } = {},
): Promise<User> {
  const user = userEvent.setup();
  render(
    <App
      model={modeleAvec(options.seeds)}
      referentiel={snapshotReferentiel}
      declarer={() => {}}
    />,
  );
  await (options.produit ? seRattacherProduit(user) : seRattacher(user));
  return user;
}

// Le modèle de test, avec ces seeds à la place de son catalogue.
function modeleAvec(seeds?: readonly Seed[]) {
  return seeds ? { ...modeleDeTest, seeds: async () => seeds } : modeleDeTest;
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
