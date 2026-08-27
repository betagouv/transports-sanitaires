// Corriger Q1 après coup : ce que devient une réponse à Q1.1 que ce retour rend
// sans objet.
//
// Q1.1 n'est posée qu'au patient qui a besoin d'un professionnel. Le prescripteur
// qui s'aperçoit de son erreur revient sur Q1, répond « seul » ou « proche
// accompagnant » — et les critères qu'il avait cochés restent dans la situation :
// revenir en arrière ne retire aucune réponse (cf. `questionnaire/passation.ts`),
// pour ne pas perdre les pages en aval de celui qui se ravise deux fois.
//
// Rien ne doit en transparaître. C'est le modèle qui neutralise : les onze règles
// `p1_critere_*` sont `applicable si: p1_autonomie_professionnel_requis`, donc
// inertes hors de cette branche. Un critère d'ambulance oublié ferait pourtant
// basculer `p1_mode_transport_medical` dès sa première variation — d'où ce
// fichier, qui compare le parcours corrigé à une simulation neuve aux mêmes
// réponses finales (v9.4.0, TICKET-DEV-009, § « Retour arrière »).

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { moteur } from "../../front/simulateur/moteur";
import { Prescripteur } from "../../front/simulateur/prescripteur/Prescripteur";
import { terminerParcours } from "./parcours";

beforeEach(() => sessionStorage.clear());

const Q1 = /^concernant son déplacement, le patient/i;
const PROFESSIONNEL = /prise en charge spécifique/i;
const PROCHE = /accompagnement d’un proche/i;
const OXYGENE = /administration d’oxygène/i;

describe("Q1 corrigée après Q1.1", () => {
  it("se déroule et conclut comme une simulation neuve aux mêmes réponses finales", async () => {
    const corrige = await parcoursCorrige();
    cleanup();
    sessionStorage.clear();
    const neuf = await parcoursNeuf();

    // Les écrans qui restent à traverser, un à un : la page de Q1.1 doit avoir
    // quitté le parcours, et non y demeurer vide de la question qu'elle posait.
    expect(corrige.etapes).toEqual(neuf.etapes);
    expect(corrige.resultat).toBe(neuf.resultat);
    // Et ce résultat commun est bien celui du patient accompagné d'un proche :
    // sans quoi les deux parcours pourraient être identiquement faux.
    expect(corrige.resultat).toContain(
      "véhicule personnel ou transport en commun",
    );
    expect(corrige.resultat).not.toMatch(OXYGENE);
  }, 30_000);

  it("laisse le moteur inerte devant un critère devenu inapplicable", () => {
    // Le pendant du parcours ci-dessus, au niveau de la situation : c'est bien le
    // modèle qui neutralise, et non un nettoyage de l'application.
    const proche =
      "'Nécessite l’accompagnement d’un proche pour se déplacer ou transmettre les informations nécessaires à l’équipe soignante, sans intervention d’un professionnel pendant le transport.'";
    const sorties = (situation: Record<string, string>) => {
      const e = moteur.setSituation(situation);
      return {
        critereAmbulance: e.evaluate("p1_critere_ambulance").nodeValue,
        mode: e.evaluate("p1_mode_transport_medical").nodeValue,
        transport: e.evaluate("cible_transport_sanitaire_prescrit").nodeValue,
        resultat: e.evaluate("cible_resultat_medical").nodeValue,
      };
    };

    expect(
      sorties({ p1_autonomie: proche, p1_critere_oxygene: "oui" }),
    ).toEqual(sorties({ p1_autonomie: proche }));
  });
});

// ---- implémentation ----

type Deroule = { etapes: string[]; resultat: string };

// Le prescripteur se trompe, coche un critère d'ambulance, puis revient sur Q1.
async function parcoursCorrige(): Promise<Deroule> {
  const { user, container } = afficher();
  await user.click(await radio(Q1, PROFESSIONNEL));
  await user.click(await caseACocher(OXYGENE));
  await user.click(screen.getByRole("button", { name: /^suivant$/i }));

  // Deux pas en arrière : la page qui suit Q1.1, puis Q1.1 elle-même.
  await user.click(screen.getByRole("button", { name: /^précédent$/i }));
  await user.click(screen.getByRole("button", { name: /^précédent$/i }));
  await user.click(await radio(Q1, PROCHE));

  return await allerJusquAuBout(user, container);
}

// La même simulation, menée d'emblée sur la bonne réponse.
async function parcoursNeuf(): Promise<Deroule> {
  const { user, container } = afficher();
  await user.click(await radio(Q1, PROCHE));
  return await allerJusquAuBout(user, container);
}

// Ce qu'il reste à traverser une fois Q1 répondue, écran par écran, puis le
// résultat. Une même page vue deux fois de suite n'est notée qu'une : celles qui
// avancent d'elles-mêmes sont visitées avant et après leur avancement.
async function allerJusquAuBout(
  user: ReturnType<typeof userEvent.setup>,
  container: HTMLElement,
): Promise<Deroule> {
  const etapes: string[] = [];
  await terminerParcours(user, [], () => {
    const ecran = pageAffichee(container);
    if (ecran !== etapes.at(-1)) etapes.push(ecran);
  });
  return { etapes, resultat: pageAffichee(container) };
}

function afficher() {
  const { container } = render(
    <Prescripteur
      onPasserAuSecretariat={() => {}}
      onNouvelleSimulation={() => {}}
    />,
  );
  return { user: userEvent.setup({ delay: null }), container };
}

const radio = async (groupe: RegExp, nom: RegExp) =>
  within(await screen.findByRole("group", { name: groupe })).getByRole(
    "radio",
    {
      name: nom,
    },
  );

const caseACocher = async (nom: RegExp) =>
  await screen.findByRole("checkbox", { name: nom });

/**
 * Ce que la page affiche, le compteur d'étapes ôté.
 *
 * Le parcours corrigé n'écarte la page devenue sans objet qu'en **quittant**
 * celle où la correction a eu lieu — le temps d'effacer une réponse, le modèle
 * ne conclut plus rien en aval, et juger la suite à chaque saisie supprimerait
 * des questions encore utiles (cf. `questionnaire/suite-du-parcours.ts`).
 * « Étape 1 sur 3 » se lit donc un instant là où la simulation neuve annonce
 * « sur 2 ». C'est le seul écart, et il se referme au pas suivant.
 */
function pageAffichee(container: HTMLElement): string {
  return (container.textContent ?? "")
    .replace(/Étape \d+ sur \d+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
