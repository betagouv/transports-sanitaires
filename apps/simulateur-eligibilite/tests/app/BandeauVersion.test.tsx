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

// Le pied de page dit quelle version, quel code et quel modèle un utilisateur a
// sous les yeux. Ses trois valeurs sont figées par Vite à la construction : ce
// fichier vérifie qu'elles arrivent bien jusqu'à l'écran, et qu'elles ne sont
// pas inventées.

const racine = join(dirname(fileURLToPath(import.meta.url)), "../..");
const versionDesRegles = readFileSync(
  join(racine, "regles/VERSION"),
  "utf8",
).trim();
const versionDeLApp = JSON.parse(
  readFileSync(join(racine, "package.json"), "utf8"),
).version;

describe("bandeau de version", () => {
  it("affiche la version du modèle telle que `regles/VERSION` la déclare", () => {
    // La garde contre la dérive : si la recopie d'une livraison oublie de mettre
    // `regles/VERSION` à jour, c'est un mensonge affiché à tous les utilisateurs.
    render(<BandeauVersion />);
    expect(
      screen.getByText(new RegExp(`règles ${versionDesRegles}`)),
    ).toBeInTheDocument();
  });

  it("affiche la version telle que `package.json` la déclare", () => {
    // Même garde, pour la version de l'app : un `pnpm version` qui n'irait pas
    // jusqu'à l'écran laisserait le support raisonner sur la précédente.
    render(<BandeauVersion />);
    expect(screen.getByRole("link")).toHaveTextContent(versionDeLApp);
  });

  it("renvoie à la release GitHub de cette version, dans une autre fenêtre", () => {
    // Le `@` du tag est encodé, et la nouvelle fenêtre n'est pas cosmétique :
    // l'application est embarquée en iframe, et naviguer dans le cadre y ferait
    // perdre le simulateur.
    render(<BandeauVersion />);
    const lien = screen.getByRole("link");
    expect(lien).toHaveAttribute(
      "href",
      "https://github.com/betagouv/transports-sanitaires/releases/tag/" +
        `simulateur-eligibilite%40${versionDeLApp}`,
    );
    expect(lien).toHaveAttribute("target", "_blank");
    // Le lien porte déjà « 0.1.0 » comme nom : c'est en description que DSFR
    // fait annoncer la nouvelle fenêtre, par le `title`.
    expect(lien).toHaveAccessibleDescription(/nouvelle fenêtre/);
  });

  it("affiche un sha de commit, jamais une valeur vide", () => {
    render(<BandeauVersion />);
    // Sept caractères hexadécimaux, ou l'aveu qu'on ne sait pas — jamais rien.
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      /commit (?:[0-9a-f]{7}|inconnu) · règles/,
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
