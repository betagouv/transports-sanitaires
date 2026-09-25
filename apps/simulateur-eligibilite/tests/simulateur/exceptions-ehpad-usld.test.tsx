// TS973-07 (famille AUD-ROUTE-EXCEPTION-PLACE) : une exception EHPAD ou USLD
// ne vaut que si le départ ou l'arrivée déclaré est de ce type.
//
// La garde (`p2_exceptions_trajet_valides`) compare les types de lieu
// effectifs, déduits compris, jamais des adresses. L'écran de résultat nomme
// la contradiction au lieu de dire « informations insuffisantes ».

import { render, screen } from "@testing-library/react";
import type { Situation } from "publicodes";
import { describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { avecEntreesCalculees } from "../../front/simulateur/entrees-calculees";
import { exceptionSansLieu } from "../../front/simulateur/exception-sans-lieu";
import { moteur } from "../../front/simulateur/moteur";
import { ResultatFinal } from "../../front/simulateur/secretariat/resultat/ResultatFinal";
import { PMT } from "./situations";

const CONTRADICTOIRES = [
  ["EHPAD", "Domicile", "Autre lieu"],
  ["EHPAD", "Autre lieu", "Domicile"],
  ["USLD", "Domicile", "Autre lieu"],
  ["USLD", "Autre lieu", "Domicile"],
] as const;

const COHERENTS = [
  ["EHPAD", "EHPAD", "Structure de soins"],
  ["EHPAD", "Structure de soins", "EHPAD"],
  ["USLD", "USLD", "Structure de soins"],
  ["USLD", "Structure de soins", "USLD"],
] as const;

describe("TS973-07, le moteur", () => {
  it.each(CONTRADICTOIRES)(
    "exception %s avec %s vers %s ne finalise aucun document",
    (exception, depart, arrivee) => {
      const e = moteur.setSituation(transfert(exception, depart, arrivee));
      expect(e.evaluate("cible_resultat_2_affichable").nodeValue).toBe(false);
      expect(
        e.evaluate("cible_document_a_remettre_au_patient").nodeValue,
      ).not.toBe("PMT S3138g");
    },
  );

  it.each(COHERENTS)(
    "exception %s avec %s vers %s reste une PMT Assurance Maladie",
    (exception, depart, arrivee) => {
      const e = moteur.setSituation(transfert(exception, depart, arrivee));
      expect(e.evaluate("cible_cas_final").nodeValue).toBe(PMT);
      expect(e.evaluate("cible_regime_financement").nodeValue).toBe(
        "Assurance Maladie",
      );
    },
  );

  it("l'admission HAD garde sa qualification propre, sans type de lieu répondu", () => {
    // Les deux types de lieu sont déduits : aucune réponse ne les porte.
    const sansTypes = Object.fromEntries(
      Object.entries(TRANSFERT).filter(
        ([cle]) => cle !== "p2_trajet_depart" && cle !== "p2_trajet_arrivee",
      ),
    );
    const situation = avecEntreesCalculees({
      ...sansTypes,
      p2_exception_admission_had: "oui",
    });
    const e = moteur.setSituation(situation);
    expect(situation.p2_exceptions_trajet_valides).toBe("oui");
    expect(e.evaluate("cible_lieu_depart_type").nodeValue).toBe(
      "Structure de soins",
    );
    expect(e.evaluate("cible_lieu_arrivee_type").nodeValue).toBe("Domicile");
    expect(e.evaluate("cible_cas_final").nodeValue).toBe(PMT);
  });
});

describe("TS973-07, le diagnostic", () => {
  it.each(CONTRADICTOIRES)(
    "nomme l'exception %s quand ni %s ni %s n'en est une",
    (exception, depart, arrivee) => {
      expect(exceptionSansLieu(transfert(exception, depart, arrivee))).toEqual({
        exception,
        depart: { type: depart, deduit: false },
        arrivee: { type: arrivee, deduit: false },
      });
    },
  );

  it.each(COHERENTS)(
    "ne dit rien pour l'exception %s avec %s vers %s",
    (exception, depart, arrivee) => {
      expect(
        exceptionSansLieu(transfert(exception, depart, arrivee)),
      ).toBeUndefined();
    },
  );
});

describe("TS973-07, un type répondu puis masqué par une déduction", () => {
  // Le type répondu reste dans la situation, mais le trajet effectif ne passe
  // plus par un EHPAD : la garde doit lire le type déduit.
  it.each([
    ["l'admission HAD", { p2_exception_admission_had: "oui" }, "Domicile"],
    [
      "le retour pénitentiaire",
      { p2_exception_retour_penitentiaire: "oui" },
      "Établissement pénitentiaire",
    ],
  ])("%s bloque une exception EHPAD", (_cause, deduction, arriveeDeduite) => {
    const situation = avecEntreesCalculees({
      ...transfert("EHPAD", "EHPAD", "EHPAD"),
      ...deduction,
    });
    expect(exceptionSansLieu(situation)).toEqual({
      exception: "EHPAD",
      depart: { type: "Structure de soins", deduit: true },
      arrivee: { type: arriveeDeduite, deduit: true },
    });
    const e = moteur.setSituation(situation);
    expect(e.evaluate("cible_resultat_2_affichable").nodeValue).toBe(false);
  });
});

describe("TS973-07, l'écran de résultat", () => {
  it("dit quelle réponse corriger", () => {
    afficher(transfert("EHPAD", "Domicile", "Autre lieu"));
    expect(
      screen.getByRole("heading", {
        name: "Le trajet ne correspond pas à l’exception EHPAD",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /le type de lieu de départ est « Domicile » et celui d’arrivée « Autre lieu »/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Choisissez « EHPAD » pour le départ ou l’arrivée, ou retirez l’exception/,
      ),
    ).toBeInTheDocument();
  });

  it("ne propose pas de choisir un lieu déduit", () => {
    // Une raison qui déduit l'arrivée, avec une exception restée cochée
    // d'avant : seul le départ a encore une question.
    afficher(
      avecEntreesCalculees({
        ...transfert("EHPAD", "Domicile", "Domicile"),
        p2_raison_principale: "'Entrée en hospitalisation'",
      }),
    );
    expect(
      screen.getByText(
        "Choisissez « EHPAD » pour le départ, ou retirez l’exception.",
      ),
    ).toBeInTheDocument();
  });

  it("ne propose que le retrait quand les deux lieux sont déduits", () => {
    afficher(
      avecEntreesCalculees({
        ...transfert("USLD", "USLD", "USLD"),
        p2_exception_admission_had: "oui",
      }),
    );
    expect(screen.queryByText(/Choisissez/)).toBeNull();
    expect(screen.getByText(/Retirez l’exception/)).toBeInTheDocument();
  });

  it("ne présente la contradiction ni comme un manque ni comme un refus", () => {
    afficher(transfert("USLD", "Autre lieu", "Domicile"));
    expect(screen.queryByText(/ne suffisent pas encore/)).toBeNull();
    expect(
      screen.queryByText(/non éligible|refus|pas pris en charge/i),
    ).toBeNull();
  });
});

// ---- implémentation ----

const TRANSFERT: Situation<string> = {
  ...BASE_NEUTRE,
  p1_autonomie:
    "'Nécessite une prise en charge spécifique pendant le trajet, une aide d’un professionnel pour se déplacer ou, en l’absence d’un proche accompagnant, pour transmettre les informations nécessaires à l’équipe soignante.'",
  p1_critere_brancardage_portage: "oui",
  p1_critere_aucun: "non",
  p2_raison_principale:
    "'Transfert d’un patient hospitalisé vers un autre établissement de santé'",
  p2_transfert_en_cours: "oui",
  p2_nature_transfert: "'Définitif'",
  p2_exception_aucune: "non",
  p2_depart_nom_lieu: "'Départ'",
  p2_depart_adresse: "'1 rue du Départ'",
  p2_depart_code_postal: "'35000'",
  p2_depart_commune: "'Rennes'",
  p2_arrivee_nom_lieu: "'Arrivée'",
  p2_arrivee_adresse: "'2 rue de l’Arrivée'",
  p2_arrivee_code_postal: "'75002'",
  p2_arrivee_commune: "'Paris'",
};

function transfert(
  exception: "EHPAD" | "USLD",
  depart: string,
  arrivee: string,
): Situation<string> {
  return avecEntreesCalculees({
    ...TRANSFERT,
    [`p2_exception_${exception.toLowerCase()}`]: "oui",
    p2_trajet_depart: `'${depart}'`,
    p2_trajet_arrivee: `'${arrivee}'`,
  });
}

function afficher(situation: Situation<string>) {
  render(
    <ResultatFinal
      datePrescription="24/09/2026"
      situation={situation}
      onNouvelleSimulation={() => {}}
    />,
  );
}
