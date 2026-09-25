// Les douze saisies d'adresse (D1-D12), et ce qu'une adresse obligatoire garantit.
//
// Ces assertions sont nées d'un correctif local : la v9.1 déclarait ces règles
// `type: texte` mais les faisait consommer comme des booléens, si bien que
// `p2_adresses_obligatoires_completes` rendait la dernière chaîne de sa
// conjonction et que `cible_resultat_2_affichable` ne valait jamais `false` —
// alors que le contrat d'interface la garde par `block_when_false`. La v9.2.1
// intègre le correctif en amont (huit règles `_renseigne(e)`), et le patch local
// a disparu.
//
// Le fichier reste : c'est lui qui le dira à la prochaine recopie du modèle. Une
// livraison qui referait le défaut fait échouer ces assertions, et non un écran
// en production. Il couvre les scénarios ADDRESS-002 à ADDRESS-004 du livrable.
//
// Les deux conditions ne se recouvrent pas : `est défini` attrape la question
// jamais répondue, `!= ''` la saisie effacée. La seconde n'est pas atteignable
// depuis l'interface — `@publicodes/forms` retire la clé de la situation dès que
// le champ passe à vide — mais elle l'est depuis une situation écrite à la main,
// ce que font les seeds et le pré-remplissage du CERFA.

import { describe, expect, it } from "vitest";
import {
  estApplicable,
  evalue,
  HOSPITALISATION,
  PRO,
} from "./situations-v9-7-2";

const PARCOURS_ADMINISTRATIF = {
  p1_autonomie: PRO,
  p1_critere_hygiene_desinfection: "oui",
  p1_critere_aucun: "non",
  ...HOSPITALISATION,
};

const OBLIGATOIRES = [
  "p2_depart_adresse",
  "p2_depart_code_postal",
  "p2_depart_commune",
  "p2_arrivee_adresse",
  "p2_arrivee_code_postal",
  "p2_arrivee_commune",
];

const FACULTATIFS = [
  "p2_depart_complement_adresse",
  "p2_depart_pays",
  "p2_arrivee_complement_adresse",
  "p2_arrivee_pays",
];

describe("saisies d'adresse — ce qu'une adresse obligatoire garantit", () => {
  it("conclut sur un booléen, jamais sur la valeur d'une saisie", () => {
    // L'assertion qui aurait suffi à voir le défaut de la v9.1 : ces trois
    // règles y rendaient la dernière chaîne de leur conjonction.
    const moteur = evalue(PARCOURS_ADMINISTRATIF);
    // La v9.5.1 portait deux règles de nom (`p2_*_nom_complete`) ; la v9.7 les a
    // repliées dans la complétude de chaque page d'adresse, celle que le contrat
    // d'interface attache à l'étape.
    for (const regle of [
      "p2_adresses_obligatoires_completes",
      "p2_adresse_depart_obligatoire_complete",
      "p2_adresse_arrivee_obligatoire_complete",
    ])
      expect(moteur.evaluate(regle).nodeValue, regle).toBeTypeOf("boolean");
  });

  it("laisse le résultat affichable quand tout est renseigné", () => {
    const moteur = evalue(PARCOURS_ADMINISTRATIF);
    expect(
      moteur.evaluate("p2_adresses_obligatoires_completes").nodeValue,
    ).toBe(true);
    expect(moteur.evaluate("cible_resultat_2_affichable").nodeValue).toBe(true);
  });

  it.each(OBLIGATOIRES)("%s sans réponse bloque le résultat", (regle) => {
    const moteur = evalue({ ...PARCOURS_ADMINISTRATIF, [regle]: null });
    expect(moteur.evaluate("cible_resultat_2_affichable").nodeValue).toBe(
      false,
    );
  });

  it.each(OBLIGATOIRES)("%s vidé bloque le résultat", (regle) => {
    // Le cas que `est défini` seul laisserait passer.
    const moteur = evalue({ ...PARCOURS_ADMINISTRATIF, [regle]: "''" });
    expect(moteur.evaluate("cible_resultat_2_affichable").nodeValue).toBe(
      false,
    );
  });

  it.each(FACULTATIFS)("%s vide ne bloque rien", (regle) => {
    const vide = evalue({ ...PARCOURS_ADMINISTRATIF, [regle]: "''" });
    const absent = evalue({ ...PARCOURS_ADMINISTRATIF, [regle]: null });
    expect(vide.evaluate("cible_resultat_2_affichable").nodeValue).toBe(true);
    expect(absent.evaluate("cible_resultat_2_affichable").nodeValue).toBe(true);
  });

  it("exige le nom du lieu quand le trajet ne part pas du domicile", () => {
    // Le piège que la base neutre a porté un temps : un nom de structure vide
    // passait pour renseigné, et le cas final se concluait quand même.
    const depuisUneStructure = {
      ...PARCOURS_ADMINISTRATIF,
      p2_trajet_depart: "'Structure de soins'",
    };
    for (const nom of [null, "''"]) {
      const moteur = evalue({ ...depuisUneStructure, p2_depart_nom_lieu: nom });
      expect(
        moteur.evaluate("p2_adresse_depart_obligatoire_complete").nodeValue,
        `nom du lieu de départ = ${JSON.stringify(nom)}`,
      ).toBe(false);
    }
    const renseigne = evalue({
      ...depuisUneStructure,
      p2_depart_nom_lieu: "'CH de Vannes'",
    });
    expect(
      renseigne.evaluate("p2_adresse_depart_obligatoire_complete").nodeValue,
    ).toBe(true);
  });
});

