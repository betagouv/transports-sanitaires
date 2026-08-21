// Les bornes d'une saisie chiffrée, telles que l'utilisateur les rencontre.
//
// Le parcours n'en compte qu'une, A3.2 — le nombre de transports prévus sur deux
// mois —, et le modèle dit ce qu'elle accepte : un entier, à partir de 1. Le champ
// l'ignorait : `min: 0` était écrit en dur dans `ChampDeFormulaire.tsx`. L'écran
// acceptait donc un 0 que le modèle rejette ensuite, et le refus n'arrivait qu'une
// fois la page quittée, sans que rien l'ait annoncé.
//
// Ce fichier tient les deux bouts : ce que le champ affiche, et le fait que le
// modèle reste seul à le décider — une borne ajoutée au modèle sans lecture ici
// fait échouer la couverture plutôt que d'être ignorée en silence.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import yaml from "js-yaml";
import { beforeEach, describe, expect, it } from "vitest";
import { emettrePassation } from "../../front/simulateur/passation";
import { bornesDeSaisie } from "../../front/simulateur/questionnaire/bornes-de-saisie";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import type { Reponse } from "./parcours";
import { allerAuChampNombre, PARTIE_1_AMBULANCE } from "./parcours";

beforeEach(() => sessionStorage.clear());

const A3_2 = "p2_nombre_transports_prevus";

// Sans cette réponse, A2.3 se règle par défaut sur « Non » et le parcours conclut
// à une prestation non prise en charge : il n'atteint jamais la qualification de
// l'accord préalable, donc jamais A3.2.
const PRESTATION_PRISE_EN_CHARGE: Reponse = [
  /à l’origine du déplacement/i,
  /^oui$/i,
];

// Les clés de `saisie` que l'interface sait traiter. `valeur_par_defaut` y figure
// sans être lue : le moteur s'en charge, et le champ la porte déjà dans
// `defaultValue`. Toute autre clé est une consigne du modèle qui n'atteindrait
// pas l'écran.
const CLES_CONNUES = ["minimum", "pas", "entier", "valeur_par_defaut"];

const regles = yaml.load(
  readFileSync(
    join(
      resolve(dirname(fileURLToPath(import.meta.url)), "../.."),
      "regles/regles.publicodes",
    ),
    "utf-8",
  ),
) as Record<string, { type?: string; saisie?: Record<string, unknown> } | null>;

describe("A3.2 — le champ du nombre de transports", () => {
  it("porte les bornes que le modèle déclare, et non les siennes", async () => {
    emettrePassation(PARTIE_1_AMBULANCE);
    const user = userEvent.setup({ delay: null });
    render(<Secretariat onNouvelleSimulation={() => {}} />);
    await allerAuChampNombre(user, [PRESTATION_PRISE_EN_CHARGE]);

    const champ = screen.getByRole("spinbutton");
    // 1 et non 0 : le modèle refuse un transport prévu de moins, et l'écran doit
    // le refuser au même endroit. Le pas dit l'entier : pas de demi-transport.
    expect(champ).toHaveAttribute("min", "1");
    expect(champ).toHaveAttribute("step", "1");
  }, 30_000);

  it("lit ces bornes dans la règle, pas dans le code", () => {
    expect(bornesDeSaisie(A3_2)).toEqual({ min: 1, pas: 1 });
  });

  it("ne borne rien là où le modèle ne borne rien", () => {
    // Une règle sans `saisie` ne se voit pas prêter de bornes : l'interface
    // n'invente pas ce que le modèle n'a pas dit.
    expect(bornesDeSaisie("p2_trajet_depart")).toEqual({});
  });
});

describe("couverture — le modèle reste seul à borner", () => {
  it("n'a pas de question chiffrée sans bornes déclarées", () => {
    const chiffrees = Object.keys(regles).filter(
      (cle) => regles[cle]?.type === "nombre",
    );
    expect(chiffrees).toEqual([A3_2]);
    for (const cle of chiffrees)
      expect(
        regles[cle]?.saisie,
        `${cle} — aucune borne déclarée`,
      ).toBeDefined();
  });

  it("ne déclare aucune borne que l'interface ignorerait", () => {
    for (const [cle, regle] of Object.entries(regles)) {
      for (const propriete of Object.keys(regle?.saisie ?? {}))
        expect(CLES_CONNUES, `${cle} — saisie « ${propriete} »`).toContain(
          propriete,
        );
    }
  });
});
