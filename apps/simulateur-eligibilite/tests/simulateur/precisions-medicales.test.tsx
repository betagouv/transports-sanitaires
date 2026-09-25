// TS973-15 : les précisions médicales (`p2_motif_detail`,
// `p2_transfert_motif_detail`) se saisissent directement, avec des
// suggestions facultatives, et seulement quand le document les porte.
//
// Le modèle v9.7.3 les rend applicables après la détermination d'un document
// de prescription. L'application les pose en fin de parcours, comme l'ordre
// des étapes du contrat, et refuse un libellé générique ou une séance que la
// partie médicale ne déclare pas.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Situation } from "publicodes";
import { describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { seedParId } from "../../front/outils-produit/seeds/catalogue";
import { situationDe } from "../../front/outils-produit/seeds/seed";
import { CIBLES_ADMINISTRATIVES } from "../../front/simulateur/cibles-du-parcours";
import { avecEntreesCalculees } from "../../front/simulateur/entrees-calculees";
import { moteur, texte, vrai } from "../../front/simulateur/moteur";
import { rangDe } from "../../front/simulateur/questionnaire/etapes";
import { Parcours } from "../../front/simulateur/questionnaire/Parcours";
import { saisieACorriger } from "../../front/simulateur/questionnaire/saisie-a-corriger";

const PMT = "prescription médicale de transport";
const CONSULTATION = situationDe(
  seedParId("secretariat-consultation-cardiologie"),
);
const TRANSFERT = situationDe(
  seedParId("secretariat-transfert-provisoire-radiotherapie"),
);
const LIMITE_DE_PAGES = 40;

function sans(situation: Situation<string>, cle: string): Situation<string> {
  const { [cle]: _, ...reste } = situation;
  return reste;
}

function avec(situation: Situation<string>, entrees: Record<string, string>) {
  return avecEntreesCalculees({ ...situation, ...entrees });
}

describe("TS973-15, au moteur", () => {
  it("une issue sans Cerfa n'attend pas de précision", () => {
    // Base neutre : le patient se déplace seul, aucun transport prescrit.
    const positionne = moteur.setSituation(
      avecEntreesCalculees({
        ...sans(BASE_NEUTRE, "p2_motif_detail"),
        p2_raison_principale: "'Consultation médicale'",
      }),
    );
    expect(texte(positionne, "cible_cas_final")).not.toBe(PMT);
    expect(texte(positionne, "cible_cas_final")).not.toBe("");
    expect(positionne.evaluate("p2_motif_detail").nodeValue).toBeNull();
  });

  it("une PMT qui porte la précision ne se finalise pas sans elle", () => {
    const sansPrecision = moteur.setSituation(
      avecEntreesCalculees(sans(CONSULTATION, "p2_motif_detail")),
    );
    expect(vrai(sansPrecision, "cible_resultat_2_affichable")).toBe(false);
    expect(texte(moteur.setSituation(CONSULTATION), "cible_cas_final")).toBe(
      PMT,
    );
  });

  it.each([
    "Consultation médicale",
    "Autre examen ou soin",
    "Autre - préciser",
  ])("refuse le libellé générique « %s »", (generique) => {
    const situation = avec(CONSULTATION, {
      p2_motif_detail: `'${generique}'`,
    });
    expect(
      vrai(moteur.setSituation(situation), "p2_motif_detail_complet"),
    ).toBe(false);
    expect(saisieACorriger("p2_motif_detail", situation)).toMatch(/précisez/i);
  });

  it("accepte et garde un texte libre valide, même si la raison change", () => {
    // Rien n'efface la précision : passer de la consultation à l'examen la
    // garde telle quelle, et elle reste valide.
    const situation = avec(CONSULTATION, {
      p2_raison_principale: "'Examen médical'",
      p2_motif_detail: "'IRM cérébrale de contrôle'",
    });
    const positionne = moteur.setSituation(situation);
    expect(texte(positionne, "p2_motif_detail")).toBe(
      "IRM cérébrale de contrôle",
    );
    expect(vrai(positionne, "p2_motif_detail_complet")).toBe(true);
    expect(saisieACorriger("p2_motif_detail", situation)).toBeUndefined();
    expect(texte(positionne, "cible_cas_final")).toBe(PMT);
  });

  it("un transfert provisoire ne se finalise pas sans sa précision", () => {
    const positionne = moteur.setSituation(
      avecEntreesCalculees(sans(TRANSFERT, "p2_transfert_motif_detail")),
    );
    expect(vrai(positionne, "cible_resultat_2_affichable")).toBe(false);
  });

  it.each([
    ["un « Autre » seul", "Autre"],
    ["la raison en minuscules", "consultation médicale"],
    ["un texte de plus de 500 caractères", "Précision. ".repeat(50)],
  ])(
    "refuse %s, que le modèle accepterait, et ne sort aucun document",
    (_cas, saisie) => {
      const situation = avec(CONSULTATION, { p2_motif_detail: `'${saisie}'` });
      expect(saisieACorriger("p2_motif_detail", situation)).toBeDefined();
      expect(situation.p2_validations_documentaires).toBe("non");
      expect(
        vrai(moteur.setSituation(situation), "cible_resultat_2_affichable"),
      ).toBe(false);
    },
  );

  it("refuse une séance que la partie médicale ne déclare pas", () => {
    const situation = avec(TRANSFERT, {
      p1_m0_seance_radiotherapie: "non",
      p1_m0_aucun: "oui",
    });
    expect(saisieACorriger("p2_transfert_motif_detail", situation)).toMatch(
      /partie médicale/i,
    );
  });

  it("accepte une séance déclarée", () => {
    expect(
      saisieACorriger("p2_transfert_motif_detail", TRANSFERT),
    ).toBeUndefined();
  });
});

describe("TS973-15, l'ordre des étapes", () => {
  it("pose les précisions après le trajet, au stade documentaire", () => {
    for (const precision of ["p2_motif_detail", "p2_transfert_motif_detail"])
      expect(rangDe(precision)).toBeGreaterThan(
        rangDe("p2_justification_longue_distance"),
      );
  });
});

describe("TS973-15, à l'écran", () => {
  it("saisie directe, libellé selon la raison, suggestions facultatives", async () => {
    const libelle = /quelle consultation motive ce déplacement/i;
    const user = await ouvrirLaPrecision(
      sans(CONSULTATION, "p2_motif_detail"),
      libelle,
    );
    const champ = screen.getByRole("combobox", { name: libelle });
    expect(champ).toHaveValue("");
    expect(suggestionsDe(champ)).toEqual([
      "Consultation de cardiologie",
      "Consultation de neurologie",
      "Consultation d’oncologie",
    ]);

    await user.type(champ, "Consultation médicale");
    expect(screen.getByText(/précisez/i)).toBeInTheDocument();
    expect(bouton()).toBeDisabled();

    await user.clear(champ);
    await user.type(champ, "Consultation de pneumologie");
    expect(bouton()).toBeEnabled();
  }, 40_000);

  it("« Autre examen ou soin » mène droit à sa précision", async () => {
    const libelle = /précisez l’examen ou le soin à l’origine du déplacement/i;
    await ouvrirLaPrecision(
      avec(sans(CONSULTATION, "p2_motif_detail"), {
        p2_raison_principale: "'Autre examen ou soin'",
      }),
      libelle,
    );
    const champ = screen.getByLabelText(libelle);
    expect(champ).toHaveValue("");
    expect(screen.queryByRole("radio", { name: /^autre/i })).toBeNull();
  }, 40_000);

  it("ne suggère que les séances déclarées pour un transfert", async () => {
    const libelle = /quel examen ou soin motive ce transfert/i;
    await ouvrirLaPrecision(
      sans(TRANSFERT, "p2_transfert_motif_detail"),
      libelle,
    );
    const champ = screen.getByRole("combobox", { name: libelle });
    expect(suggestionsDe(champ)).toEqual([
      "Imagerie médicale",
      "Rééducation",
      "Séance de radiothérapie",
    ]);
  }, 40_000);
});

// ---- implémentation ----

/** Ouvre la Partie 2 et passe les pages déjà répondues jusqu'au champ `libelle`. */
async function ouvrirLaPrecision(
  situation: Situation<string>,
  libelle: RegExp,
) {
  const user = userEvent.setup({ delay: null });
  render(
    <Parcours
      outil="secretariat"
      cibles={CIBLES_ADMINISTRATIVES}
      situationInitiale={situation}
      libelleFin="Voir le document"
      onTermine={() => {}}
    />,
  );
  for (let page = 0; page < LIMITE_DE_PAGES; page++) {
    if (screen.queryByLabelText(libelle)) return user;
    await user.click(bouton());
  }
  throw new Error(`précision jamais posée : ${libelle}`);
}

function bouton() {
  return screen.getByRole("button", { name: /^suivant$|^voir le document$/i });
}

function suggestionsDe(champ: HTMLElement): string[] {
  const liste = document.getElementById(champ.getAttribute("list") ?? "");
  if (!liste) return [];
  return within(liste)
    .queryAllByRole("option", { hidden: true })
    .map((option) => option.getAttribute("value") ?? "");
}
