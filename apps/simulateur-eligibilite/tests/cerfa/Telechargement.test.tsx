import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PDFCheckBox, PDFDocument, PDFName } from "pdf-lib";
import type { Situation } from "publicodes";
import { describe, expect, it } from "vitest";
import {
  genererCerfa,
  nomFichier,
} from "../../front/outils-produit/beta/cerfa/cerfa";
import {
  MODE_TRANSPORT,
  SITUATION,
  TRAJET,
} from "../../front/outils-produit/beta/cerfa/champs-cerfa.ts";
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

/** Situation complète menant à une prescription médicale de transport (ambulance). */
const PRESCRIPTION: Situation<string> = {
  p1_situation_smur: "non",
  p1_situation_bariatrique_seul: "non",
  p1_situation_permission_sans_motif_medical: "'Non'",
  p1_motif_hospitalisation: "oui",
  p1_motif_seance_chimio_radio_hemodialyse: "non",
  p1_motif_ald: "non",
  p1_motif_accident_travail_maladie_professionnelle: "non",
  p1_motif_retour_etablissement_penitentiaire: "non",
  p1_motif_aucun: "non",
  p1_autonomie: "'Aucune de ces situations.'",
  p1_critere_regles_hygiene: "non",
  p1_critere_risques_effets_secondaires: "non",
  p1_critere_fauteuil_sans_transfert: "non",
  p1_critere_position_allongee_demi_assise: "oui",
  p1_critere_brancardage_portage: "oui",
  p1_critere_surveillance_personne_qualifiee: "non",
  p1_critere_oxygene: "non",
  p1_critere_asepsie: "non",
  p1_critere_aucune_situation_encadree: "non",
  p2_patient_hospitalise: "non",
  p2_convocation_ou_avis: "non",
  p2_prestation_prise_en_charge_assurance_maladie: "oui",
  p2_distance_aller_superieure_150km: "non",
  p2_chaque_trajet_aller_superieur_50km: "non",
  p2_avion_ou_bateau: "non",
  p2_camsp_cmpp: "non",
  p2_maternite_eloignee: "non",
  p2_samsah: "non",
  p2_accompagnement_tiers: "non",
  p2_trajet_aller_retour: "'Aller-retour'",
  p2_trajet_depart: "'Domicile'",
  p2_trajet_arrivee: "'Structure de soins'",
  p2_nombre_transports_prevus: "2",
  p2_transport_urgence: "'Non'",
  p2_accident_cause_par_tiers: "'Non'",
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
        outilsProduit
        chargerGabarit={chargerGabarit}
      />,
    );
    expect(screen.getByRole("button", BOUTON)).toBeInTheDocument();
  });

  it("annonce ce qui reste à compléter à la main", () => {
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={PRESCRIPTION}
        outilsProduit
        chargerGabarit={chargerGabarit}
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
        outilsProduit
        chargerGabarit={chargerGabarit}
      />,
    );
    // Accord préalable → formulaire S3139, pas ce CERFA.
    expect(screen.queryByRole("button", BOUTON)).toBeNull();
  });

  it("ne le propose pas à un service sans accès aux outils produit", () => {
    // Même situation, même cas final : c'est l'accès qui manque. Le résultat de
    // la simulation reste entièrement lisible — seul le document est retenu.
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={PRESCRIPTION}
        chargerGabarit={chargerGabarit}
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
        outilsProduit
        chargerGabarit={chargerGabarit}
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
        outilsProduit
        chargerGabarit={async () => {
          throw new Error("gabarit indisponible");
        }}
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
