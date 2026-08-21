import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PDFCheckBox, PDFDocument, PDFName } from "pdf-lib";
import type { Situation } from "publicodes";
import { describe, expect, it } from "vitest";
import { BoutonCerfa } from "../../front/outils-produit/beta/cerfa/BoutonCerfa";
import { DAP } from "../../front/outils-produit/beta/cerfa/dap/document";
import type { DocumentCerfa } from "../../front/outils-produit/beta/cerfa/document";
import {
  genererCerfa,
  nomFichier,
} from "../../front/outils-produit/beta/cerfa/document";
import { PMT } from "../../front/outils-produit/beta/cerfa/pmt/document";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { moteur } from "../../front/simulateur/moteur";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { GABARIT, GABARIT_DAP } from "./gabarit";

// Les vrais gabarits, lus sur disque : en test il n'y a pas de serveur pour le
// `fetch` de l'asset. Ce sont les mêmes fichiers que ceux servis en production, et
// c'est le document demandé qui dit lequel servir.
const chargerGabarit = async (document: DocumentCerfa) =>
  (document === DAP ? GABARIT_DAP : GABARIT).buffer.slice(0) as ArrayBuffer;

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

/** Un cas final qui nomme un document, mais dont nous ne produisons aucun CERFA. */
const CONVOCATION: Situation<string> = {
  ...BASE_NEUTRE,
  p2_convocation_ou_avis: "oui",
  p2_convocation_ou_avis_type: "'Convocation du contrôle médical.'",
};

const BOUTON = { name: /Télécharger la prescription pré-remplie/i } as const;
const BOUTON_DAP = {
  name: /Télécharger la demande d’accord préalable pré-remplie/i,
} as const;

describe("genererCerfa", () => {
  it("produit un PDF portant les déductions du moteur", async () => {
    const blob = await genererCerfa(PMT, moteur, PRESCRIPTION, {
      chargerGabarit,
    });
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

    expect(état("position allongée ou demiassise")).toBe("/On");
    expect(état("brancardage ou dun portage")).toBe("/On");
    expect(état("entré sortie hosp")).toBe("/NON"); // état d'export
    expect(état("transp aller-retour")).toBe("/On");
    // Justification non retenue par le moteur : jamais cochée.
    expect(état("dadministration doxygène")).toBeUndefined();
  });

  it("laisse vierges les blocs d'identité, que le simulateur ne connaît pas", async () => {
    const blob = await genererCerfa(PMT, moteur, PRESCRIPTION, {
      chargerGabarit,
    });
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

  it("produit l’autre formulaire pour un accord préalable", async () => {
    // Le même chemin de génération, un autre descripteur : c'est tout ce qui
    // distingue les deux documents.
    const blob = await genererCerfa(DAP, moteur, ACCORD_PREALABLE, {
      chargerGabarit,
    });
    const formulaire = (
      await PDFDocument.load(await blob.arrayBuffer())
    ).getForm();

    // Le champ des motifs, en « plus de 150 km » — un champ qui n'existe pas sur
    // la prescription : le PDF produit est bien la S3139h.
    expect(
      formulaire.getField("km").acroField.dict.get(PDFName.of("V"))?.toString(),
    ).toBe("/Oui");
  });

  it("nomme le fichier d’après le formulaire et la date du jour", () => {
    expect(nomFichier(PMT, new Date(2026, 7, 17))).toBe(
      "prescription-medicale-transport-2026-08-17.pdf",
    );
    expect(nomFichier(DAP, new Date(2026, 7, 17))).toBe(
      "demande-accord-prealable-2026-08-17.pdf",
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

  it("annonce ce qui reste à compléter à la main, formulaire par formulaire", () => {
    const reste = /Restent à compléter et à signer/i;
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={PRESCRIPTION}
        documentTelechargeable={documentTelechargeable}
      />,
    );
    expect(screen.getByText(reste)).toHaveTextContent(
      /l’identité du patient et de l’assuré/i,
    );

    cleanup();
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={ACCORD_PREALABLE}
        documentTelechargeable={documentTelechargeable}
      />,
    );
    // Propre à la demande : deux rubriques y sont réservées à la caisse.
    expect(screen.getByText(reste)).toHaveTextContent(
      /les avis médical et administratif sont, eux, réservés à votre caisse/i,
    );
  });

  it("propose l'autre formulaire quand le cas final est un accord préalable", () => {
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={ACCORD_PREALABLE}
        documentTelechargeable={documentTelechargeable}
      />,
    );
    // Accord préalable → S3139, et non la prescription : c'est le cas final qui
    // désigne le formulaire, le simulateur n'en connaît aucun.
    expect(screen.getByRole("button", BOUTON_DAP)).toBeInTheDocument();
    expect(screen.queryByRole("button", BOUTON)).toBeNull();
  });

  it("ne propose aucun CERFA quand le cas final n'en ouvre pas", () => {
    // Le modèle nomme un document dans quatre cas ; deux seulement sont des CERFA
    // que nous produisons. Une convocation vaut prescription à elle seule.
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={CONVOCATION}
        documentTelechargeable={documentTelechargeable}
      />,
    );
    expect(screen.queryByRole("button", BOUTON)).toBeNull();
    expect(screen.queryByRole("button", BOUTON_DAP)).toBeNull();
    expect(
      screen.getByRole("heading", { name: /Document à imprimer/i }),
    ).toBeInTheDocument();
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
