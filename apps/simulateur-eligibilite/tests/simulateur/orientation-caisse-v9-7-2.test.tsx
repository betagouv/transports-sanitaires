// Les contenus validés de l'orientation vers la caisse, recopiés mot pour mot
// du contrat v9.7.2 (`CONTRAT-RESULTATS-v9-7-2.md` § 1) dans `Bloc2Etapes.tsx`,
// `Bloc3CasRetenu.tsx`, `cases-documentaires.ts` et `orientation-caisse.tsx`.
// Identifiants du livrable : `RETOURS972-CAISSE-CONTRAT-TEXTES-VALIDES`,
// `RETOURS972-CAISSE-RENDU-ET-SYNTHESE-*`, `RETOURS972-CAISSE-CONTENUS-NON-DIFFUSES-AUX-AUTRES-CAS`,
// `INDEPENDANT972-CAISSE-CONSIGNE-ET-SYNTHESE-*`.

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";

beforeEach(() => sessionStorage.clear());

const REMAINING_COST =
  "À ce stade, le simulateur ne peut pas déterminer le montant qui restera à votre charge. Contactez votre caisse d’Assurance Maladie pour connaître les conditions de prise en charge applicables à ce trajet.";
const CASE_LABEL =
  "Convocation avec transport en avion ou bateau : orientation vers la caisse";
const CHECKS = [
  "Vérifier que la convocation ou l’avis d’audience mentionne le mode de transport adapté.",
  "Confirmer les caractéristiques du trajet : avion ou bateau de ligne régulière et distance aller.",
  "Contacter la caisse avec la convocation et la synthèse pour confirmer la procédure, les pièces nécessaires et la personne qui doit établir la demande.",
];
const AWAITING =
  "Contactez votre caisse avant le transport pour organiser la demande d’accord préalable.";
const URGENT =
  "L’urgence médicale attestée permet de réaliser le transport sans attendre la réponse de la caisse.";

const CAISSE = {
  ...BASE_NEUTRE,
  p2_convocation_ou_avis_type:
    "'Convocation du contrôle médical de l’Assurance Maladie.'",
  p2_convocation_avion_bateau: "oui",
  p2_convocation_aucune: "non",
};

describe("RETOURS972-CAISSE-CONTRAT-TEXTES-VALIDES — les contenus rendus", () => {
  it.each([
    ["NON-URGENTE", { ...CAISSE, p2_transport_urgence: "'Non'" }, AWAITING],
    [
      "URGENTE",
      {
        ...CAISSE,
        p2_transport_urgence: "'Appel au SAMU - Centre 15'",
      },
      URGENT,
    ],
  ] as const)(
    "RETOURS972-CAISSE-RENDU-ET-SYNTHESE-%s",
    (_nom, situationFinale, instructionAttendue) => {
      render(
        <Secretariat
          onNouvelleSimulation={() => {}}
          situationFinale={situationFinale}
        />,
      );

      // Bloc 1 — le verdict porte la consigne conditionnelle, une seule fois.
      const verdict = screen.getByRole("heading", {
        name: /contactez votre caisse pour organiser/i,
      }).parentElement as HTMLElement;
      expect(within(verdict).getAllByText(instructionAttendue)).toHaveLength(1);
      const autreInstruction =
        instructionAttendue === AWAITING ? URGENT : AWAITING;
      expect(
        within(verdict).queryByText(autreInstruction),
      ).not.toBeInTheDocument();

      // Bloc 2 — reste à charge, et aucune répétition de la consigne.
      expect(screen.getByText(REMAINING_COST)).toBeInTheDocument();
      expect(screen.getAllByText(instructionAttendue)).toHaveLength(1);

      // Bloc 3 — le cas retenu, et les trois points à vérifier.
      expect(screen.getByText(CASE_LABEL)).toBeInTheDocument();
      for (const point of CHECKS)
        expect(screen.getByText(point)).toBeInTheDocument();
    },
  );
});

describe("RETOURS972-CAISSE-CONTENUS-NON-DIFFUSES-AUX-AUTRES-CAS", () => {
  it("n’apparaissent pas sur une DAP ordinaire", () => {
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={{
          ...BASE_NEUTRE,
          p2_tranche_distance_trajet_aller: "'Plus de 150 km'",
        }}
      />,
    );
    expect(screen.queryByText(REMAINING_COST)).not.toBeInTheDocument();
    expect(screen.queryByText(CASE_LABEL)).not.toBeInTheDocument();
    for (const point of CHECKS)
      expect(screen.queryByText(point)).not.toBeInTheDocument();
  });
});
