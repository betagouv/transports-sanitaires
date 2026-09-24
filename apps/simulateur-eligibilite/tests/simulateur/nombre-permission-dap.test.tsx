// TS973-09 (famille PERM-DAP-TOTAL-INCOMPATIBLE) : le total de trajets d'une
// DAP de permission se confronte à la période, à la fréquence mensuelle et aux
// sens couverts. Un aller-retour identique compte deux trajets.
//
// Les cas sont ceux de la campagne de l'éditeur (`permissions.mjs`,
// `DAP-PERIODE-*`, `DAP-ALLER-RETOUR-IMPAIR-*`, `DAP-TOTAL-DISTINCT`,
// `DAP-TRAJETS-SIMPLES-IMPAIR`), rejoués sur ses valeurs par défaut.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Situation } from "publicodes";
import { describe, expect, it } from "vitest";
import { seedParId } from "../../front/outils-produit/seeds/catalogue";
import { situationDe } from "../../front/outils-produit/seeds/seed";
import { CIBLES_ADMINISTRATIVES } from "../../front/simulateur/cibles-du-parcours";
import { avecEntreesCalculees } from "../../front/simulateur/entrees-calculees";
import { moteur, texte } from "../../front/simulateur/moteur";
import { capaciteDeLaDap } from "../../front/simulateur/nombre-permission-dap";
import { Parcours } from "../../front/simulateur/questionnaire/Parcours";
import { saisieACorriger } from "../../front/simulateur/questionnaire/saisie-a-corriger";
import { type OptionsDuLivrable, situationDuLivrable } from "./livrable-v9-7-2";

const DAP = "demande d’accord préalable";
const LIMITE_DE_PAGES = 40;

const PERMISSION_DAP: OptionsDuLivrable = {
  reason: "Permission temporaire de sortie",
  distance: 2,
};

// Une seule permission, du vendredi 4 au dimanche 6 septembre, dans une
// période qui s'arrête le jour du retour.
const UNE_SEULE_PERMISSION: OptionsDuLivrable = {
  ...PERMISSION_DAP,
  permissionStart: "2026-09-04T10:00:00+02:00",
  permissionEnd: "2026-09-06T10:00:00+02:00",
  overrides: {
    p2_permission_ar_par_mois: "1",
    p2_permission_periode_fin: "'2026-09-06'",
  },
};

function avecTotal(options: OptionsDuLivrable, total: number) {
  return situationDuLivrable({
    ...options,
    overrides: {
      ...options.overrides,
      p2_nombre_transports_permission_dap: String(total),
    },
  });
}

function casFinal(situation: Situation<string>) {
  return texte(moteur.setSituation(situation), "cible_cas_final");
}

describe("TS973-09, une seule permission du 4 au 6 septembre", () => {
  it("couvre au plus un aller-retour", () => {
    expect(capaciteDeLaDap(avecTotal(UNE_SEULE_PERMISSION, 2))).toBe(2);
  });

  it("accepte 2 trajets", () => {
    const situation = avecTotal(UNE_SEULE_PERMISSION, 2);
    expect(situation.p2_nombre_permission_dap_valide).toBe("oui");
    expect(casFinal(situation)).toBe(DAP);
  });

  it.each([4, 999])("refuse %i trajets", (total) => {
    const situation = avecTotal(UNE_SEULE_PERMISSION, total);
    expect(situation.p2_nombre_permission_dap_valide).toBe("non");
    expect(casFinal(situation)).not.toBe(DAP);
  });
});

describe("TS973-09, les sens couverts", () => {
  it.each([1, 3, 11])(
    "des allers-retours identiques refusent %i trajets, un total impair",
    (total) => {
      const situation = avecTotal(PERMISSION_DAP, total);
      expect(situation.p2_nombre_permission_dap_valide).toBe("non");
      expect(casFinal(situation)).not.toBe(DAP);
    },
  );

  it("12 trajets en aller-retour restent acceptés sur une période suffisante", () => {
    const situation = avecTotal(PERMISSION_DAP, 12);
    expect(situation.p2_nombre_permission_dap_valide).toBe("oui");
    expect(casFinal(situation)).toBe(DAP);
  });

  it("11 trajets simples restent acceptés sur une période suffisante", () => {
    const situation = avecTotal(
      { ...PERMISSION_DAP, organization: "trajets simples" },
      11,
    );
    expect(situation.p2_nombre_permission_dap_valide).toBe("oui");
    expect(casFinal(situation)).toBe(DAP);
  });
});

