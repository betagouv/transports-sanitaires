import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../front/app/App";
import { GalerieSeeds } from "../../front/outils-produit/seeds/GalerieSeeds";
import { SEEDS, seedParId } from "../../front/outils-produit/seeds/catalogue";
import { snapshotReferentiel } from "../../shared/referentiel";
import { remplirIdentiteProduit, sIdentifierProduit } from "../porte";

// La galerie est le point d'entrée dev du catalogue de seeds : elle doit montrer
// **toutes** les seeds, dire pour chacune si le moteur chargé confirme ses
// attendus, et ouvrir la page de résultat correspondante.

const GALERIE = { name: "Galerie de seeds" } as const;

/**
 * Ouvre la galerie depuis l'écran-porte. L'identification est obligatoire quelle que
 * soit la destination : le bouton la valide **et** ouvre la galerie.
 */
async function ouvrirGalerie(user: ReturnType<typeof userEvent.setup>) {
  await remplirIdentiteProduit(user);
  await user.click(screen.getByRole("button", GALERIE));
}

describe("écran de galerie", () => {
  it("liste toutes les seeds du catalogue", () => {
    render(<GalerieSeeds onOuvrir={() => {}} onRetour={() => {}} />);

    for (const seed of SEEDS) {
      expect(
        screen.getByRole("button", { name: `Ouvrir : ${seed.libelle}` }),
      ).toBeInTheDocument();
    }
  });

  it("sépare les seeds selon l'écran de résultat sur lequel elles atterrissent", () => {
    render(<GalerieSeeds onOuvrir={() => {}} onRetour={() => {}} />);

    const compte = (outil: "prescripteur" | "secretariat") =>
      SEEDS.filter((s) => s.outil === outil).length;

    const [p1, p2] = screen.getAllByRole("table");
    expect(
      within(p1).getAllByRole("button", { name: /^Ouvrir :/ }),
    ).toHaveLength(compte("prescripteur"));
    expect(
      within(p2).getAllByRole("button", { name: /^Ouvrir :/ }),
    ).toHaveLength(compte("secretariat"));
  });

  it("donne à chaque seed son régime de financement, non-conformités comprises", () => {
    // La colonne « Qui paie » est ce qui rend une non-conformité repérable d'un
    // coup d'œil : un régime autre qu'« assurance maladie ».
    render(<GalerieSeeds onOuvrir={() => {}} onRetour={() => {}} />);

    const ligne = (id: string) =>
      screen
        .getByRole("button", { name: `Ouvrir : ${seedParId(id).libelle}` })
        .closest("tr")!;

    expect(ligne("secretariat-detenu-inter-etablissements")).toHaveTextContent(
      "établissement prescripteur",
    );
    expect(ligne("prescripteur-ald-sans-lien")).toHaveTextContent(
      "à qualifier",
    );
    expect(ligne("secretariat-prescription")).toHaveTextContent(
      "assurance maladie",
    );
  });

  it("annonce que le moteur confirme les attendus du catalogue", () => {
    // Les règles officielles sont chargées : aucune seed ne doit être en écart.
    render(<GalerieSeeds onOuvrir={() => {}} onRetour={() => {}} />);

    expect(
      screen.getByText(/Le moteur chargé confirme les attendus des seeds/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/en écart avec leurs attendus/)).toBeNull();
  });

  it("remonte la seed choisie", async () => {
    const user = userEvent.setup();
    const ouvertes: string[] = [];
    render(
      <GalerieSeeds
        onOuvrir={(seed) => ouvertes.push(seed.id)}
        onRetour={() => {}}
      />,
    );

    const seed = seedParId("secretariat-convocation");
    await user.click(
      screen.getByRole("button", { name: `Ouvrir : ${seed.libelle}` }),
    );
    expect(ouvertes).toEqual([seed.id]);
  });
});

describe("galerie branchée sur l'App", () => {
  it("ouvre une seed de Partie 1 sur la page de résultat médical", async () => {
    const user = userEvent.setup();
    render(
      <App
        referentiel={snapshotReferentiel}
        pseudonymiser={async () => null}
      />,
    );

    await ouvrirGalerie(user);
    const seed = seedParId("prescripteur-ambulance");
    // La galerie est chargée à la demande (import dynamique) : d'où le `find`.
    await user.click(
      await screen.findByRole("button", { name: `Ouvrir : ${seed.libelle}` }),
    );

    // Page Résultat 1 : le transport retenu est celui qu'annonce la seed, sans
    // avoir répondu à une seule question.
    expect(
      await screen.findByRole("heading", { name: "Avis médical favorable" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/justifie le transport sanitaire suivant/),
    ).toHaveTextContent("ambulance");
    expect(screen.queryByRole("group", { name: /équipe SMUR/i })).toBeNull();
  });

  it("ouvre une seed de Partie 2 sur la page de résultat final", async () => {
    const user = userEvent.setup();
    render(
      <App
        referentiel={snapshotReferentiel}
        pseudonymiser={async () => null}
      />,
    );

    await ouvrirGalerie(user);
    const seed = seedParId("secretariat-accord-prealable-distance");
    await user.click(
      await screen.findByRole("button", { name: `Ouvrir : ${seed.libelle}` }),
    );

    expect(
      await screen.findByRole(
        "heading",
        { name: /Document à imprimer/i },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
    // Ce cas relève du S3139 : pas de CERFA de prescription proposé.
    expect(
      screen.queryByRole("button", {
        name: /Télécharger la prescription pré-remplie/i,
      }),
    ).toBeNull();
  });

  it("est aussi accessible depuis le début du parcours, et sait revenir", async () => {
    const user = userEvent.setup();
    render(
      <App
        referentiel={snapshotReferentiel}
        pseudonymiser={async () => null}
      />,
    );
    await sIdentifierProduit(user);

    await user.click(screen.getByRole("button", GALERIE));
    expect(
      await screen.findByRole("heading", { name: "Galerie de seeds" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retour" }));
    expect(
      await screen.findByRole("group", { name: /équipe SMUR/i }),
    ).toBeInTheDocument();
  });
});
