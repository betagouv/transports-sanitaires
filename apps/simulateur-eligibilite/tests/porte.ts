// Helpers de franchissement de l'écran-porte, partagés par les tests qui ont besoin
// d'être **derrière** le rattachement (parcours, écran des seeds).
//
// Deux rattachements : un ordinaire, et un sur le service n° 4 (« Transport
// Sanitaire »), seul à déverrouiller les developer tools.

import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

type User = ReturnType<typeof userEvent.setup>;

async function choisir(user: User, label: RegExp, option: string) {
  const select = screen.getByRole("combobox", { name: label });
  await screen.findByRole("option", { name: option });
  await user.selectOptions(select, option);
}

/** Remplit un rattachement ordinaire, sans developer tool déverrouillé. */
export async function remplirRattachement(user: User) {
  await choisir(user, /Établissement/, "CHU Grenoble Alpes");
  await choisir(user, /Nom du service/, "Cardiologie");
}

/** Remplit un rattachement sur le service n° 4, developer tools déverrouillés. */
export async function remplirRattachementProduit(user: User) {
  await choisir(user, /Établissement/, "Libéral / CNAM / CPAM / Autre");
  await choisir(user, /Nom du service/, "Transport Sanitaire");
}

const acceder = (user: User) =>
  user.click(screen.getByRole("button", { name: "Accéder au simulateur" }));

/** Franchit la porte avec un rattachement ordinaire. */
export async function seRattacher(user: User) {
  await remplirRattachement(user);
  await acceder(user);
}

/** Franchit la porte avec le service n° 4, puis entre dans le simulateur. */
export async function seRattacherProduit(user: User) {
  await remplirRattachementProduit(user);
  await acceder(user);
}