describe("TS973-09, la capacité est un maximum, pas une valeur imposée", () => {
  it("un total inférieur au maximum reste accepté", () => {
    const situation = avecTotal(PERMISSION_DAP, 2);
    expect(capaciteDeLaDap(situation)).toBeGreaterThan(2);
    expect(situation.p2_nombre_permission_dap_valide).toBe("oui");
  });

  it("le total retenu est celui saisi, jamais la capacité", () => {
    const positionne = moteur.setSituation(avecTotal(PERMISSION_DAP, 2));
    expect(texte(positionne, "cible_nombre_transports_document")).toBe("2");
  });

  it.each(["0", "1.5", "'deux'"])(
    "refuse un total qui n'est pas un entier d'au moins 1 (%s)",
    (total) => {
      const situation = situationDuLivrable({
        ...PERMISSION_DAP,
        overrides: { p2_nombre_transports_permission_dap: total },
      });
      expect(situation.p2_nombre_permission_dap_valide).toBe("non");
      expect(
        saisieACorriger("p2_nombre_transports_permission_dap", situation),
      ).toMatch(/nombre entier/);
    },
  );

  it("une période hors des six mois n'offre aucune capacité", () => {
    const situation = avecTotal(
      {
        ...PERMISSION_DAP,
        overrides: { p2_permission_periode_fin: "'2027-03-01'" },
      },
      2,
    );
    expect(capaciteDeLaDap(situation)).toBe(0);
    expect(situation.p2_nombre_permission_dap_valide).toBe("non");
  });
});

describe("TS973-09, la saisie incompatible à l'écran", () => {
  it("affiche l'erreur, garde la saisie et n'avance pas", async () => {
    const user = userEvent.setup({ delay: null });
    const { p2_nombre_transports_permission_dap: _, ...sansTotal } = avecTotal(
      UNE_SEULE_PERMISSION,
      2,
    );
    render(
      <Parcours
        outil="secretariat"
        cibles={CIBLES_ADMINISTRATIVES}
        situationInitiale={sansTotal}
        libelleFin="Voir le document"
        onTermine={() => {}}
      />,
    );
    // Les pages d'avant sont déjà répondues : on les passe.
    const total = /combien de trajets sont couverts/i;
    for (let page = 0; page < LIMITE_DE_PAGES; page++) {
      if (screen.queryByRole("spinbutton", { name: total })) break;
      await user.click(screen.getByRole("button", { name: /^suivant$/i }));
    }
    const champ = screen.getByRole("spinbutton", { name: total });

    await user.type(champ, "4");
    expect(champ).toHaveValue(4);
    expect(screen.getByText(/au plus 2 trajets/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /suivant|voir/i }),
    ).toBeDisabled();

    const corrige = screen.getByRole("spinbutton", { name: total });
    expect(corrige).toHaveValue(4);
    expect(corrige).toBeEnabled();
    await user.clear(corrige);
    await user.type(corrige, "2");
    expect(screen.queryByText(/au plus 2 trajets/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /suivant|voir/i })).toBeEnabled();
  }, 40_000);
});

describe("TS973-09, les seeds de permission avec DAP", () => {
  it("gardent un total compatible une fois les entrées recalculées", () => {
    const seed = seedParId("secretariat-permission-longue-distance");
    const situation = avecEntreesCalculees(situationDe(seed));
    expect(situation.p2_nombre_permission_dap_valide).toBe("oui");
    expect(casFinal(situation)).toBe(DAP);
  });
});

// Le formulaire rend des dates-heures sans fuseau : l'heure de
// l'établissement, lue à Paris quel que soit le fuseau de la machine.
describe("TS973-09, les dates-heures du formulaire", () => {
  const sansFuseau = (debut: string, fin: string, finDePeriode: string) =>
    avecTotal(
      {
        ...PERMISSION_DAP,
        permissionStart: debut,
        permissionEnd: fin,
        overrides: {
          p2_permission_ar_par_mois: "1",
          p2_permission_periode_fin: `'${finDePeriode}'`,
        },
      },
      2,
    );

  it("une seule permission sans fuseau couvre un aller-retour", () => {
    const situation = sansFuseau(
      "2026-09-04T10:00",
      "2026-09-06T10:00",
      "2026-09-06",
    );
    expect(capaciteDeLaDap(situation)).toBe(2);
    expect(situation.p2_nombre_permission_dap_valide).toBe("oui");
  });

  it("48 heures murales au passage à l'heure d'hiver en font 49 : refusé", () => {
    const situation = sansFuseau(
      "2026-10-24T10:00",
      "2026-10-26T10:00",
      "2026-12-31",
    );
    expect(capaciteDeLaDap(situation)).toBe(0);
  });

  it("le jour d'une permission se lit à Paris, pas dans le texte", () => {
    // 23 h UTC le 12 juillet, c'est déjà le 13 à Paris.
    const situation = sansFuseau(
      "2026-07-12T23:00:00Z",
      "2026-07-13T19:00:00Z",
      "2026-07-13",
    );
    expect(capaciteDeLaDap(situation)).toBe(2);
  });

  it("une date sans heure n'est pas une date-heure de permission", () => {
    expect(
      capaciteDeLaDap(sansFuseau("2026-09-04", "2026-09-05", "2026-09-06")),
    ).toBe(0);
  });
});
