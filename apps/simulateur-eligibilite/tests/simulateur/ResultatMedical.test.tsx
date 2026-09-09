import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { Prescripteur } from "../../front/simulateur/prescripteur/Prescripteur";
import { terminerParcours } from "./parcours";

beforeEach(() => sessionStorage.clear());

const BARIATRIQUE = /équipement bariatrique adapté/i;
const AIDES = /aides ou conditions particulières/i;

function afficher(onPasserAuSecretariat = () => {}) {
  render(
    <Prescripteur
      onPasserAuSecretariat={onPasserAuSecretariat}
      onNouvelleSimulation={() => {}}
    />,
  );
  return userEvent.setup();
}

describe("prescripteur — résultat médical", () => {
  // La v9.5.0 donnait à la Partie 1 deux façons de trancher seule : l'urgence
  // vitale répondue en Q1, et la contrainte bariatrique répondue en M0. La v9.7
  // a retiré les deux — le cas final « SMUR » comme « bariatrique seul » —, et
  // la Partie 2 est désormais toujours requise. Les deux scénarios de ce fichier
  // qui en dépendaient sont donc remplacés par ce constat.
  it("aucune réponse médicale ne conclut plus le parcours à elle seule", async () => {
    const user = afficher();

    await terminerParcours(user, [[BARIATRIQUE]]);

    // Le bouton mène à la suite du parcours, pas à un verdict de refus.
    expect(
      screen.queryByRole("button", { name: /voir le résultat final/i }),
    ).toBeNull();
    expect(
      screen.getByRole("heading", { name: /décision médicale établie/i }),
    ).toBeInTheDocument();
  });

  // RESULT-004 du livrable : la v9.5.0 retire du verdict la phrase du mode le
  // moins onéreux — qui parlait de coût là où l'écran ne tranche que le médical —
  // et lui substitue la portée de la décision.
  it("RESULT-004 : le verdict borne sa portée, sans parler du mode le moins onéreux", async () => {
    const user = afficher();

    await terminerParcours(user, [
      [/^concernant son déplacement, le patient/i, /peut se déplacer seul/i],
    ]);

    expect(
      screen.getByText(
        /cette décision porte uniquement sur le mode de transport médicalement adapté/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/moins onéreux/i)).toBeNull();
  });

  it("décision établie : le bloc patient liste critères et cas particuliers retenus", async () => {
    const user = afficher();

    // Q1 : besoin d'un professionnel → Q1.1 est posée. Choix unique : la page
    // avance d'elle-même, sans bouton.
    await user.click(
      within(
        screen.getByRole("group", {
          name: /^concernant son déplacement, le patient/i,
        }),
      ).getByRole("radio", { name: /prise en charge spécifique/i }),
    );
    const aides = await screen.findByRole("group", { name: AIDES });

    // Q1.1 : un critère d'ambulance → attendu dans les critères retenus.
    await user.click(
      within(aides).getByRole("checkbox", {
        name: /administration d’oxygène/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    // M0 : une séance → attendue dans les cas particuliers médicaux. La v9.7 a
    // défait la case unique « séance » en trois, une par soin. Le reste du
    // parcours — le choix du mode non professionnalisé — se conduit par défaut.
    await user.click(
      screen.getByRole("checkbox", { name: /séance de dialyse en centre/i }),
    );
    await terminerParcours(user, []);

    expect(
      screen.getByRole("heading", { name: /information destinée au patient/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /critères médicaux retenus/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/administration d’oxygène/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: /cas particuliers médicaux retenus/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/séance de dialyse en centre, hémodialyse comprise/i),
    ).toBeInTheDocument();
  });

  // `InformationPatient` porte une explication réservée au cas où aucun mode
  // n'est retenu : les deux conditions d'une prescription, et pourquoi elles ne
  // sont pas réunies. La v9.5.1 y menait par la contrainte bariatrique seule.
  //
  // La v9.7 a fermé ce chemin : `p1_mode_transport_medical` rend « véhicule
  // personnel ou transport en commun » dès que la Partie 1 est complète, et sa
  // branche « non » n'est plus atteignable. Le bloc reste écrit, sans écran d'où
  // le voir. Ce test constate l'impasse.
  it("la Partie 1 conclut toujours sur un mode", async () => {
    const user = afficher();

    await terminerParcours(user, [
      [/^concernant son déplacement, le patient/i, /peut se déplacer seul/i],
    ]);

    expect(
      screen.getByRole("heading", { name: /décision médicale établie/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/ne permettent pas à votre médecin de prescrire/i),
      "Le modèle a rouvert le cas « aucun mode retenu ». Rétablis le scénario " +
        "qui vérifiait l'explication des deux conditions dans le bloc patient.",
    ).toBeNull();
  });
});
