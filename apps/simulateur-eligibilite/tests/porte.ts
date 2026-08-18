// Helpers de franchissement de l'écran-porte, partagés par les tests qui ont besoin
// d'être **derrière** l'identification (parcours, galerie de seeds, labo).
//
// Deux identités : une ordinaire, et une sur le service n° 4 (« Transport
// Sanitaire »), seul à déverrouiller les outils produit. Ce service n'a aucun
// prescripteur dans le référentiel snapshot : on y passe donc par « Je ne suis pas
// dans la liste », comme en production.

import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

type User = ReturnType<typeof userEvent.setup>;

async function choisir(user: User, label: RegExp, option: string) {
  const select = screen.getByRole("combobox", { name: label });
  await screen.findByRole("option", { name: option });
  await user.selectOptions(select, option);
}

/** Remplit une identité ordinaire — aucun outil produit déverrouillé. */
export async function remplirIdentite(user: User) {
  await choisir(user, /Établissement/, "CHU Grenoble Alpes");
  await choisir(user, /Nom du service/, "Cardiologie");
  await choisir(user, /Vous êtes/, "Dr Amina Berger");
}

/** Remplit une identité sur le service n° 4 — outils produit déverrouillés. */
export async function remplirIdentiteProduit(user: User) {
  await choisir(user, /Établissement/, "Libéral / CNAM / CPAM / Autre");
  await choisir(user, /Nom du service/, "Transport Sanitaire");
  await choisir(user, /Vous êtes/, "Je ne suis pas dans la liste");
  await user.type(screen.getByRole("textbox", { name: "Votre nom" }), "Durand");
  await user.type(screen.getByRole("textbox", { name: "Votre prénom" }), "Léa");
}

const acceder = (user: User) =>
  user.click(screen.getByRole("button", { name: "Accéder au simulateur" }));

/** Franchit la porte avec une identité ordinaire. */
export async function sIdentifier(user: User) {
  await remplirIdentite(user);
  await acceder(user);
}

/** Franchit la porte avec le service n° 4, puis entre dans le simulateur. */
export async function sIdentifierProduit(user: User) {
  await remplirIdentiteProduit(user);
  await acceder(user);
}
