// Le motif, l'introduction et le rappel d'attente des deux demandes d'accord
// préalable (#136), et la convocation et la permission qui s'y ajoutent. Des
// traces écrites à la main : rien n'y est prouvé, sauf ce que le test pose.
// Les attendus sont recopiés du catalogue de l'éditeur et de ses aperçus PDF.

import { describe, expect, it } from "vitest";
import {
  DIALYSE,
  demande,
  LONGUE_DISTANCE,
  motif,
  PRECISION_DIALYSE,
  SANS_URGENCE,
  URGENCE,
} from "./demandes-du-test";
import { type Ajouts, fiche, NON_PARTAGE, TAP } from "./fiches-du-test";
import { vrai } from "./traces-du-praticien";

const DIALYSE_ET_150_KM =
  "Votre déplacement est lié à une séance de dialyse, prise en compte comme une hospitalisation pour le transport.";

describe("la convocation et la permission", () => {
  const PERMISSION = {
    fait_permission: vrai,
    fait_permission_mineur_admissible: vrai,
  } as const;
  const K =
    "Ce déplacement est lié à une convocation justifiant une prise en charge du transport.";
  const P =
    "Ce déplacement est lié à une permission de sortie d’hospitalisation répondant aux conditions de prise en charge du transport.";
  const L =
    "La prise en charge de votre transport nécessite l’accord préalable de l’Assurance Maladie car le trajet dépasse 150 km.";

  it("la convocation qualifiée se dit après le contexte", () => {
    const texte = demande(
      { ...DIALYSE, ...LONGUE_DISTANCE },
      { ...PRECISION_DIALYSE, faits: { fait_convocation: vrai } },
    );
    expect(texte?.raison).toBe(`${DIALYSE_ET_150_KM} ${K} ${L}`);
  });

  it("la convocation, puis la permission, puis la justification", () => {
    const texte = demande(LONGUE_DISTANCE, {
      faits: { fait_convocation: vrai, ...PERMISSION },
    });
    expect(texte?.raison).toBe(`${K} ${P} ${L}`);
  });

  it("une permission non admissible, ou sans réponse, ne se dit pas", () => {
    const sans = demande(LONGUE_DISTANCE, {
      faits: { fait_permission: vrai },
    });
    expect(sans?.raison).toBe(L);
    expect(
      demande(LONGUE_DISTANCE, {
        faits: { fait_convocation: { provenance: "test" } },
      })?.raison,
    ).toBe(L);
  });

  it("le motif relie les clauses : une seule, deux par « et », trois par virgules", () => {
    const motifK =
      "lié à une convocation justifiant la prise en charge du transport";
    const motifP =
      "lié à une permission de sortie d’hospitalisation répondant aux conditions de prise en charge du transport";
    const distance = "sur un trajet de plus de 150 km";
    const faits = (...f: ("K" | "P")[]): Ajouts => ({
      faits: {
        ...(f.includes("K") && { fait_convocation: vrai }),
        ...(f.includes("P") && PERMISSION),
      },
    });
    expect(motif(demande({}, faits("K")))).toContain(
      `au titre d’un transport ${motifK} ;`,
    );
    expect(motif(demande(LONGUE_DISTANCE, faits("K")))).toContain(
      `au titre d’un transport ${motifK} et ${distance} ;`,
    );
    expect(motif(demande(LONGUE_DISTANCE, faits("K", "P")))).toContain(
      `au titre d’un transport ${motifK}, ${motifP} et ${distance} ;`,
    );
  });
});

describe("le motif administratif du modus", () => {
  it("un transport sans autre base : un espace, puis le complément", () => {
    expect(motif(demande(LONGUE_DISTANCE))).toBe(
      "que votre transport sera pris en charge par l’Assurance Maladie au titre d’un transport sur un trajet de plus de 150 km ;",
    );
  });

  it("une base détaillée : une virgule, puis le complément", () => {
    expect(
      motif(demande({ ...DIALYSE, ...LONGUE_DISTANCE }, PRECISION_DIALYSE)),
    ).toBe(
      "que votre transport sera pris en charge par l’Assurance Maladie au titre d’un transport lié à une séance de dialyse, prise en compte comme une hospitalisation pour le transport, sur un trajet de plus de 150 km ;",
    );
  });

  it("avec urgence : « pourra être pris en charge, au titre d’ »", () => {
    expect(
      motif(
        demande({ ...DIALYSE, ...LONGUE_DISTANCE }, PRECISION_DIALYSE, URGENCE),
      ),
    ).toBe(
      "que votre transport pourra être pris en charge par l’Assurance Maladie, au titre d’un transport lié à une séance de dialyse, prise en compte comme une hospitalisation pour le transport, sur un trajet de plus de 150 km ;",
    );
  });

  it("sans motif d'accord, la base seule", () => {
    expect(motif(demande(DIALYSE, PRECISION_DIALYSE))).toContain(
      "au titre d’un transport lié à une séance de dialyse, prise en compte comme une hospitalisation pour le transport ;",
    );
  });
});

