// Un texte médical qui déborde de sa rubrique se révise à l'écran, puis se
// remesure avant la génération (contrat EM-2, TS973-12). Rien n'est coupé ni
// mis en annexe, et le résultat reste imprimable.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { BoutonCerfa } from "../../front/outils-produit/beta/cerfa/BoutonCerfa";
import { DAP } from "../../front/outils-produit/beta/cerfa/dap/document";
import {
  type DocumentCerfa,
  genererCerfa,
} from "../../front/outils-produit/beta/cerfa/document";
import { DebordementDuTexteMedical } from "../../front/outils-produit/beta/cerfa/elements-medicaux/debordement-du-texte-medical";
import { PMT } from "../../front/outils-produit/beta/cerfa/pmt/document";
import { seedParId } from "../../front/outils-produit/seeds/catalogue";
import { situationDe } from "../../front/outils-produit/seeds/seed";
import { moteur } from "../../front/simulateur/moteur";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { GABARIT, GABARIT_DAP, relire } from "./gabarit";

const chargerGabarit = async (document: DocumentCerfa) =>
  (document === DAP ? GABARIT_DAP : GABARIT).buffer.slice(0) as ArrayBuffer;

// Entrée en hospitalisation et cinq besoins de transport : le texte composé
// ne tient pas dans la rubrique ⑤, même au plancher de lisibilité.
const TROP_LONG = situationDe(seedParId("secretariat-prescription"));
const REVISE = "Entrée en hospitalisation ; brancard, oxygène, asepsie.";

/** Le texte composé de `TROP_LONG`, tel que le débordement le rend. */
async function texteQuiDeborde(): Promise<string> {
  const erreur = await genererCerfa(PMT, moteur, TROP_LONG, {
    chargerGabarit,
  }).catch((cause: unknown) => cause);
  expect(erreur).toBeInstanceOf(DebordementDuTexteMedical);
  return (erreur as DebordementDuTexteMedical).texte;
}

describe("genererCerfa et la révision", () => {
  it("un texte qui déborde ne produit aucun PDF", async () => {
    await expect(
      genererCerfa(PMT, moteur, TROP_LONG, { chargerGabarit }),
    ).rejects.toBeInstanceOf(DebordementDuTexteMedical);
  });

  it("le texte révisé remplace le texte composé qu'il révisait", async () => {
    const compose = await texteQuiDeborde();
    const blob = await genererCerfa(PMT, moteur, TROP_LONG, {
      chargerGabarit,
      revision: { compose, revise: REVISE },
    });
    const pdf = new Uint8Array(await blob.arrayBuffer());
    expect((await relire(pdf))["comm évent"]).toBe(REVISE);
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(4);
  });

  it("une révision vide ne vide pas la rubrique", async () => {
    const compose = await texteQuiDeborde();
    await expect(
      genererCerfa(PMT, moteur, TROP_LONG, {
        chargerGabarit,
        revision: { compose, revise: "   " },
      }),
    ).rejects.toBeInstanceOf(DebordementDuTexteMedical);
  });

  it("une révision d'un autre texte composé ne vaut plus", async () => {
    // Les réponses ont changé depuis : le texte composé n'est plus celui que
    // le prescripteur avait révisé.
    await expect(
      genererCerfa(PMT, moteur, TROP_LONG, {
        chargerGabarit,
        revision: { compose: "Un ancien texte composé", revise: REVISE },
      }),
    ).rejects.toBeInstanceOf(DebordementDuTexteMedical);
  });
});

describe("la révision à l'écran", () => {
  it("montre le texte entier, le fait reformuler, puis génère", async () => {
    const user = userEvent.setup();
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={TROP_LONG}
        documentTelechargeable={(situation) => (
          <BoutonCerfa
            moteur={moteur}
            situation={situation}
            chargerGabarit={chargerGabarit}
          />
        )}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Télécharger la prescription/i }),
    );
    const texte = await screen.findByRole(
      "textbox",
      { name: /Éléments d’ordre médical à reporter/i },
      { timeout: 10_000 },
    );
    const compose = (texte as HTMLTextAreaElement).value;
    expect(compose).toMatch(/^Entrée en hospitalisation ; .* d’asepsie\.$/);
    expect(compose).not.toMatch(/annexe/);
    expect(screen.getByText(/ne tient pas dans la rubrique/i)).toBeVisible();
    // Le résultat reste lisible, donc imprimable.
    expect(screen.getByRole("button", { name: /^Imprimer$/ })).toBeEnabled();

    // Une révision vide ne se génère pas.
    await user.clear(texte);
    expect(
      screen.getByRole("button", { name: /Remesurer et télécharger/i }),
    ).toBeDisabled();

    await user.type(texte, REVISE);
    await user.click(
      screen.getByRole("button", { name: /Remesurer et télécharger/i }),
    );

    await waitFor(
      () =>
        expect(
          screen.getByText(/porte votre texte révisé/i),
        ).toBeInTheDocument(),
      { timeout: 10_000 },
    );
    expect(screen.queryByText(/ne tient pas dans la rubrique/i)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(
      screen.getByRole("button", { name: /Télécharger la prescription/i }),
    ).toBeEnabled();
  }, 30_000);
});
