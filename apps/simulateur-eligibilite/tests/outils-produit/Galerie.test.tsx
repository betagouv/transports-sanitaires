import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../../front/app/App";
import { SEEDS, seedParId } from "../../front/outils-produit/seeds/catalogue";
import { GalerieSeeds } from "../../front/outils-produit/seeds/GalerieSeeds";
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

  it("sépare les seeds selon l'écran sur lequel elles atterrissent", () => {
    render(<GalerieSeeds onOuvrir={() => {}} onRetour={() => {}} />);

    // Trois tableaux : les deux pages de résultat, puis les seeds qui s'arrêtent
    // en chemin et ouvrent le questionnaire.
    const compte = (outil: "prescripteur" | "secretariat") =>
      SEEDS.filter(
        (s) => s.outil === outil && s.atterrissage !== "questionnaire",
      ).length;

    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(3);
    const [p1, p2, questionnaire] = tables as [
      HTMLElement,
      HTMLElement,
      HTMLElement,
    ];
    expect(
      within(p1).getAllByRole("button", { name: /^Ouvrir :/ }),
    ).toHaveLength(compte("prescripteur"));
    expect(
      within(p2).getAllByRole("button", { name: /^Ouvrir :/ }),
    ).toHaveLength(compte("secretariat"));
    expect(
      within(questionnaire).getAllByRole("button", { name: /^Ouvrir :/ }),
    ).toHaveLength(
      SEEDS.filter((s) => s.atterrissage === "questionnaire").length,
    );
  });

  it("donne à chaque seed son régime de financement, non-conformités comprises", () => {
    // La colonne « Qui paie » est ce qui rend une non-conformité repérable d'un
    // coup d'œil : un régime autre qu'« Assurance Maladie ».
    render(<GalerieSeeds onOuvrir={() => {}} onRetour={() => {}} />);

    const ligne = (id: string) =>
      screen
        .getByRole("button", { name: `Ouvrir : ${seedParId(id).libelle}` })
        .closest("tr")!;

    expect(ligne("secretariat-detenu-inter-etablissements")).toHaveTextContent(
      "établissement prescripteur",
    );
    expect(ligne("prescripteur-ald-sans-incapacite")).toHaveTextContent(
      "aucune prise en charge dans ce parcours",
    );
    expect(ligne("secretariat-prescription")).toHaveTextContent(
      "Assurance Maladie",
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
  it("depuis un cas tranché en Partie 1, le document ramène au résultat médical", async () => {
    // Aucune question administrative à poser : l'écran en deçà du document est
    // le résultat médical, et « Précédent » doit y ramener — quel que soit ce
    // qu'a conclu la Partie 1, et quelle que soit la façon d'être arrivé là.
    const user = userEvent.setup({ delay: null });
    render(
      <App
        referentiel={snapshotReferentiel}
        pseudonymiser={async () => null}
      />,
    );

    await ouvrirGalerie(user);
    const seed = seedParId("prescripteur-smur");
    // La galerie est chargée à la demande, et l'ouverture d'une seed rejoue son
    // parcours : de quoi dépasser la seconde par défaut quand la suite tourne en
    // parallèle.
    await user.click(
      await screen.findByRole(
        "button",
        { name: `Ouvrir : ${seed.libelle}` },
        { timeout: 10_000 },
      ),
    );
    await user.click(
      screen.getByRole("button", { name: /voir le résultat final/i }),
    );
    expect(
      screen.getByRole("heading", { name: /document à imprimer/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^précédent$/i }));
    expect(
      screen.getByRole("heading", { name: /équipe SMUR/i }),
    ).toBeInTheDocument();
    // Et l'on repart d'où l'on vient : le résultat médical rouvre le document.
    expect(
      screen.getByRole("button", { name: /voir le résultat final/i }),
    ).toBeInTheDocument();
  }, 20_000);

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
      await screen.findByRole("heading", {
        name: /décision médicale établie/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/le mode de transport retenu est/i),
    ).toHaveTextContent("ambulance");
    expect(
      screen.queryByRole("group", {
        name: /^concernant son déplacement, le patient/i,
      }),
    ).toBeNull();
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
      await screen.findByRole("group", {
        name: /^concernant son déplacement, le patient/i,
      }),
    ).toBeInTheDocument();
  });
});
