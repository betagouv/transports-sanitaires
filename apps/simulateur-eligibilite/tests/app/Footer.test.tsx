import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../front/app/App";
import { Footer } from "../../front/app/Footer";
import { snapshotReferentiel } from "../../shared/referentiel";
import { seRattacher } from "../porte";

// Le pied de page dit quelle version et quel code un utilisateur a
// sous les yeux. Ses deux valeurs sont figées par Vite à la construction : ce
// fichier vérifie qu'elles arrivent bien jusqu'à l'écran, et qu'elles ne sont
// pas inventées.

const racine = join(dirname(fileURLToPath(import.meta.url)), "../..");
const versionDeLApp = JSON.parse(
  readFileSync(join(racine, "package.json"), "utf8"),
).version;

describe("bandeau de version", () => {
  it("affiche la version telle que `package.json` la déclare", () => {
    // Même garde, pour la version de l'app : un `pnpm version` qui n'irait pas
    // jusqu'à l'écran laisserait le support raisonner sur la précédente.
    render(<Footer />);
    expect(screen.getByRole("link")).toHaveTextContent(versionDeLApp);
  });

  it("renvoie à la release GitHub de cette version, dans une autre fenêtre", () => {
    // Le `@` du tag est encodé, et la nouvelle fenêtre n'est pas cosmétique :
    // l'application est embarquée en iframe, et naviguer dans le cadre y ferait
    // perdre le simulateur.
    render(<Footer />);
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
    render(<Footer />);
    // Sept caractères hexadécimaux, ou l'aveu qu'on ne sait pas — jamais rien.
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      /commit (?:[0-9a-f]{7}|inconnu)$/,
    );
  });

  it("accompagne le simulateur, pas l'écran-porte", async () => {
    const user = userEvent.setup();
    render(<App referentiel={snapshotReferentiel} />);

    // Le rattachement n'est pas le produit : rien ne l'encombre.
    expect(screen.queryByRole("contentinfo")).toBeNull();

    await seRattacher(user);
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/^Version /);
  });
});
