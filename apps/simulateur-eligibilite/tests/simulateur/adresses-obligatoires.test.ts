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
import { evalue, HOSPITALISATION, PRO } from "./situations-v9-4-0";

const PARCOURS_ADMINISTRATIF = {
  p1_autonomie: PRO,
  p1_critere_hygiene_desinfection: "oui",
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
    for (const regle of [
      "p2_adresses_obligatoires_completes",
      "p2_depart_nom_complete",
      "p2_arrivee_nom_complete",
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
        moteur.evaluate("p2_depart_nom_complete").nodeValue,
        `nom du lieu de départ = ${JSON.stringify(nom)}`,
      ).toBe(false);
    }
    const renseigne = evalue({
      ...depuisUneStructure,
      p2_depart_nom_lieu: "'CH de Vannes'",
    });
    expect(renseigne.evaluate("p2_depart_nom_complete").nodeValue).toBe(true);
  });
});
