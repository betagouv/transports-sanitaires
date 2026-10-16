// Le texte des deux demandes d'accord préalable (#136) : la raison que lit le
// patient, et le lexique qu'elle remplit. Des traces écrites à la
// main : rien n'y est prouvé, sauf ce que le test pose. Les attendus sont
// recopiés du catalogue de l'éditeur et de ses aperçus PDF.

import { describe, expect, it } from "vitest";
import type { Cibles } from "../../../front/models/eligibilite/declarations/cibles";
import { codesDeLAccord } from "../../../front/models/eligibilite/fondement-de-l-accord-prealable";
import {
  DIALYSE,
  demande,
  LONGUE_DISTANCE,
  motif,
  PRECISION_DIALYSE,
  URGENCE,
} from "./demandes-du-test";
import { dapSansUrgence, dapUrgence } from "./fiches-du-test";
import { vrai } from "./traces-du-praticien";

const DIALYSE_ET_150_KM =
  "Votre déplacement est lié à une séance de dialyse, prise en compte comme une hospitalisation pour le transport.";

describe("la raison d'une demande sans urgence", () => {
  it("dit la dialyse, puis la distance de plus de 150 km", () => {
    const texte = demande(
      { ...DIALYSE, ...LONGUE_DISTANCE },
      PRECISION_DIALYSE,
    );
    expect(texte?.raison).toBe(
      `${DIALYSE_ET_150_KM} La prise en charge de votre transport nécessite l’accord préalable de l’Assurance Maladie car le trajet dépasse 150 km.`,
    );
  });

  it("sans contexte, ne garde que la justification", () => {
    expect(demande(LONGUE_DISTANCE)?.raison).toBe(
      "La prise en charge de votre transport nécessite l’accord préalable de l’Assurance Maladie car le trajet dépasse 150 km.",
    );
  });

  it("une précision absente prend le repli du catalogue", () => {
    expect(demande({ ...DIALYSE, ...LONGUE_DISTANCE })?.raison).toMatch(
      /^Votre déplacement est lié à des soins pris en compte comme une hospitalisation pour le transport\. /,
    );
  });
});

describe("la raison d'une demande avec urgence attestée", () => {
  it("dit la dialyse, la distance, puis la dispense d'attendre", () => {
    const texte = demande(
      { ...DIALYSE, ...LONGUE_DISTANCE },
      PRECISION_DIALYSE,
      URGENCE,
    );
    expect(texte?.raison).toBe(
      `${DIALYSE_ET_150_KM} Votre trajet dépasse 150 km. L’urgence étant attestée par votre médecin, vous pouvez effectuer ce transport sans attendre l’accord préalable de l’Assurance Maladie.`,
    );
  });
});

describe("la justification suit l'ensemble exact des motifs établis", () => {
  const cible = {
    L: "cible_dap_motif_longue_distance",
    S: "cible_dap_motif_serie",
    V: "cible_dap_motif_avion_bateau",
    C: "cible_dap_motif_camsp_cmpp",
    N: "cible_dap_motif_engagement_maternite",
  } as const;
  const motifs = (codes: readonly string[]): Partial<Cibles> =>
    Object.fromEntries(
      Object.entries(cible).map(([code, nom]) => [nom, codes.includes(code)]),
    );

  // Le lexique par défaut, et le texte du catalogue sans repère restant.
  const lu = (texte: string) =>
    texte
      .replaceAll(
        "{segment_ligne_reguliere}",
        "avion de ligne régulière ou en bateau de ligne régulière",
      )
      .replaceAll(
        "{cadre_camsp_cmpp}",
        "un centre d’action médico-sociale précoce (CAMSP) ou un centre médico-psycho-pédagogique (CMPP)",
      );

  it.each(
    dapSansUrgence.dapPhrases.map(({ id, codes, text }) => [id, codes, text]),
  )("%s : une phrase sans urgence", (_id, codes, text) => {
    expect(demande(motifs(codes as string[]))?.raison).toBe(lu(text as string));
  });

  it.each(
    dapUrgence.dapPhrases.map(({ id, codes, text }) => [id, codes, text]),
  )("%s : une phrase avec urgence", (_id, codes, text) => {
    expect(demande(motifs(codes as string[]), {}, URGENCE)?.raison).toBe(
      lu(text as string),
    );
  });

  it("lit les codes dans l'ordre L, S, V, C, N", () => {
    expect(codesDeLAccord(motifs(["N", "C", "V", "S", "L"]) as Cibles)).toEqual(
      ["L", "S", "V", "C", "N"],
    );
  });

  it("sans motif établi, ou sans phrase pour eux, n'écrit aucune justification", () => {
    expect(demande({})?.raison).toBeUndefined();
    // Avec urgence attestée, l'éditeur n'écrit rien pour C ni pour N.
    expect(demande(motifs(["C"]), {}, URGENCE)?.raison).toBeUndefined();
    expect(demande(motifs(["L", "N"]), {}, URGENCE)?.raison).toBeUndefined();
  });

  it("un motif non prouvé n'est jamais écrit", () => {
    expect(
      demande({ cible_dap_motif_longue_distance: undefined })?.raison,
    ).toBeUndefined();
    expect(
      demande({ cible_dap_motif_longue_distance: false })?.raison,
    ).toBeUndefined();
  });
});

