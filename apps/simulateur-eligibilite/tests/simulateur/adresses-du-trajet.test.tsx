// Les douze saisies d'adresse (D1-D12) telles que l'utilisateur les rencontre :
// des champs texte, groupés par lieu — le départ sur un écran, l'arrivée sur le
// suivant —, chacun dans l'ordre du formulaire papier.
//
// Elles ne le furent pas toujours. Chacune arrivait sur son propre écran, et
// quatre d'entre elles — complément et pays, aux deux bouts du trajet — n'étaient
// jamais posées : hors du graphe des cibles du secrétariat, le questionnaire les
// ignorait, tandis que le CERFA les lisait et les recevait vides. Deux gestes ont
// refermé cela, et ce fichier les tient : le secrétariat cible les douze sorties
// document (`Secretariat.tsx`), et la pagination réunit leurs pages par lieu
// (`questionnaire/pagination.ts`).

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { seedParId } from "../../front/outils-produit/seeds/catalogue";
import { situationDe } from "../../front/outils-produit/seeds/seed";
import { emettrePassation } from "../../front/simulateur/passation";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import type { Reponse } from "./parcours";
import {
  allerAuChampTexte,
  PARTIE_1_AMBULANCE,
  terminerParcours,
} from "./parcours";

beforeEach(() => sessionStorage.clear());

// Le trajet le plus complet : ni le départ ni l'arrivée ne sont un domicile,
// donc les deux noms de lieu (D1, D7) sont demandés en plus des dix autres.
const ENTRE_STRUCTURES: Reponse[] = [
  [/à l’origine du déplacement/i, /^oui$/i],
  [/lieu de départ du trajet/i, /^structure de soins$/i],
  [/lieu d’arrivée du trajet/i, /une structure de soins différente/i],
];

const SAISIES_DEPART = [
  "Quel est le nom de la structure ou du lieu de départ ?",
  "Quelle est l’adresse du lieu de départ ?",
  "Quel est le complément d’adresse du lieu de départ ?",
  "Quel est le code postal du lieu de départ ?",
  "Quelle est la commune du lieu de départ ?",
  "Quel est le pays du lieu de départ si celui-ci se situe hors de France ?",
];

const SAISIES_ARRIVEE = [
  "Quel est le nom de la structure ou du lieu d’arrivée ?",
  "Quelle est l’adresse du lieu d’arrivée ?",
  "Quel est le complément d’adresse du lieu d’arrivée ?",
  "Quel est le code postal du lieu d’arrivée ?",
  "Quelle est la commune du lieu d’arrivée ?",
  "Quel est le pays du lieu d’arrivée si celui-ci se situe hors de France ?",
];

