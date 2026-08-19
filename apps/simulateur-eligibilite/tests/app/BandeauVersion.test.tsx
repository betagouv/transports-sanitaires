import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../front/app/App";
import { BandeauVersion } from "../../front/app/BandeauVersion";
import { snapshotReferentiel } from "../../shared/referentiel";
import { sIdentifier } from "../porte";

// Le pied de page dit quel code et quel modèle un utilisateur a sous les yeux.
// Ses deux valeurs sont figées par Vite à la construction : ce fichier vérifie
// qu'elles arrivent bien jusqu'à l'écran, et qu'elles ne sont pas inventées.

const versionDesRegles = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../../regles/VERSION"),
  "utf8",
).trim();

describe("bandeau de version", () => {
  it("affiche la version du modèle telle que `regles/VERSION` la déclare", () => {
    // La garde contre la dérive : si la recopie d'une livraison oublie de mettre
    // `regles/VERSION` à jour, c'est un mensonge affiché à tous les utilisateurs.
    render(<BandeauVersion />);
    expect(
      screen.getByText(new RegExp(`règles ${versionDesRegles}`)),
    ).toBeInTheDocument();
  });

  it("affiche un sha de commit, jamais une valeur vide", () => {
    render(<BandeauVersion />);
    // Sept caractères hexadécimaux, ou l'aveu qu'on ne sait pas — jamais rien.
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      /Version (?:[0-9a-f]{7}|inconnu) · règles/,
    );
  });

  it("accompagne le simulateur, pas l'écran-porte", async () => {
    const user = userEvent.setup();
    render(
      <App
        referentiel={snapshotReferentiel}
        pseudonymiser={async () => null}
      />,
    );

    // L'identification n'est pas le produit : rien ne l'encombre.
    expect(screen.queryByRole("contentinfo")).toBeNull();

    await sIdentifier(user);
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/^Version /);
  });
});
