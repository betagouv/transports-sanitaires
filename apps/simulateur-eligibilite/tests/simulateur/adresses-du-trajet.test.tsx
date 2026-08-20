// Les douze saisies d'adresse (D1-D12) telles que l'utilisateur les rencontre :
// des champs texte, tous sur une même page, dans l'ordre du formulaire papier.
//
// Elles ne le furent pas toujours. Chacune arrivait sur son propre écran, et
// quatre d'entre elles — complément et pays, aux deux bouts du trajet — n'étaient
// jamais posées : hors du graphe des cibles du secrétariat, le questionnaire les
// ignorait, tandis que le CERFA les lisait et les recevait vides. Deux gestes ont
// refermé cela, et ce fichier les tient : le secrétariat cible les douze sorties
// document (`Secretariat.tsx`), et la pagination réunit leurs pages en une seule
// (`questionnaire/pagination.ts`).

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { emettrePassation } from "../../front/simulateur/passation";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import type { Reponse } from "./parcours";
import { allerAuChampTexte, PARTIE_1_AMBULANCE } from "./parcours";

beforeEach(() => sessionStorage.clear());

// Le trajet le plus complet : ni le départ ni l'arrivée ne sont un domicile,
// donc les deux noms de lieu (D1, D7) sont demandés en plus des dix autres.
const ENTRE_STRUCTURES: Reponse[] = [
  [/à l’origine du déplacement/i, /^oui$/i],
  [/lieu de départ du trajet/i, /^structure de soins$/i],
  [/lieu d’arrivée du trajet/i, /une structure de soins différente/i],
];

const DOUZE_SAISIES = [
  "Quel est le nom de la structure ou du lieu de départ ?",
  "Quelle est l’adresse du lieu de départ ?",
  "Quel est le complément d’adresse du lieu de départ ?",
  "Quel est le code postal du lieu de départ ?",
  "Quelle est la commune du lieu de départ ?",
  "Quel est le pays du lieu de départ si celui-ci se situe hors de France ?",
  "Quel est le nom de la structure ou du lieu d’arrivée ?",
  "Quelle est l’adresse du lieu d’arrivée ?",
  "Quel est le complément d’adresse du lieu d’arrivée ?",
  "Quel est le code postal du lieu d’arrivée ?",
  "Quelle est la commune du lieu d’arrivée ?",
  "Quel est le pays du lieu d’arrivée si celui-ci se situe hors de France ?",
];

describe("saisies d'adresse — ce que l'utilisateur rencontre", () => {
  it("pose les douze saisies sur une seule page, dans l'ordre du formulaire", async () => {
    await ouvrirLesAdresses(ENTRE_STRUCTURES);

    // Les douze sont là, ensemble, sur l'écran où la traversée s'est arrêtée :
    // c'est ce que « pas sur plusieurs pages » veut dire, et l'ordre est celui
    // du formulaire papier — le départ en entier, puis l'arrivée.
    expect(intitulés()).toEqual(DOUZE_SAISIES);
  }, 30_000);

  it("retire les noms de lieu quand le trajet part et arrive à un domicile", async () => {
    // D1 et D7 ne sont applicables qu'ailleurs qu'au domicile : les dix autres
    // restent, et restent ensemble.
    await ouvrirLesAdresses([
      [/à l’origine du déplacement/i, /^oui$/i],
      [/lieu de départ du trajet/i, /^domicile$/i],
      [/lieu d’arrivée du trajet/i, /un domicile différent/i],
    ]);

    expect(intitulés()).toEqual(
      DOUZE_SAISIES.filter((libellé) => !libellé.includes("nom de la")),
    );
  }, 30_000);

  it("accepte la saisie et ne libère la page qu'une fois les obligatoires remplies", async () => {
    const user = await ouvrirLesAdresses(ENTRE_STRUCTURES);
    const suivant = () => screen.getByRole("button", { name: /^suivant$/i });
    expect(suivant()).toBeDisabled();

    // Les facultatives ne débloquent rien à elles seules…
    await user.type(champ(/complément d’adresse du lieu de départ/i), "B");
    expect(suivant()).toBeDisabled();

    // …les huit obligatoires, si.
    for (const [libellé, valeur] of ADRESSE_COMPLÈTE)
      await user.type(champ(libellé), valeur);
    expect(champ(/^Quelle est l’adresse du lieu de départ/i)).toHaveValue(
      "1 rue A",
    );
    expect(suivant()).toBeEnabled();
  }, 30_000);
});

// ---- implémentation ----

const ADRESSE_COMPLÈTE: Array<[RegExp, string]> = [
  [/nom de la structure ou du lieu de départ/i, "CHBA"],
  [/^Quelle est l’adresse du lieu de départ/i, "1 rue A"],
  [/code postal du lieu de départ/i, "56000"],
  [/commune du lieu de départ/i, "Vannes"],
  [/nom de la structure ou du lieu d’arrivée/i, "CHBS"],
  [/^Quelle est l’adresse du lieu d’arrivée/i, "2 rue B"],
  [/code postal du lieu d’arrivée/i, "56100"],
  [/commune du lieu d’arrivée/i, "Lorient"],
];

/** Ouvre la Partie 2 et la traverse jusqu'à la page des adresses. */
async function ouvrirLesAdresses(reponses: Reponse[]) {
  emettrePassation(PARTIE_1_AMBULANCE);
  const user = userEvent.setup({ delay: null });
  render(<Secretariat onNouvelleSimulation={() => {}} />);
  await allerAuChampTexte(user, reponses);
  return user;
}

/** Les intitulés des champs texte de la page courante, dans l'ordre du DOM. */
function intitulés(): string[] {
  return screen
    .getAllByRole("textbox")
    .map((champ) => (champ as HTMLInputElement).labels?.[0]?.textContent ?? "");
}

const champ = (libellé: RegExp) =>
  screen.getByRole("textbox", { name: libellé });
