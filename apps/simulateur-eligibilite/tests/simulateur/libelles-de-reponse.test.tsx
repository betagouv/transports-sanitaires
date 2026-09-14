// Ce qu'une réponse affiche, et ce qu'elle vaut : deux choses distinctes.
//
// Le modèle nomme trois possibilités d'A4.1 en minuscule — `'aller simple'`,
// `'aller-retour identique'`, `'aller-retour différent'` —, parce qu'elles se
// lisent dans une phrase. Elles arrivaient telles quelles en tête d'un bouton
// radio, seules réponses du questionnaire à commencer par une minuscule.
// L'interface les capitalise désormais à l'affichage ; la valeur, elle, ne
// bouge pas — c'est celle que le moteur compare et que le CERFA lit.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { emettrePassation } from "../../front/simulateur/passation";
import { Prescripteur } from "../../front/simulateur/prescripteur/Prescripteur";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import type { Reponse } from "./parcours";
import {
  allerAuGroupe,
  PARTIE_1_AMBULANCE,
  terminerParcours,
} from "./parcours";

beforeEach(() => sessionStorage.clear());

const Q1 = /^concernant son déplacement, le patient/i;
const PROFESSIONNEL = /prise en charge spécifique/i;
// La v9.7 a remplacé le sens du déplacement par l'organisation des transports,
// et sa première réponse — « trajets simples » — a pris le pluriel.
const ORGANISATION = /Comment les transports sont-ils organisés \?/;

// Une prestation prise en charge par l'Assurance Maladie : sans elle, le
// parcours administratif se clôt avant les questions de trajet, et A4.1 —
// la seule question à réponses en minuscule — ne serait jamais rencontrée.
// L'organisation ne se pose qu'à partir de deux transports prévus : la base
// neutre en prévoit un, et la question resterait fermée.
const PLUSIEURS_TRANSPORTS: Reponse[] = [[/combien de transports/i, "2"]];

describe("toute réponse affichée commence par une majuscule", () => {
  it("dans le parcours médical, du premier écran au résultat", async () => {
    const user = userEvent.setup({ delay: null });
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />,
    );
    const vues = await parcourir(user, [[Q1, PROFESSIONNEL]]);
    expect(vues.filter(enMinuscule)).toEqual([]);
  });

  // Le parcours administratif complet est le plus long du produit — une
  // quinzaine de pages, dont les douze saisies d'adresse tapées caractère par
  // caractère. Il dépasse les 5 s par défaut de vitest dès que la machine
  // partage ses cœurs entre fichiers de test.
  it("dans le parcours administratif, questions de trajet comprises", async () => {
    const user = userEvent.setup({ delay: null });
    emettrePassation(PARTIE_1_AMBULANCE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);
    const vues = await parcourir(user, PLUSIEURS_TRANSPORTS);
    expect(vues.filter(enMinuscule)).toEqual([]);
    // Le parcours a bien traversé A4.1 : sans cela, l'assertion ci-dessus
    // passerait sans avoir rien vérifié.
    expect(vues).toContain("Trajets simples");
  }, 40_000);
});

// Même parcours administratif que ci-dessus, arrêté à A4.1 : il tient au budget
// par défaut sur une machine au repos, plus depuis qu'A2.4 y ajoute une page.
it("A4.1 — la valeur envoyée au moteur reste celle du modèle", async () => {
  const user = userEvent.setup({ delay: null });
  emettrePassation(PARTIE_1_AMBULANCE);
  render(<Secretariat onNouvelleSimulation={() => {}} />);
  await allerAuGroupe(user, ORGANISATION, PLUSIEURS_TRANSPORTS);

  const sens = within(screen.getByRole("group", { name: ORGANISATION }));
  expect(valeurs(sens.getAllByRole("radio"))).toEqual([
    "trajets simples",
    "aller-retour identique",
    "aller-retour différent",
  ]);

  // La preuve que le moteur l'a bien reçue telle quelle : le type du lieu de
  // départ n'est posé que si `p2_organisation_transports` égale l'une des trois
  // valeurs du modèle. Une capitalisation en amont refermerait la branche.
  await user.click(sens.getByRole("radio", { name: "Trajets simples" }));
  expect(
    await screen.findByRole("group", { name: /type de lieu de départ/i }),
  ).toBeInTheDocument();
}, 40_000);

// ---- implémentation ----

// Une minuscule d'ouverture, quelle que soit la lettre — `\p{Ll}` couvre les
// accentuées, qu'une classe `[a-z]` laisserait passer.
const enMinuscule = (libelle: string) => /^\p{Ll}/u.test(libelle);

/** Mène le parcours à son terme et rend les libellés de réponse croisés en chemin. */
async function parcourir(
  user: ReturnType<typeof userEvent.setup>,
  reponses: Reponse[],
): Promise<string[]> {
  const vues: string[] = [];
  await terminerParcours(user, reponses, () =>
    vues.push(...reponsesAffichees()),
  );
  return vues;
}

// Les réponses proposées sur la page courante, sous leur libellé visible :
// boutons radio et cases à cocher.
function reponsesAffichees(): string[] {
  const proposees = [
    ...screen.queryAllByRole("radio"),
    ...screen.queryAllByRole("checkbox"),
  ];
  return proposees.map(libelleAffiche).filter((libelle) => libelle !== "");
}

function libelleAffiche(reponse: HTMLElement): string {
  const etiquette = (reponse as HTMLInputElement).labels?.[0];
  return etiquette?.textContent?.trim() ?? "";
}

// La valeur portée par chaque bouton radio — ce que l'interface renvoie au
// moteur quand on le coche.
const valeurs = (radios: HTMLElement[]) =>
  radios.map((radio) => (radio as HTMLInputElement).value);
