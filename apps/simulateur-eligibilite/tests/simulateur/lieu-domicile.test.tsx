// Un trajet ne relie jamais deux domiciles : `p2_types_lieux_valides`
// (entrees-calculees.ts) l'interdit déjà côté modèle, mais rien n'empêchait de
// choisir « Domicile » aux deux bouts avant de s'en apercevoir, adresses
// remplies, à la toute fin. Ce fichier couvre le filtrage à l'écran
// (ChampsDePage.tsx) et l'effacement d'une arrivée Domicile devenue invalide
// (trajet-domicile.ts, passation.ts).

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { emettrePassation } from "../../front/simulateur/passation";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { allerAuGroupe, PARTIE_1_AMBULANCE } from "./parcours";

beforeEach(() => sessionStorage.clear());

// Les trois saisies obligatoires d'un lieu — le nom ne l'est pas au domicile,
// et n'est donc pas dans cette liste.
const ADRESSE_MINIMALE: Array<[RegExp, string]> = [
  [/^Numéro et libellé de la voie$/i, "1 rue A"],
  [/^Code postal$/i, "56000"],
  [/^Ville$/i, "Vannes"],
];

describe("un trajet ne relie jamais deux domiciles", () => {
  it("retire Domicile des réponses possibles à l’arrivée quand le départ l’est", async () => {
    const user = await ouvrirLeTypeDeDepart();
    await user.click(screen.getByRole("radio", { name: /^domicile$/i }));
    await remplirAdresse(user);

    const typeArrivee = await groupeTypeArrivee();
    expect(
      within(typeArrivee).queryByRole("radio", { name: /^domicile$/i }),
    ).not.toBeInTheDocument();
  }, 40_000);

  it("efface une arrivée Domicile déjà choisie quand le départ le devient à son tour", async () => {
    const user = await ouvrirLeTypeDeDepart();
    await user.click(screen.getByRole("radio", { name: /^ehpad$/i }));
    await user.type(
      await screen.findByRole("textbox", { name: /^Nom du lieu$/i }),
      "CHBA",
    );
    await remplirAdresse(user);

    const arriveeAvant = await groupeTypeArrivee();
    await user.click(
      within(arriveeAvant).getByRole("radio", { name: /^domicile$/i }),
    );
    // Choix unique : la page avance seule vers l'adresse d'arrivée. On
    // attend qu'elle soit là avant de revenir en arrière, sans quoi le clic
    // sur « Précédent » court-circuite l'avancement automatique en cours.
    await screen.findAllByRole("textbox");

    // Retour jusqu'au type de départ : adresse d'arrivée, type d'arrivée,
    // adresse de départ, puis la page cherchée.
    for (let i = 0; i < 3; i++)
      await user.click(screen.getByRole("button", { name: /^précédent$/i }));
    await user.click(screen.getByRole("radio", { name: /^domicile$/i }));

    // De nouveau choix unique : la page avance seule vers l'adresse de départ.
    // Changer le type de départ a effacé tout ce qui suit (TS973-16),
    // l'adresse comprise : elle se ressaisit.
    await remplirAdresse(user);

    const arriveeApres = await groupeTypeArrivee();
    expect(
      within(arriveeApres).queryByRole("radio", { name: /^domicile$/i }),
    ).not.toBeInTheDocument();
    expect(
      within(arriveeApres).queryByRole("radio", { checked: true }),
    ).not.toBeInTheDocument();
  }, 40_000);
});

// ---- implémentation ----

/** Ouvre la Partie 2 et s'arrête sur la question du type de lieu de départ. */
async function ouvrirLeTypeDeDepart() {
  emettrePassation(PARTIE_1_AMBULANCE);
  const user = userEvent.setup({ delay: null });
  render(<Secretariat onNouvelleSimulation={() => {}} />);
  await allerAuGroupe(user, /type de lieu de départ/i);
  return user;
}

async function groupeTypeArrivee() {
  return screen.findByRole("group", { name: /type de lieu d’arrivée/i });
}

/** Complète la page d'adresse atteinte par avancement automatique. */
async function remplirAdresse(user: ReturnType<typeof userEvent.setup>) {
  await screen.findAllByRole("textbox");
  for (const [libellé, valeur] of ADRESSE_MINIMALE)
    await user.type(champ(libellé), valeur);
  const suivant = screen.getByRole("button", { name: /^suivant$/i });
  await user.click(suivant);
}

const champ = (libellé: RegExp) =>
  screen.getByRole("textbox", { name: libellé });