describe("l'introduction", () => {
  it("sans urgence : le titre de l'issue, puis son sous-titre en paragraphes", () => {
    const { consignes } = demande(LONGUE_DISTANCE) ?? {};
    expect(consignes?.introduction).toBe(
      "Une prescription médicale de transport avec demande d’accord préalable va vous être remise.",
    );
    expect(consignes?.complement).toEqual([
      "Si le professionnel qui vous a remis la demande d’accord préalable ne l’a pas déjà envoyée, adressez dès que possible les volets 1 et 2 du document sous enveloppe au service médical de votre caisse d’assurance maladie, à l’attention du médecin-conseil. Vous trouverez l’adresse sur [ameli.fr](https://www.ameli.fr/).",
      "Conservez une preuve d’envoi et le volet 3, qui vaut prescription médicale de transport.",
      "L’absence de réponse dans les 15 jours à compter de l’envoi de la demande vaut accord. En cas de refus, vous recevez un courrier de l’Assurance Maladie.",
      "Attendez l’accord avant d’effectuer votre transport. Un accord reçu avant la fin des 15 jours permet de réaliser le transport plus tôt.",
    ]);
  });

  it("avec urgence : le sous-titre dit qu'on n'attend pas", () => {
    const { consignes } = demande(LONGUE_DISTANCE, {}, URGENCE) ?? {};
    expect(consignes?.complement.at(1)).toBe(
      "Votre médecin atteste l’urgence de votre transport. Vous pouvez effectuer ce transport sans attendre l’accord préalable de l’Assurance Maladie.",
    );
    expect(consignes?.complement).toHaveLength(3);
  });

  it("la première étape ouvre sur l'attente, ou sur l'urgence", () => {
    expect(demande(LONGUE_DISTANCE)?.consignes.etapes[0]?.titre).toBe(
      "Dès votre rendez-vous fixé",
    );
    expect(
      demande(LONGUE_DISTANCE, {}, URGENCE)?.consignes.etapes[0]?.titre,
    ).toBe("Aussi tôt que possible");
  });

  it("la prescription médicale de transport n'a pas de sous-titre", () => {
    const texte = fiche({ ...TAP, ...NON_PARTAGE });
    expect(texte?.consignes.complement).toEqual([]);
  });
});

describe("le rappel d'attente suit cible_attente_accord", () => {
  const ATTENDRE =
    "La prise en charge de votre transport nécessite l’accord préalable de l’Assurance Maladie. Sans réponse dans les 15 jours suivant l’envoi de votre demande, l’accord est considéré comme obtenu. Attendez cet accord avant d’effectuer le transport.";
  const PARTIR =
    "L’urgence de votre transport est attestée par votre médecin. Vous pouvez effectuer ce transport sans attendre l’accord préalable de l’Assurance Maladie.";

  it("attendre l'accord : le rappel de l'issue sans urgence", () => {
    expect(
      demande({ cible_attente_accord: true }, {}, SANS_URGENCE)?.rappel,
    ).toBe(ATTENDRE);
  });

  it("partir sans attendre : le rappel de l'urgence attestée", () => {
    expect(demande({ cible_attente_accord: false }, {}, URGENCE)?.rappel).toBe(
      PARTIR,
    );
  });

  it("suit la cible, pas le nom de l'issue", () => {
    expect(demande({ cible_attente_accord: true }, {}, URGENCE)?.rappel).toBe(
      ATTENDRE,
    );
    expect(
      demande({ cible_attente_accord: false }, {}, SANS_URGENCE)?.rappel,
    ).toBe(PARTIR);
  });

  it("sans réponse des règles, aucun rappel", () => {
    expect(demande({}, {}, SANS_URGENCE)?.rappel).toBeUndefined();
    expect(
      demande({ cible_attente_accord: undefined }, {}, URGENCE)?.rappel,
    ).toBeUndefined();
  });

  it("la prescription médicale de transport n'a pas de rappel", () => {
    expect(
      fiche({ ...TAP, cible_attente_accord: true })?.rappel,
    ).toBeUndefined();
  });
});
