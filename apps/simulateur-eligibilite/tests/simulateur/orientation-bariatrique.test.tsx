// L'orientation donnée au patient dont la contrainte bariatrique est le seul
// motif : l'Assurance Maladie ne prend rien en charge, mais le besoin d'un
// véhicule adapté demeure entier. La v9.4 nommait l'interlocuteur —
// l'établissement, ou la coordination territoriale compétente —, et le contrat
// d'interface la portait aux deux écrans de résultat.
//
// **La v9.7 a retiré le cas final « bariatrique seul ».** La contrainte ne clôt
// plus le parcours : il va jusqu'au bout, et c'est l'absence de motif ouvrant
// droit qui conclut. Il n'y a donc plus d'écran où porter cette orientation, et
// le texte a quitté `ResultatMedical.tsx` avec le cas qu'il servait.
//
// Ce fichier constate l'impasse, et garde ce qui vaut encore : la contrainte
// bariatrique qui **accompagne** un besoin médical n'oriente vers personne — on
// dit seulement au patient que son véhicule devra être équipé.

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { moteurDeTest } from "./moteur";

beforeEach(() => sessionStorage.clear());

const ORIENTATION = /coordination territoriale compétente/i;

// Bariatrique **seul** — aucun autre besoin médical.
const BARIATRIQUE_SEUL = {
  ...BASE_NEUTRE,
  p1_m0_bariatrique: "oui",
  p1_m0_aucun: "non",
};

// La même contrainte, mais accompagnée d'un besoin d'ambulance : le transport est
// prescrit, et l'orientation n'a plus lieu d'être.
const BARIATRIQUE_AVEC_AMBULANCE = {
  ...BARIATRIQUE_SEUL,
  p1_autonomie:
    "'Nécessite une prise en charge spécifique pendant le trajet, une aide d’un professionnel pour se déplacer ou, en l’absence d’un proche accompagnant, pour transmettre les informations nécessaires à l’équipe soignante.'",
  p1_critere_oxygene: "oui",
  p1_critere_aucun: "non",
  p2_raison_principale: "'Entrée en hospitalisation'",
};

describe("contrainte bariatrique seule — vers qui se tourner", () => {
  it("n’est plus un cas final : le parcours va jusqu’à la Partie 2", () => {
    const moteur = moteurDeTest(BARIATRIQUE_SEUL);
    expect(
      moteur.evaluate("cible_partie_2_requise").nodeValue,
      "Le modèle a rouvert une sortie directe de la Partie 1. Rétablis " +
        "l'orientation bariatrique dans `ResultatMedical.tsx` et les deux " +
        "scénarios qui la vérifiaient sur les deux écrans de résultat.",
    ).toBe("oui");
    expect(moteur.evaluate("cible_cas_final").nodeValue).not.toBe(
      "bariatrique seul",
    );
  });

  it("n’oriente vers personne, faute d’écran qui le fasse", () => {
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={BARIATRIQUE_SEUL}
      />,
    );
    expect(screen.queryByText(ORIENTATION)).toBeNull();
  });

  it("ne l’adresse pas davantage au patient dont le transport est prescrit", () => {
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={BARIATRIQUE_AVEC_AMBULANCE}
      />,
    );
    expect(screen.queryByText(ORIENTATION)).toBeNull();
  });
});
