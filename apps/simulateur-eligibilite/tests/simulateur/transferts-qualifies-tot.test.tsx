// TS973-16 : la nature d'un transfert et ses exceptions se qualifient avant
// les contextes. Un transfert à la charge de l'établissement se conclut dès
// que son issue est connue, et changer une réponse de transfert repose les
// étapes qui en dépendaient.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { avecEntreesCalculees } from "../../front/simulateur/entrees-calculees";
import { moteur, texte } from "../../front/simulateur/moteur";
import { emettrePassation } from "../../front/simulateur/passation";
import { ETAPES } from "../../front/simulateur/questionnaire/etapes";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import {
  allerAuGroupe,
  PARTIE_1_AMBULANCE,
  type Reponse,
  terminerParcours,
} from "./parcours";

beforeEach(() => sessionStorage.clear());

const RAISON = /raison principale du déplacement/i;
const TRANSFERT = /^transfert d’un patient hospitalisé/i;
const NATURE = /^quelle est la nature du transfert \?$/i;
const EXCEPTIONS = /^le transport relève-t-il d’une exception/i;
const EHPAD = /^transport depuis ou vers un ehpad/i;
const DEPART = /^quel est le type de lieu de départ \?$/i;
const ETABLISSEMENT = "transport à la charge de l’établissement";

describe("TS973-16, l'ordre des étapes", () => {
  it("qualifie le transfert, puis ses exceptions, puis les contextes", () => {
    const ordre = ETAPES.map((etape) => etape.id);
    const rang = (id: string) => {
      expect(ordre).toContain(id);
      return ordre.indexOf(id);
    };
    expect(rang("p2_transfert_en_cours")).toBeLessThan(
      rang("p2_nature_transfert"),
    );
    expect(rang("p2_nature_transfert")).toBeLessThan(
      rang("p2_exceptions_assurance_maladie"),
    );
    expect(rang("p2_exceptions_assurance_maladie")).toBeLessThan(
      rang("p2_contextes_complementaires"),
    );
  });
});

describe("TS973-16, un transfert à la charge de l'établissement", () => {
  it("se conclut sans contextes, urgence, nombre ni adresse", async () => {
    const posees = await parcourir([
      [RAISON, TRANSFERT],
      [NATURE, /^définitif$/i],
    ]);
    // Le transfert définitif, sans exception possible, conclut sur la nature.
    expect(posees).toContain("p2_nature_transfert");
    expect(posees.some((nom) => nom.startsWith("p2_contexte_"))).toBe(false);
    for (const inutile of [
      "p2_transport_urgence",
      "p2_nombre_transports_prevus",
      "p2_depart_adresse",
      "p2_arrivee_adresse",
    ])
      expect(posees).not.toContain(inutile);
    expect(
      await screen.findAllByText(/à la charge de l’établissement/i, undefined, {
        timeout: 10_000,
      }),
    ).not.toHaveLength(0);
  }, 60_000);
});

describe("TS973-16, une exception Assurance Maladie cohérente", () => {
  it("poursuit la collecte jusqu'au trajet, contextes après exceptions", async () => {
    const posees = await parcourir([
      [RAISON, TRANSFERT],
      [NATURE, /^définitif$/i],
      [EHPAD],
      [DEPART, /^ehpad$/i],
    ]);
    const exception = posees.indexOf("p2_exception_ehpad");
    const contexte = posees.findIndex((nom) => nom.startsWith("p2_contexte_"));
    expect(exception).not.toBe(-1);
    expect(contexte).toBeGreaterThan(exception);
    expect(posees).toContain("p2_depart_adresse");
  }, 60_000);
});

describe("TS973-16, changer une réponse de transfert", () => {
  it("repose les exceptions, sans l'ancienne réponse", async () => {
    const user = userEvent.setup({ delay: null });
    emettrePassation(PARTIE_1_AMBULANCE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);
    await allerAuGroupe(user, EXCEPTIONS, [
      [RAISON, TRANSFERT],
      [NATURE, /^provisoire$/i],
    ]);
    await user.click(screen.getByRole("checkbox", { name: EHPAD }));
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    // Retour à la nature, qui passe à « Définitif ».
    while (!screen.queryByRole("group", { name: NATURE }))
      await user.click(screen.getByRole("button", { name: /^précédent$/i }));
    await user.click(
      within(screen.getByRole("group", { name: NATURE })).getByRole("radio", {
        name: /^définitif$/i,
      }),
    );

    const exceptions = await screen.findByRole("group", { name: EXCEPTIONS });
    expect(
      within(exceptions).getByRole("checkbox", { name: EHPAD }),
    ).not.toBeChecked();
  }, 60_000);
});

describe("TS973-16, au moteur", () => {
  it.each([
    ["Consultation médicale", "Consultation de cardiologie"],
    ["Examen médical", "Imagerie médicale"],
  ])(
    "%s pendant une hospitalisation : qualifiée par la question, pas par les adresses",
    (raison, precision) => {
      const deuxStructures = {
        ...BASE_NEUTRE,
        ...PARTIE_1_AMBULANCE,
        p2_raison_principale: `'${raison}'`,
        p2_motif_detail: `'${precision}'`,
        p2_trajet_depart: "'Structure de soins'",
        p2_trajet_arrivee: "'Structure de soins'",
        p2_depart_nom_lieu: "'Centre hospitalier'",
        p2_arrivee_nom_lieu: "'Centre de cardiologie'",
      };
      const horsHospitalisation = moteur.setSituation(
        avecEntreesCalculees({
          ...deuxStructures,
          p2_transfert_en_cours: "non",
        }),
      );
      expect(texte(horsHospitalisation, "cible_cas_final")).toBe(
        "prescription médicale de transport",
      );
      const pendantHospitalisation = moteur.setSituation(
        avecEntreesCalculees({
          ...deuxStructures,
          p2_transfert_en_cours: "oui",
          p2_nature_transfert: "'Définitif'",
        }),
      );
      expect(texte(pendantHospitalisation, "cible_cas_final")).toBe(
        ETABLISSEMENT,
      );
    },
  );
});

// ---- implémentation ----

/** Mène la Partie 2 au bout, et rend les champs posés, dans l'ordre. */
async function parcourir(reponses: Reponse[]): Promise<string[]> {
  const user = userEvent.setup({ delay: null });
  emettrePassation(PARTIE_1_AMBULANCE);
  render(<Secretariat onNouvelleSimulation={() => {}} />);
  const posees: string[] = [];
  await terminerParcours(user, reponses, () => {
    for (const champ of document.querySelectorAll("input[name]")) {
      const nom = champ.getAttribute("name") ?? "";
      if (!posees.includes(nom)) posees.push(nom);
    }
  });
  return posees;
}
