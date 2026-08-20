// Ce qui n'a rien derrière soi : la première page de la Partie 2.
//
// Le prescripteur arrête le mode de transport ; le secrétariat qualifie le
// document. Entrer dans la Partie 2 ferme la première : « Précédent » n'y
// ramène pas au résultat médical, et aucune remontée du questionnaire
// administratif ne repose une question médicale.
//
// Le verrou n'est écrit nulle part comme tel — il tient à la façon dont le
// secrétariat démarre son parcours : les réponses de Partie 1 lui arrivent en
// `situationInitiale`, donc comme une situation déjà acquise, jamais comme des
// pages traversées. La pagination de `@publicodes/forms` ne connaît alors que
// des pages administratives, et la page 1 n'a pas de page précédente. Les
// passer en `etatInitial` suffirait à rouvrir la Partie 1 par le bas : c'est
// cette régression que ce fichier attrape.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { emettrePassation } from "../../front/simulateur/passation";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { PARTIE_1_AMBULANCE, repondrePage, terminerParcours } from "./parcours";

beforeEach(() => sessionStorage.clear());

// Un contexte d'hospitalisation : la Partie 2 a de quoi poser plusieurs pages,
// et le parcours aboutit à un vrai document.
const HOSPITALISATION = /entrée ou sortie d’hospitalisation/i;

describe("la première page de la Partie 2 ne rend pas la main au résultat médical", () => {
  it("à l’ouverture du questionnaire administratif", () => {
    ouvrirLaPartie2();

    expect(etapeAffichee()).toMatch(/^étape 1 sur/i);
    expect(boutonPrecedent()).toBeNull();
  });

  it("et le bouton n’est pas absent partout : il paraît dès la page suivante, et repart en revenant", async () => {
    const user = userEvent.setup({ delay: null });
    ouvrirLaPartie2();

    await repondrePage(user, []);
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));
    const precedent = boutonPrecedent();
    expect(precedent).toBeInTheDocument();

    if (precedent) await user.click(precedent);
    expect(etapeAffichee()).toMatch(/^étape 1 sur/i);
    expect(boutonPrecedent()).toBeNull();
  });

  it("même en remontant tout le questionnaire depuis le document", async () => {
    const user = userEvent.setup({ delay: null });
    ouvrirLaPartie2();
    await terminerParcours(user, [[/dans quel contexte/i, HOSPITALISATION]]);

    // Le « Précédent » du document rouvre la Partie 2 sur sa dernière page ;
    // de là, on remonte tant qu'un « Précédent » se présente.
    await user.click(screen.getByRole("button", { name: /^précédent$/i }));
    const { etapes, questionsMedicales } = await remonterLeQuestionnaire(user);

    expect(etapes.length).toBeGreaterThan(0);
    expect(etapes.at(-1)).toMatch(/^étape 1 sur/i);
    // Le fond du questionnaire administratif, c'est sa page 1 — pas la Partie 1.
    expect(questionsMedicales).toEqual([]);
  }, 20_000);
});

// ---- implémentation ----

/** Le secrétariat, amorcé par une passation — le cas courant. */
function ouvrirLaPartie2() {
  emettrePassation(PARTIE_1_AMBULANCE);
  render(<Secretariat onNouvelleSimulation={() => {}} />);
}

/**
 * Remonte le questionnaire page par page tant qu'un « Précédent » se présente :
 * les étapes traversées, de la plus profonde à la première, et les questions
 * médicales croisées en chemin — il ne doit y en avoir aucune.
 */
async function remonterLeQuestionnaire(
  user: ReturnType<typeof userEvent.setup>,
): Promise<{ etapes: string[]; questionsMedicales: string[] }> {
  const etapes: string[] = [];
  const questionsMedicales: string[] = [];
  for (let i = 0; i < 40; i++) {
    etapes.push(etapeAffichee() ?? "(plus d’étapeur)");
    questionsMedicales.push(...questionsMedicalesPosees());
    const precedent = boutonPrecedent();
    if (!precedent) return { etapes, questionsMedicales };
    await user.click(precedent);
  }
  throw new Error("remontée sans fin : le « Précédent » ne disparaît jamais");
}

// Les deux questions qui ouvrent la Partie 1. Les voir reparaître au cours d'une
// remontée signifierait que le secrétariat a hérité des pages du prescripteur.
function questionsMedicalesPosees(): string[] {
  return [/^le patient/i, /quelles aides ou conditions particulières/i]
    .map((motif) => screen.queryByRole("group", { name: motif })?.textContent)
    .filter((pose) => pose !== undefined);
}

const boutonPrecedent = () =>
  screen.queryByRole("button", { name: /^précédent$/i });

const etapeAffichee = () =>
  screen.queryByRole("heading", { name: /^étape \d+ sur \d+$/i })?.textContent;
