import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../../front/socle/app/App";
import { Footer } from "../../../front/socle/app/Footer";
import { snapshotReferentiel } from "../../../shared/referentiel";
import { seRattacher } from "../se-rattacher";

// Le pied de page affiche la version et le commit. Vite fige ces deux valeurs à
// la construction. Ces tests vérifient qu'elles arrivent à l'écran.

const racine = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const versionDeLApp = JSON.parse(
  readFileSync(join(racine, "package.json"), "utf8"),
).version;

describe("pied de page", () => {
  it("affiche la version telle que `package.json` la déclare", () => {
    // Même garde pour la version de l'app. Sinon le support raisonne sur la
    // version précédente.
    render(<Footer />);
    expect(screen.getByRole("link")).toHaveTextContent(versionDeLApp);
  });

  it("renvoie à la release GitHub de cette version, dans une autre fenêtre", () => {
    // Le `@` du tag est encodé. Le lien ouvre une nouvelle fenêtre : dans
    // l'iframe, naviguer sur place ferait perdre le simulateur.
    render(<Footer />);
    const lien = screen.getByRole("link");
    expect(lien).toHaveAttribute(
      "href",
      "https://github.com/betagouv/transports-sanitaires/releases/tag/" +
        `simulateur-eligibilite%40${versionDeLApp}`,
    );
    expect(lien).toHaveAttribute("target", "_blank");
    // Le lien se nomme déjà « 0.1.0 ». Le DSFR annonce la nouvelle fenêtre par
    // le `title`, lu comme description.
    expect(lien).toHaveAccessibleDescription(/nouvelle fenêtre/);
  });

  it("affiche un sha de commit, jamais une valeur vide", () => {
    render(<Footer />);
    // Sept caractères hexadécimaux, ou l'aveu qu'on ne sait pas. Jamais rien.
    expect(screen.getByRole("contentinfo")).toHaveTextContent(
      /commit (?:[0-9a-f]{7}|inconnu)$/,
    );
  });

  it("accompagne le simulateur, pas l'écran de rattachement", async () => {
    const user = userEvent.setup();
    render(<App referentiel={snapshotReferentiel} />);

    // Le rattachement n'est pas le produit : rien ne l'encombre.
    expect(screen.queryByRole("contentinfo")).toBeNull();

    await seRattacher(user);
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/^Version /);
  });
});
