// Le contexte de la fiche patient positive (#135) : la phrase qui dit pourquoi
// le transport est pris en charge, et le motif administratif du modus. Un code
// de contexte n'est posé que si sa cible est prouvée ; le contexte retenu est
// celui dont les codes sont exactement ceux établis. Les attendus sont recopiés
// du catalogue de l'éditeur.

import { describe, expect, it } from "vitest";
import { catalogueResultats } from "../../../front/models/eligibilite/catalogue-resultats";
import {
  codesDeContexte,
  motifAdministratif,
  phraseDuContexte,
} from "../../../front/models/eligibilite/contexte-du-resultat";
import type { Cibles } from "../../../front/models/eligibilite/declarations/cibles";
import type { Precisions } from "../../../front/models/eligibilite/precisions-du-resultat";
import { trace } from "./traces-du-praticien";

const { issues } = await catalogueResultats();
const pmt = issues.ISSUE_PMT;

const H: Partial<Cibles> = {
  cible_hospitalisation_ou_seances_assimilees: true,
};
const T: Partial<Cibles> = { cible_situation_at_mp: true };
const A: Partial<Cibles> = {
  cible_ald_juridiquement_qualifiante_3_ou_4_degres: true,
};
const M: Partial<Cibles> = { cible_mineur_ald_non_exonerante_reconnue: true };
const B: Partial<Cibles> = { cible_mode_ambulance: true };

const phrase = (cibles: Partial<Cibles>, precisions: Precisions = {}) =>
  phraseDuContexte(pmt, trace(cibles, {}, precisions));

describe("les codes de contexte", () => {
  it("ne se posent que sur une cible prouvée", () => {
    expect(codesDeContexte(trace({ ...H, ...A, ...B }).cibles)).toEqual([
      "H",
      "A",
      "B",
    ]);
  });

  it("n'en posent aucun quand les cibles sont fausses ou inconnues", () => {
    const cibles = trace({
      cible_hospitalisation_ou_seances_assimilees: false,
      cible_situation_at_mp: null,
      cible_mode_ambulance: undefined,
    }).cibles;
    expect(codesDeContexte(cibles)).toEqual([]);
  });
});

describe("la phrase du contexte", () => {
  it("n'existe pas quand rien n'est prouvé", () => {
    expect(phrase({})).toBeUndefined();
  });

  it("dit l'hospitalisation avec la précision de la trace", () => {
    expect(phrase(H, { hospitalisation: "H-SEANCE-HE" })).toBe(
      "Votre déplacement est lié à une séance de dialyse, prise en compte comme une hospitalisation pour le transport. Cette situation permet la prise en charge de vos frais de transport par l’Assurance Maladie.",
    );
  });

  it("prend H-GENERIQUE quand la précision manque", () => {
    expect(phrase(H)).toBe(
      "Votre déplacement est lié à des soins pris en compte comme une hospitalisation pour le transport. Cette situation permet la prise en charge de vos frais de transport par l’Assurance Maladie.",
    );
  });

  it("prend H-GENERIQUE quand la précision n'est pas au lexique", () => {
    expect(phrase(H, { hospitalisation: "H-INCONNUE" })).toBe(phrase(H));
  });

  it("dit l'accident du travail ou la maladie professionnelle", () => {
    expect(phrase(T)).toBe(
      "Les soins à l’origine de ce déplacement sont en lien avec un accident du travail ou une maladie professionnelle. Cette situation permet la prise en charge de vos frais de transport par l’Assurance Maladie.",
    );
  });

  it("dit l'ambulance médicalement nécessaire seule", () => {
    expect(phrase(B)).toBe(
      "La nécessité médicale d’un transport en ambulance pour recevoir vos soins est un motif de prise en charge par l’Assurance Maladie.",
    );
  });

  it("dit l'ALD à 100 %, avec l'ambulance qui s'y ajoute", () => {
    expect(phrase({ ...A, ...B })).toBe(
      "Les soins à l’origine de ce déplacement sont liés à votre maladie de longue durée reconnue par l’Assurance Maladie. Ce cadre de soins et vos difficultés de déplacement permettent la prise en charge de votre transport par l’Assurance Maladie. L’ambulance médicalement nécessaire constitue aussi un motif de prise en charge.",
    );
  });

  it("dit le mineur reconnu", () => {
    expect(phrase(M)).toBe(
      "Les soins à l’origine de ce déplacement sont liés à votre maladie de longue durée reconnue par l’Assurance Maladie. Votre besoin de soins continus pendant plus de six mois est reconnu par l’Assurance Maladie. Avec vos difficultés de déplacement, il permet la prise en charge de votre transport.",
    );
  });

  it("garde l'ambulance quand la reconnaissance du mineur est inconnue", () => {
    expect(
      phrase({ ...B, cible_mineur_ald_non_exonerante_reconnue: null }),
    ).toBe(phrase(B));
  });

  it("cumule les quatre motifs, lexique rempli", () => {
    expect(
      phrase({ ...H, ...T, ...A, ...B }, { hospitalisation: "H-SEJOUR" }),
    ).toBe(
      "Votre déplacement est lié à une hospitalisation. Les soins à l’origine de ce déplacement sont en lien avec un accident du travail ou une maladie professionnelle et liés à votre maladie de longue durée reconnue par l’Assurance Maladie. Ce cadre de soins et vos difficultés de déplacement permettent la prise en charge de votre transport par l’Assurance Maladie. L’ambulance médicalement nécessaire constitue aussi un motif de prise en charge.",
    );
  });

  it("ne laisse jamais un emplacement du catalogue dans la phrase", () => {
    const combinaisons = [H, T, A, M, B].flatMap((premier, rang) =>
      [H, T, A, M, B].slice(rang).map((second) => ({ ...premier, ...second })),
    );
    const phrases = combinaisons
      .map((cibles) => phrase(cibles))
      .filter((texte) => texte !== undefined);
    expect(phrases.length).toBeGreaterThan(5);
    for (const texte of phrases) expect(texte).not.toMatch(/[{}]/);
  });
});

describe("le motif administratif", () => {
  it("suit les mêmes codes que la phrase", () => {
    expect(motifAdministratif(pmt, trace({ ...A, ...B }))).toBe(
      "un transport lié à votre maladie de longue durée reconnue par l’Assurance Maladie, avec des difficultés de déplacement et nécessitant médicalement une ambulance",
    );
  });

  it("remplit le lexique de la dialyse", () => {
    expect(
      motifAdministratif(pmt, trace(H, {}, { hospitalisation: "H-SEANCE-HE" })),
    ).toBe(
      "un transport lié à une séance de dialyse, prise en compte comme une hospitalisation pour le transport",
    );
  });

  it("n'existe pas quand rien n'est prouvé", () => {
    expect(motifAdministratif(pmt, trace({}))).toBeUndefined();
  });
});