const DEPART = [
  "p2_depart_nom_lieu",
  "p2_depart_adresse",
  "p2_depart_complement_adresse",
  "p2_depart_code_postal",
  "p2_depart_commune",
  "p2_depart_pays",
];

const ARRIVEE = [
  "p2_arrivee_nom_lieu",
  "p2_arrivee_adresse",
  "p2_arrivee_complement_adresse",
  "p2_arrivee_code_postal",
  "p2_arrivee_commune",
  "p2_arrivee_pays",
];

// ADDRESS-005, revu par la v9.7 : quand le modèle ouvre chaque saisie.
//
// La v9.4.1 faisait attendre les douze saisies jusqu'à A4.3, le type du lieu
// d'arrivée : on choisissait les deux types, puis on saisissait les deux
// adresses. Le contrat d'interface de la v9.7 entrelace les deux — type de
// départ, adresse de départ, type d'arrivée, adresse d'arrivée —, et c'est cet
// ordre que `front/simulateur/questionnaire/etapes.ts` recopie.
//
// Rien ne le montre à l'écran, la bibliothèque de formulaires ne dévoilant qu'un
// pas à la fois : d'où ce test au ras du modèle.
//
// La v9.7.3 déduit le type du lieu d'arrivée pour une entrée en hospitalisation
// (« Structure de soins », sans le redemander) : `PARCOURS_ADMINISTRATIF` en est
// un cas, et `p2_trajet_arrivee` n'y est plus jamais applicable. Les saisies
// d'arrivée attendent alors la complétude du départ, comme le fait
// `p2_lieu_arrivee_type_effectif`, plutôt qu'une réponse au type.
describe("saisies d'adresse — quand le modèle les ouvre (ADDRESS-005)", () => {
  const SANS_TYPE_DE_DEPART = {
    ...PARCOURS_ADMINISTRATIF,
    p2_trajet_depart: null,
    ...Object.fromEntries(DEPART.map((champ) => [champ, null])),
  };

  it.each(DEPART)("%s attend le type du lieu de départ", (regle) => {
    expect(estApplicable(evalue(SANS_TYPE_DE_DEPART), regle)).not.toBe(true);
  });

  it.each(DEPART)("%s s'ouvre une fois le type de départ répondu", (regle) => {
    const apres = evalue({
      ...SANS_TYPE_DE_DEPART,
      p2_trajet_depart: "'Structure de soins'",
    });
    expect(estApplicable(apres, regle)).toBe(true);
  });

  it.each(ARRIVEE)("%s attend que le départ soit complet", (regle) => {
    const departIncomplet = evalue({
      ...PARCOURS_ADMINISTRATIF,
      ...Object.fromEntries(ARRIVEE.map((champ) => [champ, null])),
      p2_depart_commune: null,
    });
    expect(estApplicable(departIncomplet, regle)).not.toBe(true);
    // Le départ complet suffit : le type d'arrivée est déduit, sans réponse.
    expect(estApplicable(evalue(PARCOURS_ADMINISTRATIF), regle)).toBe(true);
  });

  it("ne pose jamais le type du lieu d’arrivée : il est déduit d’une entrée en hospitalisation", () => {
    const departIncomplet = evalue({
      ...PARCOURS_ADMINISTRATIF,
      p2_depart_commune: null,
    });
    expect(estApplicable(departIncomplet, "p2_trajet_arrivee")).not.toBe(true);
    expect(
      estApplicable(evalue(PARCOURS_ADMINISTRATIF), "p2_trajet_arrivee"),
    ).not.toBe(true);
    expect(
      evalue(PARCOURS_ADMINISTRATIF).evaluate("cible_lieu_arrivee_type")
        .nodeValue,
    ).toBe("Structure de soins");
  });
});
