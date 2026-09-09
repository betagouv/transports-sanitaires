// Les bornes d'une saisie chiffrée, telles que l'utilisateur les rencontre.
//
// Le champ les ignorait autrefois : `min: 0` était écrit en dur dans
// `ChampDeFormulaire.tsx`. L'écran acceptait donc un 0 que le modèle rejette
// ensuite, et le refus n'arrivait qu'une fois la page quittée, sans que rien
// l'ait annoncé.
//
// La v9.7 a déplacé ces bornes : le modèle n'en porte plus aucune, et c'est
// `ui.inputs` qui dit le minimum, le maximum et l'entier de chaque question
// chiffrée. `front/simulateur/questionnaire/bornes-de-saisie.ts` en est la
// recopie, et ce fichier tient les deux bouts : ce que le champ affiche, et le
// fait que toute question chiffrée du modèle passe bien par cette recopie — une
// question ajoutée sans bornes y échoue plutôt que d'être ignorée en silence.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import yaml from "js-yaml";
import { beforeEach, describe, expect, it } from "vitest";
import { ENTREES_CALCULEES } from "../../front/simulateur/contrat-regles-publicodes";
import { emettrePassation } from "../../front/simulateur/passation";
import { bornesDeSaisie } from "../../front/simulateur/questionnaire/bornes-de-saisie";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { allerAuChampNombre, PARTIE_1_AMBULANCE } from "./parcours";

beforeEach(() => sessionStorage.clear());

/** Le nombre de transports prévus sur deux mois, la première question chiffrée. */
const NOMBRE_DE_TRANSPORTS = "p2_nombre_transports_prevus";

const regles = yaml.load(
  readFileSync(
    join(
      resolve(dirname(fileURLToPath(import.meta.url)), "../.."),
      "regles/regles.publicodes",
    ),
    "utf-8",
  ),
) as Record<string, { type?: string; question?: string } | null>;

describe("le champ du nombre de transports", () => {
  it("porte les bornes du contrat, et non les siennes", async () => {
    emettrePassation(PARTIE_1_AMBULANCE);
    const user = userEvent.setup({ delay: null });
    render(<Secretariat onNouvelleSimulation={() => {}} />);
    await allerAuChampNombre(user);

    const champ = screen.getByRole("spinbutton");
    // 1 et non 0 : le contrat refuse un transport prévu de moins, et l'écran
    // doit le refuser au même endroit. Le pas dit l'entier : pas de demi-trajet.
    expect(champ).toHaveAttribute("min", "1");
    expect(champ).toHaveAttribute("step", "1");
  }, 40_000);

  it("lit ces bornes dans la recopie du contrat, pas dans le code du champ", () => {
    expect(bornesDeSaisie(NOMBRE_DE_TRANSPORTS)).toEqual({ min: 1, pas: 1 });
  });

  it("borne au plus haut la fréquence mensuelle d’une permission", () => {
    // Le seul plafond du contrat : au plus un aller-retour par semaine, soit
    // cinq selon le calendrier.
    expect(bornesDeSaisie("p2_permission_ar_par_mois")).toEqual({
      min: 1,
      max: 5,
      pas: 1,
    });
  });

  it("ne borne rien là où le contrat ne borne rien", () => {
    // Une question sans bornes déclarées ne s'en voit pas prêter : l'interface
    // n'invente pas ce que le contrat n'a pas dit.
    expect(bornesDeSaisie("p2_trajet_depart")).toEqual({});
  });
});

describe("couverture — aucune question chiffrée sans bornes", () => {
  it("borne chaque question chiffrée que le prescripteur répond", () => {
    const calculees = new Set<string>(ENTREES_CALCULEES);
    const chiffrees = Object.entries(regles)
      .filter(([, regle]) => regle?.type === "nombre")
      .filter(([, regle]) => regle?.question !== undefined)
      .map(([cle]) => cle)
      .filter((cle) => !calculees.has(cle));

    for (const cle of chiffrees)
      expect(
        bornesDeSaisie(cle),
        `${cle} — aucune borne recopiée du contrat`,
      ).not.toEqual({});
  });
});
