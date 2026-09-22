// TS973-04 (famille AUD-ROUTE-URG-DEST) : les sept contradictions qu'une
// arrivée urgences ne doit plus laisser finaliser.
//
// Cinq viennent d'un lieu d'arrivée répondu avant un changement de raison
// principale (domicile, EHPAD, USLD, autre lieu, établissement pénitentiaire) ;
// deux viennent d'une autre réponse restée cochée en arrière-plan (retour
// pénitentiaire, admission HAD). Les deux dernières étaient déjà couvertes par
// `qualificationDeclarationsValide` depuis la recopie du modèle (ticket 1) ;
// ce fichier les verrouille aux côtés des cinq nouvelles.

import type { Situation } from "publicodes";
import { describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { avecEntreesCalculees } from "../../front/simulateur/entrees-calculees";
import { URGENCES } from "./situations-v9-7-2";

const MAINTENANT = new Date("2026-09-08T10:00:00Z");

function valide(depassements: Situation<string> = {}) {
  const situation: Situation<string> = {
    ...BASE_NEUTRE,
    ...URGENCES,
    ...depassements,
  };
  const calculee = avecEntreesCalculees(situation, MAINTENANT);
  return {
    qualification: calculee.p2_qualification_declarations_valides,
    exceptions: calculee.p2_exceptions_trajet_valides,
  };
}

describe("TS973-04 (famille AUD-ROUTE-URG-DEST), les sept contradictions", () => {
  it("une arrivée cohérente (structure de soins, rien coché) reste valide", () => {
    const { qualification, exceptions } = valide({
      p2_trajet_arrivee: "'Structure de soins'",
    });
    expect(qualification).toBe("oui");
    expect(exceptions).toBe("oui");
  });

  it.each([
    "Domicile",
    "EHPAD",
    "USLD",
    "Autre lieu",
    "Établissement pénitentiaire",
  ])("arrivée laissée à « %s » ne valide plus le trajet", (lieu) => {
    const { exceptions } = valide({
      p2_trajet_arrivee: `'${lieu}'`,
    });
    expect(exceptions).toBe("non");
  });

  it("retour pénitentiaire (exception) laissé coché ne valide plus la qualification", () => {
    const { qualification } = valide({
      p2_exception_retour_penitentiaire: "oui",
    });
    expect(qualification).toBe("non");
  });

  it("retour pénitentiaire (contexte) laissé coché ne valide plus la qualification", () => {
    const { qualification } = valide({
      p2_contexte_retour_penitentiaire: "oui",
    });
    expect(qualification).toBe("non");
  });

  it("admission HAD laissée cochée ne valide plus la qualification", () => {
    const { qualification } = valide({
      p2_exception_admission_had: "oui",
    });
    expect(qualification).toBe("non");
  });
});
