// Les cases documentaires du Bloc 3 : ce que le praticien coche sur le
// formulaire, désormais lu du modèle.
//
// La v9.7 livre la correspondance zone par zone, et l'application cesse de la
// deviner. Ce fichier vérifie ce que ce changement corrige, cas par cas — chaque
// assertion ici est une divergence que la v9.5.1 laissait passer, ou une case
// que le S3141 réclamait sans que rien ne la liste.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { seedParId } from "../../front/outils-produit/seeds/catalogue";
import { situationDe } from "../../front/outils-produit/seeds/seed";
import { casesRetenues } from "../../front/simulateur/secretariat/resultat/cases-documentaires";
import { ResultatFinal } from "../../front/simulateur/secretariat/resultat/ResultatFinal";
import { moteurDeTest } from "./moteur";

describe("le nombre de transports", () => {
  // Le formulaire ne porte pas le nombre *prévu* mais le nombre *couvert par le
  // document* : les deux divergent sur une permission et sur un aller-retour
  // différent. Jusqu'ici la case affichait le premier.
  it.each([
    ["secretariat-serie-ald-validee", "Nombre de transports itératifs : 4."],
    ["secretariat-serie-hors-ald", "Nombre de transports : 4."],
  ])("porte le chiffre du document (%s)", (seed, attendu) => {
    expect(casesDe(seed)).toContain(attendu);
  });

  // Une valeur que le parcours n'a pas tranchée n'écrit rien : « null, false et
  // vide ne cochent pas ». La v9.5.1 laissait à sa place un rappel — « nombre de
  // transports si applicable » — que le formulaire ne demande nulle part.
  it("n’écrit rien quand le parcours ne l’a pas posé", () => {
    const moteur = moteurDeTest({});
    const cases = casesRetenues(
      "prescription médicale de transport",
      moteur,
    ).flatMap((groupe) => groupe.cases);
    expect(cases.join(" ")).not.toMatch(/nombre de transports/i);
  });
});

describe("le mode de transport", () => {
  // Le Cerfa n'a pas de case « Ambulance » : elle se déclare par ses cinq
  // justifications, et le modèle ne les rend vraies qu'avec le mode ambulance.
  // La v9.5.1 les listait sur le seul critère médical, donc aussi sous un VSL.
  it("déclare l’ambulance par ses justifications", () => {
    expect(casesDe("secretariat-ambulance-ouvre-le-droit")).toContain(
      "Ambulance : brancardage ou portage.",
    );
  });

  // Le transport à mobilité réduite est une ligne **en plus** du transport assis
  // professionnalisé, pas une alternative : la v9.5.1 ne cochait que la
  // première, et le formulaire partait sans son mode.
  it("coche les deux lignes d’un TPMR", () => {
    expect(casesDe("prescripteur-tpmr")).toEqual(
      expect.arrayContaining([
        "Transport assis professionnalisé — VSL (Véhicule Sanitaire Léger) ou taxi conventionné.",
        "Transport d’un patient à mobilité réduite dans son fauteuil roulant.",
      ]),
    );
  });
});

describe("le S3141", () => {
  // Le septième cas final n'avait aucune case listée : le formulaire est arrivé
  // avec la v9.7, et le contrat d'interface n'en décrit pas le contenu.
  it("porte ses rubriques calendaires", () => {
    expect(casesDe("secretariat-permission-s3141")).toEqual(
      expect.arrayContaining([
        "Date de début d’hospitalisation : 05/01/2026.",
        "Nombre de trajets par mois : 1.",
        "Permissions prescrites jusqu’au : 31/03/2026.",
      ]),
    );
  });

  // « Aucune rubrique éléments médicaux, urgence ou centre de référence sur
  // S3141 » — et le livrable ajoute : « ne pas en créer ».
  it("n’invente ni urgence ni volet médical", () => {
    const titres = groupesDe("secretariat-permission-s3141").map(
      (groupe) => groupe.titre,
    );
    expect(titres.join(" ")).not.toMatch(/urgence|volet 1/i);
  });
});

describe("les cases « Non »", () => {
  // « Case Non uniquement si la cible source est explicitement false. » Une
  // pension militaire est une question posée : sa réponse négative se coche.
  it("se cochent sur une réponse négative", () => {
    expect(casesDe("secretariat-urgence-pmt")).toContain(
      "Soins au titre d’une pension militaire d’invalidité : cocher « Non ».",
    );
  });

  // La DAP n'a pas la paire de cases « pension militaire » du PMT : le livrable
  // met en garde contre le report d'une exonération d'un formulaire à l'autre.
  it("ne franchissent pas d’un formulaire à l’autre", () => {
    expect(casesDe("secretariat-serie-hors-ald").join(" ")).not.toMatch(
      /pension militaire/i,
    );
  });
});

describe("l’écran", () => {
  it("affiche les cases du formulaire retenu", () => {
    render(
      <ResultatFinal
        datePrescription="08/09/2026"
        situation={situationDe(seedParId("secretariat-permission-s3141"))}
        onNouvelleSimulation={() => {}}
      />,
    );
    expect(
      screen.getByText("Rubrique ④ — périodicité des permissions"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Nombre de trajets par mois : 1."),
    ).toBeInTheDocument();
  });
});

// ---- implémentation ----

function groupesDe(seed: string) {
  const moteur = moteurDeTest(situationDe(seedParId(seed)));
  const casFinal = String(moteur.evaluate("cible_cas_final").nodeValue ?? "");
  return casesRetenues(casFinal, moteur);
}

function casesDe(seed: string): string[] {
  return groupesDe(seed).flatMap((groupe) => groupe.cases);
}
