import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../front/app/App";
import { Prescripteur } from "../../front/prescripteur/Prescripteur";
import { snapshotReferentiel } from "../../shared/referentiel";

const GABARIT = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../front/cerfa/gabarit/cerfa-11574-07.pdf"),
);

function setup() {
  const user = userEvent.setup();
  render(
    <App
      referentiel={snapshotReferentiel}
      pseudonymiser={async () => null}
      chargerGabarit={async () => GABARIT.buffer.slice(0) as ArrayBuffer}
    />,
  );
  return { user };
}

async function choisir(labelSelect: RegExp, option: string) {
  const select = screen.getByRole("combobox", { name: labelSelect });
  await screen.findByRole("option", { name: option });
  await userEvent.selectOptions(select, option);
}

/** Franchit l'écran-porte pour atteindre le début du parcours prescripteur. */
async function sIdentifier(user: ReturnType<typeof userEvent.setup>) {
  await choisir(/Établissement/, "CHU Grenoble Alpes");
  await choisir(/Nom du service/, "Cardiologie");
  await choisir(/Vous êtes/, "Dr Amina Berger");
  await user.click(screen.getByRole("button", { name: "Accéder au simulateur" }));
}

const RACCOURCI = { name: /Secrétariat — prescription \(CERFA\)/ } as const;
const TELECHARGER = { name: /Télécharger la prescription pré-remplie/i } as const;

beforeEach(() => sessionStorage.clear());

describe("raccourci « aller à la génération du CERFA »", () => {
  it("est proposé dès le début du parcours prescripteur", async () => {
    const { user } = setup();
    await sIdentifier(user);

    // Le parcours est bien à sa première question, et le raccourci est offert.
    expect(await screen.findByRole("group", { name: /équipe SMUR/i })).toBeInTheDocument();
    expect(screen.getByRole("button", RACCOURCI)).toBeInTheDocument();
  });

  it("saute le questionnaire et ouvre l'écran qui propose le CERFA", async () => {
    const { user } = setup();
    await sIdentifier(user);
    await user.click(screen.getByRole("button", RACCOURCI));

    // Page Résultat 2, sur un cas « prescription médicale de transport ».
    expect(
      await screen.findByRole("heading", { name: /Document à imprimer/i }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", TELECHARGER, { timeout: 10_000 }),
    ).toBeInTheDocument();
    // Plus aucune question du parcours n'est affichée.
    expect(screen.queryByRole("group", { name: /équipe SMUR/i })).toBeNull();
  });

  it("permet de générer le CERFA dans la foulée", async () => {
    const { user } = setup();
    await sIdentifier(user);
    await user.click(screen.getByRole("button", RACCOURCI));

    // Timeouts élargis sur toute la fin de ce test : la Page Résultat 2 est un
    // gros DOM (la recherche par nom accessible y coûte cher) et la génération
    // relit puis réécrit un gabarit de 767 ko. La seconde par défaut ne suffit
    // pas quand la suite tourne en parallèle.
    const attendreBouton = () =>
      screen.findByRole("button", TELECHARGER, { timeout: 10_000 });

    await user.click(await attendreBouton());
    // Le bouton reprend son libellé une fois le PDF produit.
    await attendreBouton();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("disparaît une fois le parcours engagé sur la page de résultat", async () => {
    const { user } = setup();
    await sIdentifier(user);
    await user.click(screen.getByRole("button", RACCOURCI));

    // Le raccourci appartient au début du parcours : il n'encombre pas le résultat.
    expect(screen.queryByRole("button", RACCOURCI)).toBeNull();
  });

  it("n'existe pas quand le raccourci n'est pas fourni", () => {
    // `App` ne passe `onAllerAuCerfaDev` que sous `import.meta.env.DEV` : en
    // production le parcours ne peut pas être court-circuité, une prescription ne
    // devant jamais reposer sur une situation fabriquée. Ce test couvre le
    // mécanisme (prop absente ⇒ pas de bouton), le gating lui-même étant au build.
    render(
      <Prescripteur onPasserAuSecretariat={() => {}} onNouvelleSimulation={() => {}} />,
    );
    expect(screen.getByRole("group", { name: /équipe SMUR/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", RACCOURCI)).toBeNull();
  });
});
