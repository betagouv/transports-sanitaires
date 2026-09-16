// Ce que devient la Partie 2 quand la Partie 1 a tranché — et ce qu'elle ne doit
// surtout pas devenir : indéterminée.
//
// Ce fichier gardait une correction obtenue de l'éditeur. La v9.4.0 laissait la
// Partie 2 se rouvrir derrière le dos du cas final : `p2_parcours_standard_applicable`
// s'ouvrait sur `p2_patient_hospitalise = non`, or une règle non applicable se
// compare en Publicodes comme égale à `non`. `p2_motif_ouvrant_droit` passait
// alors de « décidé » à « on ne sait pas », pour des dossiers que la Partie 1
// avait clos. La v9.4.1 avait corrigé par deux gardes.
//
// **La v9.7 a supprimé les trois sorties directes de la Partie 1.** L'urgence
// vitale SMUR n'est plus une réponse de Q1 ; la permission de sortie sans motif
// médical se qualifie désormais en Partie 2 ; le seul motif bariatrique ne
// conclut plus rien. `cible_partie_2_requise` vaut « oui » dès que la décision
// médicale est complète, sans condition. Le scénario PART2-GATE-001 du livrable
// n'a donc plus de situation à décrire.
//
// Plutôt que de le supprimer, ce fichier constate l'impasse : il vérifie qu'aucune
// réponse de la Partie 1 ne ferme plus la Partie 2, et garde le fond de la
// correction — rien ne laisse `p2_motif_ouvrant_droit` indéterminé. Le jour où
// une sortie directe réapparaît, le premier test redevient rouge et rappelle ce
// qu'il faut alors réécrire.

import { describe, expect, it } from "vitest";
import { estApplicable, evalue } from "./situations-v9-7-2";

// Les trois réponses qui concluaient la Partie 1 jusqu'en v9.5.1, exprimées dans
// le vocabulaire de la v9.7 quand il en reste un. La permission ne se déclare
// plus en M0 mais par la raison principale ; le SMUR n'a plus d'expression.
const ANCIENNES_SORTIES_DIRECTES = [
  [
    "permission de sortie sans motif médical",
    {
      p2_raison_principale: "'Permission temporaire de sortie'",
      p2_permission_cadre: "'Demande du patient sans justification médicale'",
    },
  ],
  ["motif bariatrique seul", { p1_m0_bariatrique: "oui", p1_m0_aucun: "non" }],
] as const;

describe("PART2-GATE-001 — la Partie 2 ne se ferme plus", () => {
  it.each(ANCIENNES_SORTIES_DIRECTES)(
    "%s traverse désormais la Partie 2",
    (_libelle, reponses) => {
      const moteur = evalue({ ...reponses });
      expect(moteur.evaluate("cible_partie_2_requise").nodeValue).toBe("oui");
    },
  );

  it("aucune réponse médicale ne rend la Partie 2 facultative", () => {
    // La garde du modèle est désormais sans alternative : la Partie 2 est requise
    // dès que la décision médicale est complète. Si cette règle regagnait une
    // variation, ce test le dirait avant que le questionnaire ne se referme.
    for (const reponses of ANCIENNES_SORTIES_DIRECTES.map(([, r]) => r)) {
      const moteur = evalue({ ...reponses });
      expect(moteur.evaluate("p1_decision_medicale_complete").nodeValue).toBe(
        true,
      );
      expect(moteur.evaluate("cible_partie_2_requise").nodeValue).toBe("oui");
    }
  });
});

describe("PART2-GATE-002 — rien ne laisse le motif indéterminé", () => {
  it("tranche le motif ouvrant droit, même sans transfert déclaré", () => {
    // Le fond de la correction v9.4.1 : décidé, jamais indéterminé. La v9.7 a
    // remplacé `p2_patient_hospitalise` par la qualification positive du
    // transfert, mais la garde vaut toujours — une absence de transfert ne doit
    // pas rendre le motif indécidable.
    const moteur = evalue({ p2_transfert_en_cours: "non" });
    expect(moteur.evaluate("p2_motif_ouvrant_droit").nodeValue).not.toBe(null);
  });

  it("n'ouvre pas la convocation tant que le transfert n'est pas tranché", () => {
    const moteur = evalue({ p2_transfert_en_cours: null });
    // `null` — indéterminé, donc pas posée. Le point est qu'elle ne soit pas
    // ouverte : une absence de réponse ne vaut pas « aucun transfert ».
    expect(estApplicable(moteur, "p2_convocation_ou_avis_type")).not.toBe(true);
  });
});
