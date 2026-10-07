import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  allerAuResultat,
  BOISSON,
  ouvrirLeSimulateur,
  question,
} from "../simulateur/questionnaire";

// La trace de debug est un developer tool. Elle s'ouvre sur tous les
// environnements, pour le seul service n° 4. Elle montre le chemin parcouru et
// les réponses données.
//
// Les tests passent par `App` : ils gardent le câblage, du service choisi au
// rattachement jusqu'au `DebugTrace` des écrans.

const TRACE_PARCOURS = /^Debug — chemin parcouru/;
const TRACE_RESULTAT = /^Debug — résultat/;

describe("traces de debug", () => {
  it("restent fermées à un service ordinaire", async () => {
    const user = await ouvrirLeSimulateur();
    await question(BOISSON);
    expect(screen.queryByText(TRACE_PARCOURS)).toBeNull();

    await allerAuResultat(user);
    expect(screen.queryByText(TRACE_RESULTAT)).toBeNull();
  });

  it("s'ouvrent au service n° 4, sous le questionnaire puis sous le résultat", async () => {
    const user = await ouvrirLeSimulateur({ produit: true });
    await question(BOISSON);
    expect(screen.getByText(TRACE_PARCOURS)).toBeInTheDocument();

    await allerAuResultat(user);

    expect(screen.getByText(TRACE_RESULTAT)).toBeInTheDocument();
    expect(screen.getByText('"thé, lait"')).toBeInTheDocument();
  });
});
