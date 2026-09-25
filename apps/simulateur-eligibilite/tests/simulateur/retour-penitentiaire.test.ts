// TS973-05 (famille AUD-ROUTE-PRISON-CONTEXT) : un retour pénitentiaire ne
// peut pas se combiner à une entrée en hospitalisation ou une permission, et
// se recueille au bon endroit selon le parcours.
//
// Les quatre critères du ticket sont déjà couverts par la recopie du modèle
// (ticket 1) : `qualificationDeclarationsValide` bloque déjà la combinaison
// avec « Entrée en hospitalisation » et « Permission temporaire de sortie »,
// `p2_retour_penitentiaire_possible` exclut déjà ces deux raisons de la
// proposabilité du contexte, et `p2_contexte_retour_penitentiaire_proposable`
// exige déjà `p2_transfert_qualifie = non`, ce qui renvoie un parcours
// transfert vers l'exception plutôt que le contexte. Ce fichier verrouille
// ce comportement plutôt que de le refaire.

import { describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { avecEntreesCalculees } from "../../front/simulateur/entrees-calculees";
import { estApplicable, evalue, HOSPITALISATION } from "./situations-v9-7-3";

const PERMISSION = {
  p2_raison_principale: "'Permission temporaire de sortie'",
};
const TRANSFERT = {
  p2_raison_principale:
    "'Transfert d’un patient hospitalisé vers un autre établissement de santé'",
  p2_nature_transfert: "'Définitif'",
};
// Une exception sans rapport (avion/bateau) tient `exception_restant_assurance_maladie`
// à « oui », donc `p2_transport_charge_etablissement` à « non » : le parcours reste
// un parcours standard, et seule la clause `p2_transfert_qualifie = non` de
// `p2_contexte_retour_penitentiaire_proposable` peut alors exclure le contexte.
// Sans ce détour, `p2_parcours_standard_applicable` serait déjà faux pour une
// autre raison, et le test ne prouverait rien sur cette clause précise.
const TRANSFERT_PARCOURS_STANDARD = {
  ...TRANSFERT,
  p2_exception_avion_bateau: "oui",
  p2_exception_aucune: "non",
};
const MAINTENANT = new Date("2026-09-08T10:00:00Z");

describe("TS973-05 (famille AUD-ROUTE-PRISON-CONTEXT), entrée/permission incompatibles", () => {
  it.each([
    [
      "Entrée en hospitalisation",
      HOSPITALISATION,
      "p2_exception_retour_penitentiaire",
    ],
    [
      "Entrée en hospitalisation",
      HOSPITALISATION,
      "p2_contexte_retour_penitentiaire",
    ],
    [
      "Permission temporaire de sortie",
      PERMISSION,
      "p2_exception_retour_penitentiaire",
    ],
    [
      "Permission temporaire de sortie",
      PERMISSION,
      "p2_contexte_retour_penitentiaire",
    ],
  ] as const)(
    "%s + %s laissé coché ne valide plus la qualification",
    (_libelle, raison, champ) => {
      const situation = {
        ...BASE_NEUTRE,
        ...raison,
        [champ]: "oui",
      };
      const calculee = avecEntreesCalculees(situation, MAINTENANT);
      expect(calculee.p2_qualification_declarations_valides).toBe("non");
    },
  );
});

describe("TS973-05, le contexte retour pénitentiaire suit les options courantes", () => {
  it("n'est pas proposé pour une entrée en hospitalisation", () => {
    expect(
      estApplicable(
        evalue(HOSPITALISATION),
        "p2_contexte_retour_penitentiaire",
      ),
    ).not.toBe(true);
  });

  it("n'est pas proposé pour une permission", () => {
    expect(
      estApplicable(evalue(PERMISSION), "p2_contexte_retour_penitentiaire"),
    ).not.toBe(true);
  });

  it("redevient proposé dès que la raison change pour une autre compatible", () => {
    const incompatible = evalue(HOSPITALISATION);
    expect(
      estApplicable(incompatible, "p2_contexte_retour_penitentiaire"),
    ).not.toBe(true);
    const compatible = evalue({ p2_raison_principale: "'Examen médical'" });
    expect(estApplicable(compatible, "p2_contexte_retour_penitentiaire")).toBe(
      true,
    );
  });
});

describe("TS973-05, un parcours transfert recueille le retour pénitentiaire par l'exception", () => {
  it("le contexte n'est plus proposé une fois le transfert qualifié", () => {
    expect(
      estApplicable(
        evalue(TRANSFERT_PARCOURS_STANDARD),
        "p2_contexte_retour_penitentiaire",
      ),
    ).not.toBe(true);
  });

  it("l'exception reste proposée pour un transfert qualifié et complet", () => {
    expect(
      estApplicable(evalue(TRANSFERT), "p2_exception_retour_penitentiaire"),
    ).toBe(true);
  });
});

describe("TS973-05, un vrai retour pénitentiaire déduit une destination cohérente", () => {
  it("par le contexte, hors transfert", () => {
    // « Examen médical » reste proposable pour le contexte (cf. bloc
    // précédent). Décocher « aucun » est ce qu'un vrai choix de mosaïque
    // ferait ; le nom du lieu de départ est requis dès que le départ est
    // déduit « Structure de soins ».
    const moteur = evalue({
      p2_raison_principale: "'Examen médical'",
      p2_contexte_retour_penitentiaire: "oui",
      p2_contexte_aucun: "non",
      p2_depart_nom_lieu: "'CH de Vannes'",
    });
    expect(estApplicable(moteur, "p2_trajet_arrivee")).not.toBe(true);
    expect(moteur.evaluate("cible_lieu_arrivee_type").nodeValue).toBe(
      "Établissement pénitentiaire",
    );
    expect(moteur.evaluate("cible_lieu_depart_type").nodeValue).toBe(
      "Structure de soins",
    );
  });

  it("par l'exception, dans un parcours transfert", () => {
    const moteur = evalue({
      ...TRANSFERT,
      p2_exception_retour_penitentiaire: "oui",
      p2_exception_aucune: "non",
      p2_depart_nom_lieu: "'CH de Vannes'",
    });
    expect(estApplicable(moteur, "p2_trajet_arrivee")).not.toBe(true);
    expect(moteur.evaluate("cible_lieu_arrivee_type").nodeValue).toBe(
      "Établissement pénitentiaire",
    );
    expect(moteur.evaluate("cible_lieu_depart_type").nodeValue).toBe(
      "Structure de soins",
    );
  });
});
