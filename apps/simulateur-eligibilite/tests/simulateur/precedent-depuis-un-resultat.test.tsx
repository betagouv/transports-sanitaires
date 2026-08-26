import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { emettrePassation } from "../../front/simulateur/passation";
import { Prescripteur } from "../../front/simulateur/prescripteur/Prescripteur";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { PARTIE_1_AMBULANCE, terminerParcours } from "./parcours";

// Le retour depuis une page de résultat : ce qui se trouve en deçà d'un verdict,
// et comment on y revient.
//
// Deux règles, une par outil. Le résultat médical rouvre le questionnaire de
// Partie 1 tant que le prescripteur n'a pas choisi la suite. Le document, lui,
// rouvre la Partie 2 sur sa dernière page — ou, quand elle n'avait rien à poser,
// ramène au résultat médical, qui est alors l'écran d'avant.
//
// Et ceci quelle que soit la façon dont on est arrivé là : une seed n'est qu'un
// pré-remplissage des réponses, le parcours qu'elles auraient produit est rejoué
// derrière elle (`simulateur/questionnaire/rejeu.ts`).

beforeEach(() => sessionStorage.clear());

const SMUR = {
  ...BASE_NEUTRE,
  // Depuis la v9.5.0, l'urgence vitale est la quatrième réponse de Q1 : elle
  // tranche sans passer par M0, qu'elle rend inapplicable.
  p1_autonomie:
    "'Est en situation d’urgence vitale nécessitant un transport médicalisé par une équipe SMUR (Structure Mobile d’Urgence et de Réanimation).'",
};
// Un cas qui, lui, traverse la Partie 2 : le transport est prescrit, donc le
// questionnaire administratif a des questions à poser.
const PMT_AMBULANCE = {
  ...BASE_NEUTRE,
  p1_autonomie:
    "'Nécessite une prise en charge spécifique pendant le trajet ou l’aide d’un professionnel pour se déplacer ou accomplir les formalités liées au transport.'",
  p1_critere_position_allongee_demi_assise: "oui",
  p2_contexte_hospitalisation: "oui",
  p2_contexte_aucun: "non",
};

const voirResultat = () =>
  screen.getByRole("button", { name: /voir le résultat médical/i });

describe("retour depuis une page de résultat", () => {
  it("« Précédent » depuis le document rouvre la Partie 2, réponses intactes", async () => {
    const user = userEvent.setup({ delay: null });
    emettrePassation(PARTIE_1_AMBULANCE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);
    await terminerParcours(user, [
      [/dans quel contexte/i, /entrée ou sortie d’une hospitalisation/i],
    ]);

    await user.click(screen.getByRole("button", { name: /^précédent$/i }));

    // Retour sur la dernière page du questionnaire, telle qu'elle a été quittée :
    // l'étapeur est de nouveau là, et la réponse déjà donnée est toujours cochée.
    expect(
      screen.getByRole("heading", { name: /^étape \d+ sur \d+$/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio", { checked: true })).not.toHaveLength(0);

    // Et l'on ressort du questionnaire sur le même document.
    await user.click(
      screen.getByRole("button", { name: /^voir le document/i }),
    );
    expect(
      screen.getByRole("heading", { name: /document à imprimer/i }),
    ).toBeInTheDocument();
  }, 20_000);

  it("cas tranché dès la Partie 1 : « Précédent » ramène au résultat médical", async () => {
    // Le questionnaire administratif n'a rien eu à poser : l'écran d'avant n'est
    // pas une de ses pages, c'est le résultat médical. Changer d'outil
    // n'appartient pas au secrétariat, d'où la remontée à l'appelant.
    const user = userEvent.setup({ delay: null });
    const retours: unknown[] = [];
    emettrePassation(SMUR);
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        onRetourAuResultatMedical={(situationP1) => retours.push(situationP1)}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^précédent$/i }));
    expect(retours).toEqual([SMUR]);
  });

  it("seed d'un cas tranché dès la Partie 1 : même retour", async () => {
    // À réponses égales, la seed se comporte comme la saisie — c'est tout le
    // propos : la Partie 1 est rejouée, et c'est sa situation qui remonte.
    const user = userEvent.setup({ delay: null });
    const retours: unknown[] = [];
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={SMUR}
        onRetourAuResultatMedical={(situationP1) => retours.push(situationP1)}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^précédent$/i }));
    expect(retours).toHaveLength(1);
  });

  it("seed : le parcours est rejoué, « Précédent » rouvre la Partie 2 renseignée", async () => {
    // Une seed n'a traversé aucun questionnaire — ses réponses sont posées d'un
    // bloc. Le parcours qu'elles auraient produit est rejoué, sans quoi le
    // document n'aurait rien derrière lui là où une saisie, elle, en a.
    const user = userEvent.setup({ delay: null });
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={PMT_AMBULANCE}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^précédent$/i }));

    expect(
      screen.getByRole("heading", { name: /^étape \d+ sur \d+$/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("radio", { checked: true })).not.toHaveLength(0);

    await user.click(
      screen.getByRole("button", { name: /^voir le document/i }),
    );
    expect(
      screen.getByRole("heading", { name: /document à imprimer/i }),
    ).toBeInTheDocument();
  }, 20_000);

  it("seed : le parcours est rejoué, « Précédent » rouvre le questionnaire", async () => {
    // Une seed ouvre le résultat sans passer par les questions ; ses réponses
    // n'en sont pas moins des réponses, et le parcours qu'elles auraient produit
    // est rejoué. Sans cela, le résultat d'une seed n'aurait rien derrière lui.
    const user = userEvent.setup({ delay: null });
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
        situationInitiale={BASE_NEUTRE}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^précédent$/i }));

    // Dernière page du parcours médical, telle que la seed l'a renseignée.
    expect(
      screen.getByRole("heading", { name: /^étape \d+ sur \d+$/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox", { checked: true })).not.toHaveLength(
      0,
    );

    await user.click(voirResultat());
    expect(
      screen.getByText(/la décision ci-dessous est établie/i),
    ).toBeInTheDocument();
  }, 20_000);

  it("modifier une réponse en arrière ne raccourcit pas le parcours", async () => {
    // Revenir en arrière ne retire aucune réponse : les pages déjà traversées
    // restent des pages du parcours, et une saisie sur l'une d'elles ne doit pas
    // faire disparaître les suivantes — elles ne « manquent » plus au moteur,
    // c'est tout.
    const user = userEvent.setup({ delay: null });
    emettrePassation(PARTIE_1_AMBULANCE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);
    await terminerParcours(user, [
      [/dans quel contexte/i, /entrée ou sortie d’une hospitalisation/i],
    ]);

    await user.click(screen.getByRole("button", { name: /^précédent$/i }));
    const accident = /accident causé par un tiers/i;
    expect(screen.getByRole("group", { name: accident })).toBeInTheDocument();

    // Une page plus tôt : les adresses. On y change une réponse déjà donnée.
    await user.click(screen.getByRole("button", { name: /^précédent$/i }));
    const codePostal = screen.getByRole("textbox", { name: /code postal/i });
    await user.clear(codePostal);
    await user.type(codePostal, "75004");

    // La question suivante est toujours au programme : c'est « Suivant » qui
    // s'offre, pas le bouton de fin, et elle se repose telle qu'on l'a laissée.
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));
    expect(screen.getByRole("group", { name: accident })).toBeInTheDocument();
  }, 20_000);
});
