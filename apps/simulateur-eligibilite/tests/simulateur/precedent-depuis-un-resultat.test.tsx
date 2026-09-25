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

// Une situation dont le questionnaire administratif n'a rien à poser : la base
// neutre répond à tout. La v9.5.1 y arrivait par l'urgence vitale, quatrième
// réponse de Q1 qui tranchait la Partie 1 ; la v9.7 a retiré cette réponse, et
// aucune n'écourte plus le parcours — c'est donc une situation complète, et non
// un cas tranché, qui laisse la Partie 2 sans question.
const RIEN_A_POSER = { ...BASE_NEUTRE };
// Un cas qui, lui, traverse la Partie 2 : le transport est prescrit, donc le
// questionnaire administratif a des questions à poser.
const PMT_AMBULANCE = {
  ...BASE_NEUTRE,
  p1_autonomie:
    "'Nécessite une prise en charge spécifique pendant le trajet, une aide d’un professionnel pour se déplacer ou, en l’absence d’un proche accompagnant, pour transmettre les informations nécessaires à l’équipe soignante.'",
  p1_critere_position_allongee_demi_assise: "oui",
  p1_critere_aucun: "non",
  p2_raison_principale: "'Entrée en hospitalisation'",
};

const voirResultat = () =>
  screen.getByRole("button", { name: /voir le résultat médical/i });

/** Les champs de la page qui portent déjà une réponse, quelle que soit leur forme. */
const champsRenseignes = () =>
  [...screen.queryAllByRole("radio"), ...screen.queryAllByRole("checkbox")]
    .filter((champ) => (champ as HTMLInputElement).checked)
    .concat(
      screen
        .queryAllByRole("textbox")
        .filter((champ) => (champ as HTMLInputElement).value !== ""),
    );

describe("retour depuis une page de résultat", () => {
  // La v9.5.1 avait un second cas : le questionnaire administratif sans aucune
  // question, dont « Précédent » remontait au résultat médical. Il tenait aux
  // sorties directes de la Partie 1, que la v9.7 a retirées — et, même sur une
  // situation complète, le parcours garde ses saisies facultatives d'adresse à
  // offrir. Le chemin n'est plus atteignable ; `onRetourAuResultatMedical` reste
  // câblé pour le jour où il le redeviendra.
  it("aucune situation ne laisse le questionnaire administratif sans question", async () => {
    const retours: unknown[] = [];
    emettrePassation(RIEN_A_POSER);
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        onRetourAuResultatMedical={(situationP1) => retours.push(situationP1)}
      />,
    );

    // Le questionnaire s'ouvre sur une question, et non sur un résultat : il n'y
    // a donc rien derrière lui, et l'appelant n'est pas rappelé.
    expect(
      screen.getByRole("heading", { name: /^étape \d+ sur \d+$/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^précédent$/i })).toBeNull();
    expect(retours).toEqual([]);
  });

  it("« Précédent » depuis le document rouvre la Partie 2, réponses intactes", async () => {
    const user = userEvent.setup({ delay: null });
    emettrePassation(PARTIE_1_AMBULANCE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);
    await terminerParcours(user, [
      [/raison principale du déplacement/i, /entrée en hospitalisation/i],
    ]);

    await user.click(screen.getByRole("button", { name: /^précédent$/i }));

    // Retour sur la dernière page du questionnaire, telle qu'elle a été quittée :
    // l'étapeur est de nouveau là, et la réponse déjà donnée est toujours cochée.
    expect(
      screen.getByRole("heading", { name: /^étape \d+ sur \d+$/i }),
    ).toBeInTheDocument();
    expect(champsRenseignes()).not.toHaveLength(0);

    // Et l'on ressort du questionnaire sur le même document.
    await user.click(
      screen.getByRole("button", { name: /^voir le document/i }),
    );
    expect(
      screen.getByRole("heading", { name: /document à imprimer/i }),
    ).toBeInTheDocument();
  }, 40_000);

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
    expect(champsRenseignes()).not.toHaveLength(0);

    await user.click(
      screen.getByRole("button", { name: /^voir le document/i }),
    );
    expect(
      screen.getByRole("heading", { name: /document à imprimer/i }),
    ).toBeInTheDocument();
  }, 40_000);

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
    expect(screen.getAllByRole("radio", { checked: true })).not.toHaveLength(0);

    await user.click(voirResultat());
    expect(
      screen.getByText(/la décision ci-dessous est établie/i),
    ).toBeInTheDocument();
  }, 40_000);

  it("modifier une réponse en arrière ne raccourcit pas le parcours", async () => {
    // Revenir en arrière ne retire aucune réponse : les pages déjà traversées
    // restent des pages du parcours, et une saisie sur l'une d'elles ne doit pas
    // faire disparaître les suivantes — elles ne « manquent » plus au moteur,
    // c'est tout.
    const user = userEvent.setup({ delay: null });
    emettrePassation(PARTIE_1_AMBULANCE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);
    await terminerParcours(user, [
      [/raison principale du déplacement/i, /entrée en hospitalisation/i],
    ]);

    // On remonte jusqu'à la page de l'adresse d'arrivée pour y changer une
    // réponse déjà donnée. Sa position varie avec les réponses — la v9.7 ajoute
    // des étapes en aval, dont la distance et les données documentaires.
    for (let pas = 0; pas < 6; pas++) {
      if (screen.queryByRole("textbox", { name: /code postal/i })) break;
      await user.click(screen.getByRole("button", { name: /^précédent$/i }));
    }
    // TS973-11 : « Entrée en hospitalisation » déduit le type du lieu
    // d'arrivée plutôt que de le demander. Le fait apparaît ici, à la place
    // de la question, avec son origine.
    expect(
      screen.getByText(/lieu d’arrivée : structure de soins \(déduit/i),
    ).toBeInTheDocument();

    const codePostal = screen.getByRole("textbox", { name: /code postal/i });
    await user.clear(codePostal);
    await user.type(codePostal, "75004");

    // Une page plus tôt : l'adresse de départ, qui doit rester au programme.
    // Elle ne « manque » plus au moteur, ce n'est pas une raison pour la
    // retirer du parcours. Le type du lieu d'arrivée n'est plus une page à
    // part depuis qu'il est déduit (ci-dessus) : reculer d'un cran depuis
    // l'adresse d'arrivée ramène directement à celle de départ.
    await user.click(screen.getByRole("button", { name: /^précédent$/i }));
    expect(
      screen.getByRole("textbox", { name: /code postal/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/lieu d’arrivée : structure de soins \(déduit/i),
    ).not.toBeInTheDocument();

    // Et l'on ressort par le même chemin : « Suivant », pas le bouton de fin.
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));
    expect(screen.getByRole("textbox", { name: /code postal/i })).toHaveValue(
      "75004",
    );
  }, 40_000);
});
