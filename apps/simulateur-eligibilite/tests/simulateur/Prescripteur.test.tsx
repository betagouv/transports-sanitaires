import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { Prescripteur } from "../../front/simulateur/prescripteur/Prescripteur";

beforeEach(() => sessionStorage.clear());

// Le parcours médical v9.1 tient en trois pages : Q1 (autonomie et besoins),
// puis Q1.1 (aides et conditions particulières) **seulement** si Q1 établit un
// besoin professionnel, puis M0 (cas particuliers médicaux) accompagnée de M4
// (transport partagé) quand le mode retenu s'y prête.
const AUTONOME = /peut se déplacer seul/i;
const PROCHE = /proche accompagnant/i;
const PROFESSIONNEL = /prise en charge spécifique/i;
const AIDES = /aides ou conditions particulières/i;
const CAS_PARTICULIERS = /cas particuliers/i;
const AUCUNE_AIDE = /aucune de ces situations/i;
const AUCUN_CAS = /aucun de ces cas médicaux/i;

function afficher() {
  render(
    <Prescripteur
      onPasserAuSecretariat={() => {}}
      onNouvelleSimulation={() => {}}
    />,
  );
  return userEvent.setup();
}

const questionQ1 = () => screen.getByRole("group", { name: /^le patient/i });
const suivant = () => screen.getByRole("button", { name: /^suivant$/i });
const voirResultat = () =>
  screen.getByRole("button", { name: /voir le résultat médical/i });

async function repondreQ1(user: ReturnType<typeof afficher>, option: RegExp) {
  await user.click(within(questionQ1()).getByRole("radio", { name: option }));
}

describe("prescripteur — parcours médical", () => {
  it("commence par l'autonomie (Q1), sans révéler les aides ni les cas particuliers", () => {
    afficher();
    expect(questionQ1()).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: AIDES })).toBeNull();
    expect(screen.queryByRole("group", { name: CAS_PARTICULIERS })).toBeNull();
  });

  it("n'affiche pas « Voir le résultat médical » tant que le parcours n'est pas terminé", async () => {
    const user = afficher();

    // 1re page, question non répondue : bien que le moteur n'ait pas encore de
    // page suivante (le séquencement conditionnel dépend de la réponse), le
    // bouton de fin ne doit pas apparaître. Le bouton d'avancement reste
    // « Suivant » et est désactivé (« toute question posée doit être répondue »).
    expect(screen.queryByRole("button", { name: /voir/i })).toBeNull();
    expect(suivant()).toBeDisabled();

    // Après réponse, une page suivante existe : toujours pas de bouton de fin.
    await repondreQ1(user, PROFESSIONNEL);
    expect(screen.queryByRole("button", { name: /voir/i })).toBeNull();
    expect(suivant()).toBeEnabled();
  });

  it("Q1.1 : une seule question à cases à cocher, avec exclusivité « Aucune »", async () => {
    const user = afficher();
    await repondreQ1(user, PROFESSIONNEL);
    await user.click(suivant());

    const aides = screen.getByRole("group", { name: AIDES });
    const oxygene = within(aides).getByRole("checkbox", { name: /oxygène/i });
    const fauteuil = within(aides).getByRole("checkbox", {
      name: /doit rester dans son fauteuil roulant/i,
    });
    const aucune = within(aides).getByRole("checkbox", { name: AUCUNE_AIDE });

    // Choix multiple : deux aides cochées simultanément (les autres options ne
    // doivent pas se désactiver une fois l'agrégat OU satisfait).
    await user.click(oxygene);
    await user.click(fauteuil);
    expect(oxygene).toBeChecked();
    expect(fauteuil).toBeChecked();

    // Exclusivité : cocher « Aucune » décoche toutes les aides.
    await user.click(aucune);
    expect(aucune).toBeChecked();
    expect(oxygene).not.toBeChecked();
    expect(fauteuil).not.toBeChecked();
  });

  it("Q1.1 : décocher la dernière case rebloque l'avancement (aucune sélection ≠ répondu)", async () => {
    const user = afficher();
    await repondreQ1(user, PROFESSIONNEL);
    await user.click(suivant());

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
    expect(suivant()).toBeDisabled();
  });

  it("un patient autonome saute Q1.1 et obtient le véhicule personnel", async () => {
    const user = afficher();
    await repondreQ1(user, AUTONOME);
    await user.click(suivant());

    // Q1.1 n'est pas posée : on passe droit aux cas particuliers médicaux.
    expect(screen.queryByRole("group", { name: AIDES })).toBeNull();
    await user.click(
      within(screen.getByRole("group", { name: CAS_PARTICULIERS })).getByRole(
        "checkbox",
        { name: AUCUN_CAS },
      ),
    );
    await user.click(voirResultat());

    expect(
      screen.getByRole("heading", { name: /décision médicale établie/i }),
    ).toBeInTheDocument();
    // (getAllByText : le panneau de debug répète la valeur du transport.)
    expect(
      screen.getAllByText(/véhicule personnel ou transport en commun/i).length,
    ).toBeGreaterThan(0);
  });

  it("une aide menant au VSL fait poser la question du transport partagé", async () => {
    const user = afficher();
    await repondreQ1(user, PROFESSIONNEL);
    await user.click(suivant());
    await user.click(
      within(screen.getByRole("group", { name: AIDES })).getByRole("checkbox", {
        name: /règles d’hygiène ou la désinfection/i,
      }),
    );
    await user.click(suivant());

    // Le mode retenu est un VSL ou taxi conventionné : M4 devient applicable et,
    // la sortie étant ciblée, la question est posée.
    expect(
      screen.getByRole("group", { name: /transport partagé/i }),
    ).toBeInTheDocument();
  });

  it("retour : changer Q1 recalcule la suite (pas de page suivante figée)", async () => {
    const user = afficher();
    await repondreQ1(user, PROFESSIONNEL);
    await user.click(suivant());
    expect(screen.getByRole("group", { name: AIDES })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /précédent/i }));
    await repondreQ1(user, PROCHE);
    await user.click(suivant());

    // La page « aides et conditions particulières » ne doit plus être figée dans
    // l'état : le parcours se recalcule et passe droit aux cas particuliers.
    expect(screen.queryByRole("group", { name: AIDES })).toBeNull();
    expect(
      screen.getByRole("group", { name: CAS_PARTICULIERS }),
    ).toBeInTheDocument();
  });
});
