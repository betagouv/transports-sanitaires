import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PDFCheckBox, PDFDocument, PDFName } from "pdf-lib";
import type { Situation } from "publicodes";
import { describe, expect, it } from "vitest";
import { BoutonCerfa } from "../../front/outils-produit/beta/cerfa/BoutonCerfa";
import {
  genererCerfa,
  nomFichier,
} from "../../front/outils-produit/beta/cerfa/cerfa";
import {
  MODE_TRANSPORT,
  SITUATION,
  TRAJET,
} from "../../front/outils-produit/beta/cerfa/champs-cerfa.ts";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { moteur } from "../../front/simulateur/moteur";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";

// Le vrai gabarit, lu sur disque : en test il n'y a pas de serveur pour le
// `fetch` de l'asset. C'est le même fichier que celui servi en production.
const GABARIT = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../front/outils-produit/beta/cerfa/gabarit/cerfa-11574-07.pdf",
  ),
);
const chargerGabarit = async () => GABARIT.buffer.slice(0) as ArrayBuffer;

// Ce que `App` branche pour un service ayant accès aux outils produit — le
// simulateur, lui, ne connaît que la fonction. Le fait que seul le service n° 4
// la reçoive relève d'`App`, et se teste à ce niveau (cf. `Encadre.test.tsx`).
const documentTelechargeable = (situation: Situation<string>) => (
  <BoutonCerfa
    moteur={moteur}
    situation={situation}
    chargerGabarit={chargerGabarit}
  />
);

/** Situation complète menant à une prescription médicale de transport (ambulance). */
const PRESCRIPTION: Situation<string> = {
  ...BASE_NEUTRE,
  p1_autonomie:
    "'Nécessite une prise en charge spécifique pendant le trajet ou l’aide d’un professionnel pour se déplacer ou accomplir les formalités liées au transport.'",
  p1_critere_position_allongee_demi_assise: "oui",
  p1_critere_brancardage_portage: "oui",
  p2_contexte_hospitalisation: "oui",
  p2_contexte_aucun: "non",
  p2_trajet_aller_retour: "'aller-retour identique'",
  p2_nombre_transports_prevus: "2",
};

/** Même situation, mais > 150 km : bascule sur une demande d'accord préalable. */
const ACCORD_PREALABLE: Situation<string> = {
  ...PRESCRIPTION,
  p2_distance_aller_superieure_150km: "oui",
};

const BOUTON = { name: /Télécharger la prescription pré-remplie/i } as const;

describe("genererCerfa", () => {
  it("produit un PDF portant les déductions du moteur", async () => {
    const blob = await genererCerfa(moteur, PRESCRIPTION, { chargerGabarit });
    expect(blob.type).toBe("application/pdf");

    const formulaire = (
      await PDFDocument.load(await blob.arrayBuffer())
    ).getForm();
    const état = (nom: string) => {
      const champ = formulaire.getField(nom);
      return champ instanceof PDFCheckBox
        ? champ.acroField.dict.get(PDFName.of("V"))?.toString()
        : undefined;
    };

    expect(état(MODE_TRANSPORT.positionAllongéeDemiAssise.nom)).toBe("/On");
    expect(état(MODE_TRANSPORT.brancardagePortage.nom)).toBe("/On");
    expect(état(SITUATION.entréeSortieHospitalisation.nom)).toBe("/NON"); // état d'export
    expect(état(TRAJET.allerRetour.nom)).toBe("/On");
    // Justification non retenue par le moteur : jamais cochée.
    expect(état(MODE_TRANSPORT.oxygène.nom)).toBeUndefined();
  });

  it("laisse vierges les blocs d'identité, que le simulateur ne connaît pas", async () => {
    const blob = await genererCerfa(moteur, PRESCRIPTION, { chargerGabarit });
    const formulaire = (
      await PDFDocument.load(await blob.arrayBuffer())
    ).getForm();

    for (const nom of [
      "N et P bénéficiaire",
      "N° immat bénéf",
      "Date Nais",
      "N et P prescript",
    ]) {
      expect(formulaire.getTextField(nom).getText()).toBeUndefined();
    }
  });

  it("nomme le fichier avec la date du jour", () => {
    expect(nomFichier(new Date(2026, 7, 17))).toBe(
      "prescription-medicale-transport-2026-08-17.pdf",
    );
  });
});

describe("fin de parcours — téléchargement du CERFA", () => {
  it("propose le CERFA quand le cas final est une prescription de transport", () => {
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={PRESCRIPTION}
        documentTelechargeable={documentTelechargeable}
      />,
    );
    expect(screen.getByRole("button", BOUTON)).toBeInTheDocument();
  });

  it("annonce ce qui reste à compléter à la main", () => {
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={PRESCRIPTION}
        documentTelechargeable={documentTelechargeable}
      />,
    );
    expect(
      screen.getByText(/l'identité du patient et de l'assuré/i),
    ).toBeInTheDocument();
  });

  it("ne le propose pas quand le cas relève d'un autre formulaire", () => {
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={ACCORD_PREALABLE}
        documentTelechargeable={documentTelechargeable}
      />,
    );
    // Accord préalable → formulaire S3139, pas ce CERFA.
    expect(screen.queryByRole("button", BOUTON)).toBeNull();
  });

  it("ne propose rien quand aucun document ne lui est fourni", () => {
    // Même situation, même cas final : c'est le rendu du document qui manque.
    // Le résultat de la simulation reste entièrement lisible — défaut fermé.
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={PRESCRIPTION}
      />,
    );
    expect(screen.queryByRole("button", BOUTON)).toBeNull();
    expect(
      screen.getByRole("heading", { name: /Document à imprimer/i }),
    ).toBeInTheDocument();
  });

  it("génère le document au clic sans laisser le bouton bloqué", async () => {
    const user = userEvent.setup();
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={PRESCRIPTION}
        documentTelechargeable={documentTelechargeable}
      />,
    );

    await user.click(screen.getByRole("button", BOUTON));

    // Le bouton se verrouille le temps de la génération…
    expect(
      screen.getByRole("button", { name: /Génération en cours/i }),
    ).toBeDisabled();
    // …puis revient à son état initial, sans alerte : le PDF a bien été produit
    // et remis au navigateur (l'échec, lui, est couvert par le test suivant).
    // Timeout élargi : charger puis réécrire un gabarit de 767 ko dépasse la
    // seconde par défaut quand la suite tourne en parallèle.
    await waitFor(
      () => expect(screen.getByRole("button", BOUTON)).not.toBeDisabled(),
      {
        timeout: 10_000,
      },
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("signale l'échec sans masquer le résultat déjà affiché", async () => {
    const user = userEvent.setup();
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={PRESCRIPTION}
        documentTelechargeable={(situation) => (
          <BoutonCerfa
            moteur={moteur}
            situation={situation}
            chargerGabarit={async () => {
              throw new Error("gabarit indisponible");
            }}
          />
        )}
      />,
    );

    await user.click(screen.getByRole("button", BOUTON));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /n'a pas pu être généré/i,
    );
    // Le résultat de la simulation reste lisible.
    expect(
      screen.getByRole("heading", { name: /Document à imprimer/i }),
    ).toBeInTheDocument();
  });
});
