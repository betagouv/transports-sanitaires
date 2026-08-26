// Les cases documentaires du Bloc 3 : ce que le praticien reporte sur le
// formulaire, et ce que le modèle lui donne déjà.
//
// La plupart sont des rappels, listés tels quels. Certaines suivent une règle et
// ne s'affichent qu'établies. Une seule porte une valeur : le nombre de
// transports, que la v9.5.0 expose en cible pour qu'il figure dans les
// informations documentaires au lieu d'être laissé à recopier. Quand A3.2 n'a pas
// été posée, la case redevient le rappel qu'elle a toujours été.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { seedParId } from "../../front/outils-produit/seeds/catalogue";
import { situationDe } from "../../front/outils-produit/seeds/seed";
import { casesRetenues } from "../../front/simulateur/secretariat/cases-documentaires";
import { ResultatFinal } from "../../front/simulateur/secretariat/ResultatFinal";
import { moteurDeTest } from "./moteur";
import { SMUR } from "./situations-v9-5-1";

describe("nombre de transports", () => {
  it.each([
    ["secretariat-serie-hors-ald", "DAP"],
    ["secretariat-serie-ald-validee", "PMT"],
  ])("porte le chiffre exact sur le document (%s)", (seed) => {
    afficher(seed);
    expect(screen.getByText("Nombre de transports : 4.")).toBeInTheDocument();
    expect(
      screen.queryByText(/nombre de transports si applicable/i),
    ).toBeNull();
  });

  // Sur une PMT comme sur une DAP, le parcours a toujours posé A3.2 : la valeur
  // y est. Le repli se lit donc sur la table elle-même, à laquelle on présente
  // une situation qui n'a jamais atteint la question — ici une urgence vitale,
  // tranchée dès la Partie 1.
  it("reste un rappel quand A3.2 n’a pas été posée", () => {
    const moteur = moteurDeTest({ p1_autonomie: SMUR });
    const trajet = casesRetenues(
      "prescription médicale de transport",
      moteur,
      "ambulance",
    ).find((groupe) => groupe.titre === "Trajet");

    expect(trajet?.cases).toContain("Nombre de transports si applicable.");
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
