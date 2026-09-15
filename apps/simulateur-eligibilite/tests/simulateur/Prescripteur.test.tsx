import {
  render,
  screen,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { Prescripteur } from "../../front/simulateur/prescripteur/Prescripteur";

beforeEach(() => sessionStorage.clear());

// Le parcours médical tient en quatre pages au plus : Q1 (autonomie et besoins),
// puis Q1.1 (aides et conditions particulières) **seulement** si Q1 établit un
// besoin professionnel, puis M0 (cas particuliers médicaux), et enfin M4
// (transport partagé) quand le mode retenu s'y prête. M0 précède M4 : elle seule
// peut trancher le parcours dès la Partie 1.
const AUTONOME = /peut se déplacer seul/i;
const PROCHE = /accompagnement d’un proche/i;
const PROFESSIONNEL = /prise en charge spécifique/i;
const AIDES = /aides ou conditions particulières/i;
const CAS_PARTICULIERS = /cas particuliers/i;
/** La sortie exclusive, que la v9.7 donne aux neuf mosaïques du même libellé. */
const AUCUNE_SITUATION = /aucune de ces situations/i;

function afficher() {
  render(
    <Prescripteur
      onPasserAuSecretariat={() => {}}
      onNouvelleSimulation={() => {}}
    />,
  );
  return userEvent.setup();
}

const questionQ1 = () =>
  screen.getByRole("group", {
    name: /^concernant son déplacement, le patient/i,
  });
// Q1 est une question à choix unique : elle n'a pas de bouton « Suivant », elle
// avance d'elle-même 200 ms après la réponse. On attend donc la page d'après.
async function repondreQ1(user: ReturnType<typeof afficher>, option: RegExp) {
  await user.click(within(questionQ1()).getByRole("radio", { name: option }));
  await waitForElementToBeRemoved(() =>
    screen.queryByRole("group", {
      name: /^concernant son déplacement, le patient/i,
    }),
  );
}

describe("prescripteur — parcours médical", () => {
  it("commence par l'autonomie (Q1), sans révéler les aides ni les cas particuliers", () => {
    afficher();
    expect(questionQ1()).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: AIDES })).toBeNull();
    expect(screen.queryByRole("group", { name: CAS_PARTICULIERS })).toBeNull();
  });

  it("Q1 porte le rappel sur l'aller et le retour, et elle seule", async () => {
    const user = afficher();
    const rappel = /réalisez une évaluation pour chaque sens/i;
    expect(screen.getByText(rappel)).toBeInTheDocument();

    await repondreQ1(user, PROFESSIONNEL);
    expect(screen.queryByText(rappel)).toBeNull();
  });

  it("Q1 n'a aucun bouton : elle avance d'elle-même une fois répondue", async () => {
    const user = afficher();

    // Une question à choix unique se passe de validation (contrat d'interface
    // 2.0.0) : ni « Suivant », ni bouton de fin, à aucun moment de la page.
    expect(screen.queryByRole("button", { name: /^suivant$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /voir/i })).toBeNull();

    await repondreQ1(user, PROFESSIONNEL);
    expect(screen.getByRole("group", { name: AIDES })).toBeInTheDocument();
  });

  it("le retour rend la main au bouton, et modifier la réponse la reprend", async () => {
    const user = afficher();
    await repondreQ1(user, PROFESSIONNEL);
    await user.click(screen.getByRole("button", { name: /précédent/i }));

    // Page déjà répondue : elle n'avance plus seule, sans quoi « Précédent »
    // renverrait aussitôt d'où l'on vient. Le bouton « Suivant » reprend la main.
    expect(screen.getByRole("button", { name: /^suivant$/i })).toBeEnabled();
    expect(
      screen.getByRole("group", {
        name: /^concernant son déplacement, le patient/i,
      }),
    ).toBeInTheDocument();

    // Modifier la réponse relance l'avancement automatique.
    await repondreQ1(user, AUTONOME);
    expect(screen.queryByRole("group", { name: AIDES })).toBeNull();
  });

  it("Q1.1 : une seule question à cases à cocher, avec sa sortie de secours", async () => {
    const user = afficher();
    await repondreQ1(user, PROFESSIONNEL);

    const aides = screen.getByRole("group", { name: AIDES });
    const oxygene = within(aides).getByRole("checkbox", { name: /oxygène/i });
    const fauteuil = within(aides).getByRole("checkbox", {
      name: /transporté dans son fauteuil roulant/i,
    });

    // Choix multiple : deux aides cochées simultanément (les autres options ne
    // doivent pas se désactiver une fois l'agrégat OU satisfait).
    await user.click(oxygene);
    await user.click(fauteuil);
    expect(oxygene).toBeChecked();
    expect(fauteuil).toBeChecked();

    // La v9.5.1 privait Q1.1 d'option exclusive — le modèle exigeait alors au
    // moins un critère. La v9.7 la lui rend, et l'écran doit donc l'offrir, en
    // dernier comme pour les sept autres mosaïques.
    const sortie = within(aides).getByRole("checkbox", {
      name: AUCUNE_SITUATION,
    });
    expect(within(aides).getAllByRole("checkbox").at(-1)).toBe(sortie);
  });

  it("Q1.1 : décocher la dernière case rebloque l'avancement (aucune sélection ≠ répondu)", async () => {
    const user = afficher();
    await repondreQ1(user, PROFESSIONNEL);

    // La mosaïque fige toutes ses options dans la situation à chaque clic ; une
    // fois « répondues » au sens de @publicodes/forms, un coche→décoche laisse le
    // groupe visuellement vide MAIS sans « aucune » explicite. Le parcours ne doit
    // pas être considéré terminé : le CTA de fin ne doit pas apparaître et
    // l'avancement reste bloqué (« aucune sélection » n'est pas une réponse).
    const oxygene = within(
      screen.getByRole("group", { name: AIDES }),
    ).getByRole("checkbox", { name: /oxygène/i });
    await user.click(oxygene);
    await user.click(oxygene);
    expect(oxygene).not.toBeChecked();

    expect(screen.queryByRole("button", { name: /^voir/i })).toBeNull();
    expect(screen.getByRole("button", { name: /^suivant$/i })).toBeDisabled();
  });

  // Q1-SMUR-001 du livrable v9.5.0 : l'urgence vitale était une réponse de Q1,
  // qui tranchait la Partie 1 sans que Q1.1 ni M0 soient posées. La v9.7 a
  // retiré cette réponse et le cas final « SMUR » qui allait avec — l'urgence
  // se recueille désormais en Partie 2. Ce test constate la disparition : le
  // jour où l'éditeur la rouvre, il faudra rétablir le scénario complet.
  it("Q1-SMUR-001 : Q1 n’offre plus l’urgence vitale", async () => {
    afficher();
    const reponses = within(questionQ1()).getAllByRole("radio");
    expect(reponses).toHaveLength(3);
    for (const reponse of reponses)
      expect(reponse).not.toHaveAccessibleName(/urgence vitale|SMUR/i);
  });

  it("Q1-SMUR-001 : M0 n’offre pas davantage le SMUR", async () => {
    const user = afficher();
    await repondreQ1(user, AUTONOME);

    const casParticuliers = screen.getByRole("group", {
      name: CAS_PARTICULIERS,
    });
    expect(
      within(casParticuliers).queryByRole("checkbox", { name: /SMUR/i }),
    ).toBeNull();
  });

  it("un patient autonome saute Q1.1 et obtient le véhicule personnel", async () => {
    const user = afficher();
    await repondreQ1(user, AUTONOME);

    // Q1.1 n'est pas posée : on passe droit aux cas particuliers médicaux.
    expect(screen.queryByRole("group", { name: AIDES })).toBeNull();
    await user.click(
      within(screen.getByRole("group", { name: CAS_PARTICULIERS })).getByRole(
        "checkbox",
        { name: AUCUNE_SITUATION },
      ),
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    // La v9.7 ajoute une étape : le mode non professionnalisé ne se devine plus,
    // le prescripteur choisit entre le véhicule personnel et les transports en
    // commun. La v9.5.1 rendait les deux d'un seul tenant.
    await user.click(
      screen.getByRole("radio", { name: /^véhicule personnel$/i }),
    );

    // Page à choix unique : elle avance d'elle-même, sans bouton de validation.
    expect(
      await screen.findByRole("heading", {
        name: /le transport le plus adapté à votre état de santé/i,
      }),
    ).toBeInTheDocument();
    // (getAllByText : le verdict et l'information au patient nomment tous deux
    // le transport retenu.)
    expect(screen.getAllByText(/véhicule personnel/i).length).toBeGreaterThan(
      0,
    );
  });

  it("une aide menant au VSL fait poser la question du transport partagé", async () => {
    const user = afficher();
    await repondreQ1(user, PROFESSIONNEL);
    // Le maintien dans le fauteuil roulant est le seul critère qui, à lui seul,
    // conduit à un TPMR — donc à un transport où la question du partage se pose.
    await user.click(
      within(screen.getByRole("group", { name: AIDES })).getByRole("checkbox", {
        name: /transporté dans son fauteuil roulant/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    // M4 avant M0 : la v9.5.1 subordonnait le transport partagé aux cas
    // particuliers médicaux, qui décidaient seuls d'un cas tranché dès la
    // Partie 1. La v9.7 a retiré ces sorties directes, et pose le partage dès
    // que le mode est un TAP ou un TPMR — donc avant M0.
    expect(screen.queryByRole("group", { name: CAS_PARTICULIERS })).toBeNull();
    expect(
      screen.getByRole("group", { name: /transport partagé/i }),
    ).toBeInTheDocument();
  });

  it("retour : changer Q1 recalcule la suite (pas de page suivante figée)", async () => {
    const user = afficher();
    await repondreQ1(user, PROFESSIONNEL);
    expect(screen.getByRole("group", { name: AIDES })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /précédent/i }));
    await repondreQ1(user, PROCHE);

    // La page « aides et conditions particulières » ne doit plus être figée dans
    // l'état : le parcours se recalcule et passe droit aux cas particuliers.
    expect(screen.queryByRole("group", { name: AIDES })).toBeNull();
    expect(
      screen.getByRole("group", { name: CAS_PARTICULIERS }),
    ).toBeInTheDocument();
  });
});
