import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../front/app/App";
import { Prescripteur } from "../../front/simulateur/prescripteur/Prescripteur";
import { seedParId } from "../../front/outils-produit/seeds/catalogue";
import { snapshotReferentiel } from "../../shared/referentiel";
import { sIdentifierProduit } from "../porte";

const GABARIT = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../front/outils-produit/beta/cerfa/gabarit/cerfa-11574-07.pdf"),
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

const GALERIE = { name: "Galerie de seeds" } as const;
const SEED_CERFA = seedParId("secretariat-prescription");
const OUVRIR_SEED = { name: `Ouvrir : ${SEED_CERFA.libelle}` } as const;
const TELECHARGER = { name: /Télécharger la prescription pré-remplie/i } as const;

beforeEach(() => sessionStorage.clear());

describe("accès au CERFA via la galerie de seeds", () => {
  it("est proposé dès le début du parcours prescripteur", async () => {
    const { user } = setup();
    await sIdentifierProduit(user);

    // Le parcours est bien à sa première question, et la galerie est offerte.
    expect(await screen.findByRole("group", { name: /équipe SMUR/i })).toBeInTheDocument();
    expect(screen.getByRole("button", GALERIE)).toBeInTheDocument();
  });

  it("saute le questionnaire et ouvre l'écran qui propose le CERFA", async () => {
    const { user } = setup();
    await sIdentifierProduit(user);
    await user.click(screen.getByRole("button", GALERIE));
    // La galerie est chargée à la demande (import dynamique) : d'où le `find`.
    await user.click(await screen.findByRole("button", OUVRIR_SEED));

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
    await sIdentifierProduit(user);
    await user.click(screen.getByRole("button", GALERIE));
    // La galerie est chargée à la demande (import dynamique) : d'où le `find`.
    await user.click(await screen.findByRole("button", OUVRIR_SEED));

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
    await sIdentifierProduit(user);
    await user.click(screen.getByRole("button", GALERIE));
    // La galerie est chargée à la demande (import dynamique) : d'où le `find`.
    await user.click(await screen.findByRole("button", OUVRIR_SEED));

    // L'accès dev appartient au début du parcours : il n'encombre pas le résultat.
    expect(screen.queryByRole("button", GALERIE)).toBeNull();
  });

  it("n'existe pas quand l'accès n'est pas fourni", () => {
    // `App` ne passe `onGalerieSeeds` que pour le service produit (n° 4) : un
    // prescripteur ordinaire ne peut pas court-circuiter son parcours. Ce test
    // couvre le mécanisme (prop absente ⇒ pas de bouton), la garde d'accès
    // elle-même étant vérifiée dans `tests/outils-produit/Encadre.test.tsx`.
    render(
      <Prescripteur onPasserAuSecretariat={() => {}} onNouvelleSimulation={() => {}} />,
    );
    expect(screen.getByRole("group", { name: /équipe SMUR/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", GALERIE)).toBeNull();
  });
});
