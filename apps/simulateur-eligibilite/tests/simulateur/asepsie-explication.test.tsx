// L'explication patient de l'asepsie, recopiée mot pour mot du contrat v9.7.2
// (`CONTRAT-RESULTATS-v9-7-2.md` § 3) dans `Vulgarisation.tsx`. Identifiants du
// livrable : `RETOURS972-ASEPSIE-RENDU-POSITIF`,
// `RETOURS972-ASEPSIE-ABSENTE-SUR-DESINFECTION-SEULE`,
// `INDEPENDANT972-ASEPSIE-TEXTE-EXACT-ET-DESINFECTION-DISTINCTE`.

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";

beforeEach(() => sessionStorage.clear());

const TITRE = "Transport dans des conditions d’asepsie";
const DESCRIPTION =
  "Votre état de santé nécessite un transport dans des conditions d’asepsie, c’est-à-dire des mesures destinées à prévenir une contamination. Ce besoin est distinct de la désinfection du véhicule.";

describe("RETOURS972-ASEPSIE — l’explication patient", () => {
  it("RETOURS972-ASEPSIE-RENDU-POSITIF s’affiche quand le critère est retenu", () => {
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={{
          ...BASE_NEUTRE,
          p1_autonomie:
            "'Nécessite une prise en charge spécifique pendant le trajet, une aide d’un professionnel pour se déplacer ou, en l’absence d’un proche accompagnant, pour transmettre les informations nécessaires à l’équipe soignante.'",
          p1_critere_isolement_asepsie: "oui",
          p1_critere_aucun: "non",
          p2_raison_principale: "'Entrée en hospitalisation'",
        }}
      />,
    );
    expect(screen.getByText(TITRE)).toBeInTheDocument();
    expect(screen.getByText(DESCRIPTION)).toBeInTheDocument();
  });

  it("RETOURS972-ASEPSIE-ABSENTE-SUR-DESINFECTION-SEULE ne s’affiche pas sur l’hygiène seule", () => {
    // INDEPENDANT972-ASEPSIE-TEXTE-EXACT-ET-DESINFECTION-DISTINCTE : les deux
    // critères restent deux entrées distinctes, l'une n'entraînant pas l'autre.
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={{
          ...BASE_NEUTRE,
          p1_autonomie:
            "'Nécessite une prise en charge spécifique pendant le trajet, une aide d’un professionnel pour se déplacer ou, en l’absence d’un proche accompagnant, pour transmettre les informations nécessaires à l’équipe soignante.'",
          p1_critere_hygiene_desinfection: "oui",
          p1_critere_aucun: "non",
          p2_raison_principale: "'Entrée en hospitalisation'",
        }}
      />,
    );
    expect(screen.queryByText(TITRE)).not.toBeInTheDocument();
    expect(screen.queryByText(DESCRIPTION)).not.toBeInTheDocument();
    expect(
      screen.getByText("Règles d’hygiène ou désinfection du véhicule"),
    ).toBeInTheDocument();
  });
});
