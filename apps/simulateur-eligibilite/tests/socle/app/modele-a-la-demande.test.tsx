// Le modèle qui se charge à la demande : l'écran de rattachement ne l'attend
// pas, le simulateur si.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../../../front/socle/app/App";
import type { Model } from "../../../front/socle/model";
import { rangerRattachement } from "../../../front/socle/rattachement/session";
import { snapshotReferentiel } from "../../../shared/referentiel";
import { modeleDeTest } from "../modele-de-test";
import { seRattacher } from "../se-rattacher";

const PREMIERE_QUESTION = { name: /^quelle boisson souhaitez-vous/i };

// Un chargement dont le test décide l'issue, et le moment.
function chargement() {
  let resolve: (model: Model) => void = () => {};
  let reject: (raison: Error) => void = () => {};
  const promesse = new Promise<Model>((tenir, rompre) => {
    resolve = tenir;
    reject = rompre;
  });
  const user = userEvent.setup();
  render(
    <App
      model={promesse}
      referentiel={snapshotReferentiel}
      declarer={() => {}}
    />,
  );
  return { user, resolve, reject };
}

beforeEach(() => rangerRattachement(null));

describe("le modèle chargé à la demande", () => {
  it("laisse se rattacher avant d'être arrivé", async () => {
    const { user } = chargement();

    await seRattacher(user);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Chargement du simulateur…",
    );
    expect(screen.queryByRole("group", PREMIERE_QUESTION)).toBeNull();
  });

  it("ouvre le simulateur dès qu'il arrive", async () => {
    const { user, resolve } = chargement();
    await seRattacher(user);

    resolve(modeleDeTest);

    expect(
      await screen.findByRole("group", PREMIERE_QUESTION),
    ).toBeInTheDocument();
  });

  it("dit qu'il n'a pas pu se charger", async () => {
    const { user, reject } = chargement();
    await seRattacher(user);

    reject(new Error("chunk introuvable"));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Le simulateur n’a pas pu se charger. Rechargez la page.",
    );
  });
});