describe("le lexique de l'accord préalable", () => {
  const SEGMENT = { cible_dap_motif_avion_bateau: true } as const;
  const CAMSP = { cible_dap_motif_camsp_cmpp: true } as const;

  it("avion ou bateau : la valeur commune, faute de précision", () => {
    expect(demande(SEGMENT)?.raison).toBe(
      "La prise en charge de votre transport nécessite l’accord préalable de l’Assurance Maladie car le trajet comprend un segment en avion de ligne régulière ou en bateau de ligne régulière.",
    );
  });

  it.each([
    ["avion", "un segment en avion de ligne régulière."],
    ["bateau", "un segment en bateau de ligne régulière."],
    [
      "both",
      "un segment en avion de ligne régulière et en bateau de ligne régulière.",
    ],
  ] as const)(
    "avion ou bateau : la précision %s, si une réponse la prouve",
    (lineType, fin) => {
      expect(demande(SEGMENT, { precisions: { lineType } })?.raison).toMatch(
        new RegExp(`${fin}$`),
      );
    },
  );

  it("CAMSP ou CMPP : la valeur commune, faute de précision", () => {
    expect(demande(CAMSP)?.raison).toBe(
      "La prise en charge de votre transport nécessite l’accord préalable de l’Assurance Maladie car le déplacement est lié à des soins ou traitements dans un centre d’action médico-sociale précoce (CAMSP) ou un centre médico-psycho-pédagogique (CMPP).",
    );
  });

  it.each([
    ["CAMSP", "dans un centre d’action médico-sociale précoce (CAMSP)."],
    ["CMPP", "dans un centre médico-psycho-pédagogique (CMPP)."],
  ] as const)("CAMSP ou CMPP : la précision %s", (camspType, fin) => {
    expect(demande(CAMSP, { precisions: { camspType } })?.raison).toMatch(
      new RegExp(`${fin.replace(/[()]/g, "\\$&")}$`),
    );
  });

  it("ambulance sans avion ni bateau : pour recevoir les soins", () => {
    const texte = demande({
      cible_mode_ambulance: true,
      ...LONGUE_DISTANCE,
    });
    expect(texte?.raison).toBe(
      "Un transport en ambulance est médicalement nécessaire pour recevoir vos soins. La prise en charge de votre transport nécessite l’accord préalable de l’Assurance Maladie car le trajet dépasse 150 km.",
    );
  });

  it("ambulance avec avion ou bateau : pour les portions terrestres", () => {
    const texte = demande({
      cible_mode_ambulance: true,
      cible_dap_motif_avion_bateau: true,
    });
    expect(texte?.raison).toMatch(
      /^Un transport en ambulance est médicalement nécessaire pour les portions terrestres concernées\. /,
    );
    expect(motif(texte)).toContain(
      "un transport en ambulance médicalement nécessaire pour les portions terrestres concernées,",
    );
  });

  it("ambulance sans avion ni bateau : le motif ne dit pas de portée", () => {
    expect(
      motif(demande({ cible_mode_ambulance: true, ...LONGUE_DISTANCE })),
    ).toContain(
      "au titre d’un transport en ambulance médicalement nécessaire, sur un trajet de plus de 150 km ;",
    );
  });

  it("ne laisse aucun repère dans aucun texte", () => {
    const texte = demande(
      { ...DIALYSE, cible_mode_ambulance: true, ...SEGMENT, ...CAMSP },
      {
        faits: { fait_convocation: vrai },
      },
    );
    expect(JSON.stringify(texte)).not.toMatch(/\{[a-z_]+\}|\[INTRO\]/);
  });
});
