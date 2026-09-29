import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../../front/app/App";
import {
  rangerRattachement,
  rattachementEnSession,
} from "../../front/rattachement/session";
import type { RattachementSaisi } from "../../shared/rattachement-saisi";
import { snapshotReferentiel } from "../../shared/referentiel";

// La porte : impossible d'atteindre le simulateur sans s'être rattaché. On
// injecte le référentiel snapshot et une déclaration qui capture ce qui partirait
// au serveur (pas de backend en test).
function setup() {
  const user = userEvent.setup();
  const declarations: RattachementSaisi[] = [];
  render(
    <App
      referentiel={snapshotReferentiel}
      declarer={(saisie) => declarations.push(saisie)}
    />,
  );
  return { user, declarations };
}

async function choisir(labelSelect: RegExp, optionLabel: string) {
  const select = screen.getByRole("combobox", { name: labelSelect });
  await screen.findByRole("option", { name: optionLabel });
  await userEvent.selectOptions(select, optionLabel);
}

const acceder = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Accéder au simulateur" }));

const simulateurMonte = () =>
  screen.findByRole("group", {
    name: /^concernant son déplacement, le patient/i,
  });

beforeEach(() => rangerRattachement(null));

describe("écran-porte de rattachement", () => {
  it("affiche le rattachement d'abord, pas le formulaire", () => {
    setup();
    // Pas de titre (app en iframe) : l'écran de rattachement se reconnaît à son
    // premier champ, et le formulaire du simulateur est absent.
    expect(
      screen.getByRole("combobox", { name: /Établissement/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("group", {
        name: /^concernant son déplacement, le patient/i,
      }),
    ).toBeNull();
  });

  it("passe au simulateur une fois l'établissement et le service validés", async () => {
    const { user, declarations } = setup();

    await choisir(/Établissement/, "CHU Grenoble Alpes");
    await choisir(/Nom du service/, "Cardiologie");
    await acceder(user);

    // Le simulateur est monté : une question de Partie 1 apparaît (plus de titre h1).
    expect(await simulateurMonte()).toBeInTheDocument();
    // Le service part tel quel à l'analytics ; rien à apprendre au référentiel.
    expect(rattachementEnSession()).toEqual({
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_cardio",
    });
    expect(declarations).toEqual([]);
  });

  it("service « Autre » : déclare le service saisi au serveur, sans attendre sa réponse", async () => {
    const { user, declarations } = setup();

    await choisir(/Établissement/, "CHU Grenoble Alpes");
    await choisir(/Nom du service/, "Autre");
    await user.type(
      screen.getByRole("textbox", { name: "Nom de votre service / unité" }),
      "Néphrologie",
    );
    await acceder(user);

    expect(await simulateurMonte()).toBeInTheDocument();
    expect(declarations).toEqual([
      {
        etabId: "e_chu_grenoble",
        serviceId: "s_grenoble_autre",
        serviceEstAutre: true,
        serviceLibre: "Néphrologie",
      },
    ]);
    expect(rattachementEnSession()?.serviceId).toBe("s_grenoble_autre");
  });
});
