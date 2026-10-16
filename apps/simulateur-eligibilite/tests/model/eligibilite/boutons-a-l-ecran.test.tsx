// Les boutons du résultat du modèle de l'éditeur, comme à l'écran (#137) : le
// vrai simulateur, ouvert sur une seed de l'écran des seeds. Chaque issue a ses
// boutons, et seulement eux. Les libellés se testent issue par issue dans
// `boutons-du-resultat.test.ts`.

import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { model } from "../../../front/models/eligibilite";
import { catalogueResultats } from "../../../front/models/eligibilite/catalogue-resultats";
import { SEEDS } from "../../../front/models/eligibilite/seeds-catalogue";
import { rangerRattachement } from "../../../front/socle/rattachement/session";
import { ouvrirLeSimulateur } from "../../socle/simulateur/questionnaire";

// Le catalogue des textes et celui des seeds sont chargés une fois : la
// première fiche n'attend pas leurs 900 ko.
await catalogueResultats();
await model.seeds();

const PRECEDENT = "Précédent";
const NOUVELLE = "Nouvelle simulation";
const IMPRIMER = "Imprimer la fiche patient";

// L'écran des seeds liste une trentaine de situations : sous la charge de la
// suite entière, il met plus que la seconde par défaut.
const ATTENTE = { timeout: 4000 };

beforeEach(() => rangerRattachement(null));

async function ouvrirLaSeed(id: string) {
  const seed = SEEDS.find((candidate) => candidate.id === id);
  if (!seed) throw new Error(`Seed inconnue : ${id}`);
  const user = await ouvrirLeSimulateur({ produit: true, modele: model });
  await user.click(
    await screen.findByRole("button", { name: "Seeds" }, ATTENTE),
  );
  await user.click(
    await screen.findByRole(
      "button",
      { name: `Ouvrir : ${seed.label}` },
      ATTENTE,
    ),
  );
  await screen.findByRole(
    "heading",
    { name: "Résultat de l’éligibilité" },
    ATTENTE,
  );
}

// Les boutons que le résultat peut poser, dans l'ordre où il les pose. Ceux des
// developer tools et de la trace de debug n'y figurent pas.
const boutonsDuResultat = () =>
  [
    PRECEDENT,
    NOUVELLE,
    IMPRIMER,
    "Compléter la prescription",
    "Compléter la demande",
  ].filter((nom) => screen.queryByRole("button", { name: nom }) !== null);

describe("les boutons du modèle de l'éditeur", () => {
  it.each([
    ["issue-caisse", [PRECEDENT, NOUVELLE]],
    ["issue-etablissement", [PRECEDENT, NOUVELLE]],
    ["issue-permission-patient", [PRECEDENT, NOUVELLE]],
    ["issue-convocation", [PRECEDENT, NOUVELLE]],
    ["issue-non-eligible", [PRECEDENT, NOUVELLE, IMPRIMER]],
    ["issue-pmt", [PRECEDENT, NOUVELLE, IMPRIMER]],
    ["issue-dap-sans-urgence", [PRECEDENT, NOUVELLE, IMPRIMER]],
    ["issue-dap-urgence-attestee", [PRECEDENT, NOUVELLE, IMPRIMER]],
    ["issue-s3141", [PRECEDENT, NOUVELLE, IMPRIMER]],
    ["issue-dap-etranger-a-examiner", [PRECEDENT, NOUVELLE]],
  ])("%s a ses boutons, et seulement eux", async (id, attendus) => {
    await ouvrirLaSeed(id);

    expect(boutonsDuResultat()).toEqual(attendus);
  });

  it("n'imprime pas le titre du cadre, la fiche porte le sien", async () => {
    await ouvrirLaSeed("issue-pmt");

    const titre = screen.getByRole("heading", {
      name: "Résultat de l’éligibilité",
    });
    expect(titre.closest(".fr-no-print")).not.toBeNull();
  });

  it("garde le stepper sur le résultat : P3 n'a pas encore de page", async () => {
    await ouvrirLaSeed("issue-pmt");

    expect(
      screen.getByRole("heading", { name: "Étape 3 sur 3" }),
    ).toBeInTheDocument();
  });
});