describe("saisies d'adresse — ce que l'utilisateur rencontre", () => {
  it("pose d'abord le lieu de départ, ses six saisies sur un seul écran", async () => {
    await ouvrirLesAdresses(ENTRE_STRUCTURES);

    // Les six sont là, ensemble, dans l'ordre du formulaire papier — et rien de
    // l'arrivée ne s'y mêle : c'est l'autre page.
    expect(intitulés()).toEqual(SAISIES_DEPART);
  }, 30_000);

  it("ne passe au lieu d'arrivée qu'une fois le départ renseigné", async () => {
    const user = await ouvrirLesAdresses(ENTRE_STRUCTURES);
    const suivant = () => screen.getByRole("button", { name: /^suivant$/i });
    expect(suivant()).toBeDisabled();

    // Le complément est offert, pas exigé : le remplir ne libère rien, et ne pas
    // le remplir ne retient rien non plus.
    await user.type(champ(/complément d’adresse du lieu de départ/i), "B");
    expect(suivant()).toBeDisabled();

    for (const [libellé, valeur] of DEPART_COMPLET)
      await user.type(champ(libellé), valeur);
    expect(champ(/^Quelle est l’adresse du lieu de départ/i)).toHaveValue(
      "1 rue A",
    );
    expect(suivant()).toBeEnabled();

    await user.click(suivant());
    expect(intitulés()).toEqual(SAISIES_ARRIVEE);
  }, 30_000);

  it("suit la séquence du contrat : A4.2, A4.3, départ, arrivée, A4.6", async () => {
    // ADDRESS-SEQUENCE-001 et 002 du livrable v9.4.1 : l'ordre du trajet, vu de
    // l'écran. C'est ce test qui le tient depuis que la pagination a cessé de
    // renvoyer les deux pages d'adresse en queue de parcours — le désordre
    // qu'elle prévenait est corrigé dans le modèle (cf.
    // `adresses-obligatoires.test.ts`, ADDRESS-005).
    emettrePassation(PARTIE_1_AMBULANCE);
    const user = userEvent.setup({ delay: null });
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    const rencontrées: Array<{ titre: string; saisies: number }> = [];
    await terminerParcours(user, ENTRE_STRUCTURES, () =>
      rencontrées.push({
        titre: titreDeLaPage(),
        saisies: screen.queryAllByRole("textbox").length,
      }),
    );

    const début = rencontrées.findIndex((page) => SEQUENCE[0].test(page.titre));
    expect(début, "A4.2 jamais posée").toBeGreaterThanOrEqual(0);
    const suite = rencontrées.slice(début, début + SEQUENCE.length);
    // A4.2 et A4.3 ne portent aucune saisie — aucune adresse ne part devant —,
    // et chaque lieu arrive d'un bloc, ses six saisies ensemble.
    expect(suite.map((page) => page.saisies)).toEqual([0, 0, 6, 6, 0]);
    for (const [rang, attendu] of SEQUENCE.entries())
      expect(suite[rang]?.titre ?? "", `page ${rang + 1}`).toMatch(attendu);
  }, 30_000);

  it("s'atteint d'un clic depuis la galerie de seeds", () => {
    // `secretariat-saisie-adresses` existe pour cet écran : elle répond à tout
    // sauf aux adresses, et la galerie la passe au secrétariat comme le ferait un
    // prescripteur. Aucune traversée, donc — la page s'ouvre directement.
    emettrePassation(situationDe(seedParId("secretariat-saisie-adresses")));
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    expect(intitulés()).toEqual(SAISIES_DEPART);
    for (const champ of screen.getAllByRole("textbox"))
      expect(champ).toHaveValue("");
  });

  it("retire le nom du lieu quand le trajet part d'un domicile", async () => {
    // D1 n'est applicable qu'ailleurs qu'au domicile ; les cinq autres restent,
    // et restent ensemble.
    await ouvrirLesAdresses([
      [/à l’origine du déplacement/i, /^oui$/i],
      [/lieu de départ du trajet/i, /^domicile$/i],
      [/lieu d’arrivée du trajet/i, /un domicile différent/i],
    ]);

    expect(intitulés()).toEqual(
      SAISIES_DEPART.filter((libellé) => !libellé.includes("nom de la")),
    );
  }, 30_000);
});

// ---- implémentation ----

const DEPART_COMPLET: Array<[RegExp, string]> = [
  [/nom de la structure ou du lieu de départ/i, "CHBA"],
  [/^Quelle est l’adresse du lieu de départ/i, "1 rue A"],
  [/code postal du lieu de départ/i, "56000"],
  [/commune du lieu de départ/i, "Vannes"],
];

/** Ouvre la Partie 2 et la traverse jusqu'à la page du lieu de départ. */
async function ouvrirLesAdresses(reponses: Reponse[]) {
  emettrePassation(PARTIE_1_AMBULANCE);
  const user = userEvent.setup({ delay: null });
  render(<Secretariat onNouvelleSimulation={() => {}} />);
  await allerAuChampTexte(user, reponses);
  return user;
}

/**
 * L'ordre que le contrat impose au trajet : le lieu de départ, le lieu
 * d'arrivée, les six saisies du départ, celles de l'arrivée, puis A4.6. Chaque
 * motif nomme la première question de sa page.
 */
const SEQUENCE = [
  /lieu de départ du trajet concerné/,
  /lieu d’arrivée du trajet concerné/,
  /nom de la structure ou du lieu de départ/,
  /nom de la structure ou du lieu d’arrivée/,
  /accident causé par un tiers/,
] as const;

/**
 * De quoi nommer la page courante : sa première saisie, ou son premier groupe de
 * questions. Le `<details>` du panneau de débogage porte lui aussi le rôle
 * `group` — il est écarté, sans quoi il nommerait toute page sans question.
 */
function titreDeLaPage(): string {
  const saisie = screen.queryAllByRole("textbox")[0] as
    | HTMLInputElement
    | undefined;
  if (saisie) return saisie.labels?.[0]?.textContent ?? "";
  const groupe = screen
    .queryAllByRole("group")
    .find((element) => element.closest("details") === null);
  return groupe?.textContent ?? "";
}

/** Les intitulés des champs texte de la page courante, dans l'ordre du DOM. */
function intitulés(): string[] {
  return screen
    .getAllByRole("textbox")
    .map((champ) => (champ as HTMLInputElement).labels?.[0]?.textContent ?? "");
}

const champ = (libellé: RegExp) =>
  screen.getByRole("textbox", { name: libellé });
