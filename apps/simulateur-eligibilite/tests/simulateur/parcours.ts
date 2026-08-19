// Conduite d'un parcours de questions dans les tests d'interface : répondre à une
// page, aller jusqu'au bout. Partagé par les tests du prescripteur et du
// secrétariat, qui traversent le même questionnaire.
//
// Le modèle v9.1 mêle quatre formes de question sur une même page : des choix
// uniques (Q1, A4.1-A4.3…), des oui/non, des mosaïques à choix multiple (Q1.1,
// M0, A0.2, A3.4, M1.1) et douze saisies libres d'adresse. Répondre « par
// défaut » n'a donc pas un seul sens : c'est « Non » pour un oui/non, l'option
// exclusive pour une mosaïque, la première possibilité pour un choix unique, et
// un texte quelconque pour une saisie libre.

import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

type User = ReturnType<typeof userEvent.setup>;

/**
 * Ce qu'un test veut voir coché. Deux formes, selon la question :
 *   - `[question, valeur]` — un choix unique ou un oui/non : le groupe est nommé
 *     par `question`, l'option par `valeur` ;
 *   - `[option]` — une case de mosaïque, que son libellé identifie à lui seul.
 */
export type Reponse = [RegExp, (string | RegExp)?];

/** Répond aux questions ciblées, puis complète le reste de la page par défaut. */
export async function repondrePage(user: User, reponses: Reponse[]) {
  for (const [question, valeur] of reponses)
    await repondre(user, question, valeur);
  for (const groupe of screen.queryAllByRole("group"))
    await completerGroupe(user, groupe);
  for (const champ of screen.queryAllByRole("textbox"))
    if ((champ as HTMLInputElement).value === "") await user.type(champ, "x");
}

/** Remplit le parcours page par page jusqu'au bouton de fin (tout sauf « Suivant »). */
export async function terminerParcours(user: User, reponses: Reponse[]) {
  for (let i = 0; i < 40; i++) {
    await repondrePage(user, reponses);
    const suivant = screen.queryByRole("button", { name: /^suivant$/i });
    if (suivant) {
      await user.click(suivant);
      continue;
    }
    await user.click(screen.getByRole("button", { name: /^voir|^compléter/i }));
    return;
  }
  throw new Error("parcours non terminé après 40 pages");
}

// ---- implémentation ----

// Une réponse ciblée. Sans `valeur`, `question` nomme directement l'option — le
// cas d'une mosaïque, dont les cases portent l'énoncé complet. Avec `valeur`, la
// recherche est restreinte au groupe que `question` nomme.
async function repondre(
  user: User,
  question: RegExp,
  valeur?: string | RegExp,
) {
  if (valeur === undefined) return cliquerOption(user, screen, question);
  const groupe = screen.queryByRole("group", { name: question });
  if (groupe) await cliquerOption(user, within(groupe), valeur);
}

type Portee = typeof screen | ReturnType<typeof within>;

async function cliquerOption(user: User, dans: Portee, nom: string | RegExp) {
  const option =
    dans.queryByRole("radio", { name: nom }) ??
    dans.queryByRole("checkbox", { name: nom });
  if (option) await user.click(option);
}

// Un groupe resté sans réponse en reçoit une, la plus neutre de sa forme.
async function completerGroupe(user: User, groupe: HTMLElement) {
  const dedans = within(groupe);
  const cases = dedans.queryAllByRole("checkbox");
  if (cases.length > 0) return completerMosaique(user, cases);
  if (dedans.queryByRole("radio", { checked: true })) return;
  const radios = dedans.queryAllByRole("radio");
  const non = dedans.queryByRole("radio", { name: /^non$/i });
  if (non) await user.click(non);
  else if (radios[0]) await user.click(radios[0]);
}

// Une mosaïque est répondue par son option exclusive — « Aucun… » / « Aucune… »,
// toujours la dernière case du groupe — sauf si une case est déjà cochée.
async function completerMosaique(user: User, cases: HTMLElement[]) {
  if (cases.some((c) => (c as HTMLInputElement).checked)) return;
  const exclusive = cases[cases.length - 1];
  if (exclusive) await user.click(exclusive);
}
