// Ce que devient la Partie 2 quand la Partie 1 a déjà tranché — et ce qu'elle ne
// doit surtout pas devenir : indéterminée.
//
// Trois réponses concluent dès la Partie 1 : l'urgence vitale SMUR — qualifiée
// en Q1 depuis la v9.5.0, et en M0 avant elle —, la permission de sortie sans
// motif médical, et le seul motif bariatrique. Le modèle dit alors
// `cible_partie_2_requise = non`, et le questionnaire administratif n'a rien à
// poser.
//
// La v9.4.0 le disait pourtant à moitié. `p2_parcours_standard_applicable`
// s'ouvrait sur `p2_patient_hospitalise = non` — or, en Publicodes, une règle
// non applicable se compare comme égale à `non`. La Partie 2 se rouvrait donc
// derrière le dos du cas final, jusqu'à laisser `p2_motif_ouvrant_droit`
// **indéterminé** au lieu de faux : une famille entière de règles passait de
// « décidé » à « on ne sait pas », pour des dossiers que la Partie 1 avait clos.
// C'est l'anomalie que nous avons remontée à l'éditeur, corrigée en v9.4.1 par
// deux gardes — `cible_partie_2_requise = 'oui'` sur le parcours standard et sur
// le motif, et une réponse explicite exigée avant d'ouvrir la branche non
// hospitalisée.
//
// Ce fichier porte les scénarios PART2-GATE-001 et PART2-GATE-002 du livrable :
// c'est lui qui le dira si une prochaine recopie défait la correction.

import { describe, expect, it } from "vitest";
import { estApplicable, evalue, SMUR } from "./situations-v9-5-0";

// Les trois sorties directes, avec les réponses qui les produisent et le cas
// final que chacune arrête. La base neutre répond par ailleurs à tout le
// questionnaire administratif : c'est le dossier qu'un secrétariat reprend, et
// le pire cas pour ces gardes.
const SORTIES_DIRECTES = [
  ["urgence vitale SMUR", { p1_autonomie: SMUR }, "SMUR"],
  [
    "permission de sortie sans motif médical",
    { p1_m0_permission_sans_motif_medical: "oui", p1_m0_aucun: "non" },
    "permission de sortie sans motif médical",
  ],
  [
    "motif bariatrique seul",
    { p1_m0_bariatrique: "oui", p1_m0_aucun: "non" },
    "bariatrique seul",
  ],
] as const;

describe("PART2-GATE-001 — une sortie directe de la Partie 1 ferme la Partie 2", () => {
  it.each(SORTIES_DIRECTES)(
    "%s conclut sans qualification administrative",
    (_libelle, reponses, casFinal) => {
      const moteur = evalue({ ...reponses });

      expect(moteur.evaluate("cible_partie_2_requise").nodeValue).toBe("non");
      expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(casFinal);
      // Décidé, pas indéterminé : c'est toute la correction.
      expect(moteur.evaluate("p2_parcours_standard_applicable").nodeValue).toBe(
        false,
      );
      expect(moteur.evaluate("p2_motif_ouvrant_droit").nodeValue).toBe(false);
      expect(moteur.evaluate("p2_accord_prealable_requis").nodeValue).toBe(
        false,
      );
      // Ni PMT ni DAP : le patient repart sans document de transport.
      expect(
        moteur.evaluate("cible_document_a_remettre_au_patient").nodeValue,
      ).toBe("aucun document");
      expect(estApplicable(moteur, "p2_convocation_ou_avis_type")).toBe(false);
    },
  );
});

describe("PART2-GATE-002 — A2.1 attend une réponse explicite à A0.1", () => {
  it("reste fermée tant que le patient hospitalisé n'est pas tranché", () => {
    const moteur = evalue({ p2_patient_hospitalise: null });

    expect(moteur.evaluate("cible_partie_2_requise").nodeValue).toBe("oui");
    expect(estApplicable(moteur, "p2_patient_hospitalise")).toBe(true);
    // `null` — indéterminé, donc pas posée. Le point est qu'elle ne soit pas
    // ouverte : une absence de réponse ne vaut pas « non hospitalisé ».
    expect(estApplicable(moteur, "p2_convocation_ou_avis_type")).not.toBe(true);
  });

  it("s'ouvre dès qu'A0.1 est répondue « non »", () => {
    const moteur = evalue({ p2_patient_hospitalise: "non" });
    expect(estApplicable(moteur, "p2_convocation_ou_avis_type")).toBe(true);
  });
});
