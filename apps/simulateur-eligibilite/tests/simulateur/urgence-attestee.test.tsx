// L'urgence médicale attestée sur la Page Résultat 2, telle que la v9.5.1 la
// rend.
//
// Le modèle expose deux cibles, et l'application n'a qu'à les lire :
// `cible_urgence_attestee` dit que l'urgence est établie,
// `cible_attente_accord_prealable_requise` dit s'il faut attendre la décision de
// l'Assurance Maladie. Le document, lui, ne change pas : une cause réglementaire
// de DAP reste une DAP.
//
// Ce qui se vérifie ici est l'exclusion mutuelle des deux variantes. Une DAP
// urgente ne doit porter aucune phrase d'attente, de réserve ou de délai de 15
// jours ; une DAP standard doit les porter toutes. Une phrase d'attente laissée
// sur un résultat urgent retarderait un transport qui n'a pas à l'être.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { seedParId } from "../../front/outils-produit/seeds/catalogue";
import { situationDe } from "../../front/outils-produit/seeds/seed";
import { ResultatFinal } from "../../front/simulateur/secretariat/ResultatFinal";

// Les phrases de la variante standard, celles qu'une DAP urgente ne doit jamais
// porter. Le délai de 15 jours se cite dans les deux variantes — l'une l'impose,
// l'autre en dispense — d'où la phrase entière plutôt que le seul délai.
const ATTENTE = [
  /sous réserve/i,
  /attendez la réponse/i,
  /l’absence de réponse dans un délai de 15 jours/i,
  /une fois l’accord obtenu/i,
];

describe("demande d’accord préalable en urgence attestée", () => {
  it("dit que le transport n’attend pas la décision", () => {
    afficher("secretariat-urgence-dap");

    expect(
      screen.getByRole("heading", { name: /urgence médicale attestée/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/permet sa réalisation sans attendre la réponse/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Demande d’Accord Préalable valant prescription médicale",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ni le délai de 15 jours avant la réalisation/i),
    ).toBeInTheDocument();
  });

  it("ne porte aucune phrase d’attente", () => {
    afficher("secretariat-urgence-dap");
    for (const phrase of ATTENTE)
      expect(screen.queryAllByText(phrase), String(phrase)).toEqual([]);
  });

  it("nomme quand même le motif réglementaire qui l’a déclenchée", () => {
    // L'urgence dispense d'attendre, pas de justifier : le prescripteur reporte
    // le motif sur le formulaire, urgence ou non.
    afficher("secretariat-urgence-dap");
    expect(screen.getByText(/plus de 150 km aller/i)).toBeInTheDocument();
  });

  it("demande de renseigner la rubrique « Urgence » du S3139h", () => {
    afficher("secretariat-urgence-dap");
    expect(
      screen.getByText(/renseignez la rubrique . urgence/i),
    ).toBeInTheDocument();
  });
});

describe("demande d’accord préalable sans urgence", () => {
  it("porte l’attente de la décision et le délai de 15 jours", () => {
    afficher("secretariat-accord-prealable-distance");

    expect(
      screen.getByRole("heading", { name: /sous réserve d’un accord/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/attendez la réponse/i)).toBeInTheDocument();
    expect(screen.getByText(/délai de 15 jours/i)).toBeInTheDocument();
    // Et rien de la variante urgente.
    expect(screen.queryAllByText(/valant prescription médicale/i)).toEqual([]);
  });
});

describe("prescription médicale de transport en urgence attestée", () => {
  it("signale l’urgence sans rien attendre", () => {
    afficher("secretariat-urgence-pmt");

    expect(
      screen.getByRole("heading", {
        name: /information relative à l’urgence/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/aucun accord préalable n’est à attendre/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/en mentionnant le contexte d’urgence/i),
    ).toBeInTheDocument();
  });
});

// ---- implémentation ----

function afficher(id: string) {
  render(
    <ResultatFinal
      situation={situationDe(seedParId(id))}
      onNouvelleSimulation={() => {}}
    />,
  );
}
