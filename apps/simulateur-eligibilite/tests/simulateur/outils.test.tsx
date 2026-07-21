import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prescripteur } from "../../front/prescripteur/Prescripteur";
import { Secretariat } from "../../front/secretariat/Secretariat";
import { emettrePassation } from "../../front/simulateur/passation";

type User = ReturnType<typeof userEvent.setup>;
type Reponse = [RegExp, string];

// Répond aux groupes booléens : les libellés ciblés selon `reponses`, puis
// « Non » à tout groupe resté sans réponse (les questions du modèle v3 posées
// pour ces cibles sont toutes des oui/non).
async function repondrePage(user: User, reponses: Reponse[]) {
  for (const [re, value] of reponses) {
    const group = screen.queryByRole("group", { name: re });
    if (group) {
      const radio = within(group).queryByRole("radio", { name: value });
      if (radio) await user.click(radio);
    }
  }
  for (const group of screen.queryAllByRole("group")) {
    if (within(group).queryByRole("radio", { checked: true })) continue;
    const non = within(group).queryByRole("radio", { name: "Non" });
    if (non) await user.click(non);
  }
}

// Remplit le parcours page par page jusqu'au bouton de fin (tout sauf « Suivant »).
async function terminerParcours(user: User, reponses: Reponse[]) {
  for (let i = 0; i < 40; i++) {
    await repondrePage(user, reponses);
    const suivant = screen.queryByRole("button", { name: /^suivant$/i });
    if (suivant) {
      await user.click(suivant);
      continue;
    }
    await user.click(screen.getByRole("button", { name: /^voir/i }));
    return;
  }
  throw new Error("parcours non terminé après 40 pages");
}

// v6 : les filtres M0 (SMUR → bariatrique → permission) se succèdent, une question
// par page. On répond « Non » à chacun pour atteindre la question du motif.
async function passerFiltresM0(user: User) {
  for (const re of [
    /équipe SMUR/i,
    /contrainte bariatrique/i,
    /permission de sortie/i,
  ]) {
    const g = await screen.findByRole("group", { name: re });
    // M0.3 (permission) est un choix Oui/Non/Non concerné dont les libellés
    // sont en minuscules ; ^non$ cible « non » sans matcher « non concerné ».
    await user.click(within(g).getByRole("radio", { name: /^non$/i }));
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));
  }
}

beforeEach(() => sessionStorage.clear());

describe("prescripteur — parcours médical", () => {
  it("commence par la page « Situation particulière » (SMUR en premier, ALD non révélée)", () => {
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />
    );
    // 1re page : situations particulières uniquement — les motifs et l'ALD
    // n'apparaissent que sur les pages suivantes (révélation progressive).
    expect(
      screen.getByRole("group", { name: /équipe SMUR/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: /en lien avec une ALD/i })
    ).toBeNull();
    expect(
      screen.queryByRole("group", { name: /hospitalisation/i })
    ).toBeNull();
  });

  it("n'affiche pas « Voir le résultat médical » tant que le parcours n'est pas terminé", async () => {
    const user = userEvent.setup();
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />
    );

    // 1re page, question non répondue : bien que le moteur n'ait pas encore de
    // page suivante (le séquencement conditionnel dépend de la réponse), le
    // bouton de fin ne doit pas apparaître. Le bouton d'avancement reste
    // « Suivant » et est désactivé (« toute question posée doit être répondue »).
    expect(screen.queryByRole("button", { name: /voir/i })).toBeNull();
    const suivant = screen.getByRole("button", { name: /^suivant$/i });
    expect(suivant).toBeDisabled();

    // Après réponse, une page suivante existe : toujours pas de bouton de fin.
    await user.click(
      within(screen.getByRole("group", { name: /équipe SMUR/i })).getByRole(
        "radio",
        { name: "Non" }
      )
    );
    expect(screen.queryByRole("button", { name: /voir/i })).toBeNull();
    expect(
      screen.getByRole("button", { name: /^suivant$/i })
    ).toBeEnabled();
  });

  it("SMUR → avis médical favorable, passe la main au secrétariat", async () => {
    const user = userEvent.setup();
    const passer = vi.fn();
    render(
      <Prescripteur
        onPasserAuSecretariat={passer}
        onNouvelleSimulation={() => {}}
      />
    );

    await terminerParcours(user, [[/équipe SMUR/i, "Oui"]]);

    expect(
      screen.getByRole("heading", { name: /avis médical favorable/i })
    ).toBeInTheDocument();

    // Cas tranché dès la Partie 1 : le CTA mène directement au document.
    await user.click(
      screen.getByRole("button", { name: /voir le document/i })
    );
    expect(passer).toHaveBeenCalledTimes(1);
  });

  it("motifs (M1.1) : une seule question à cases à cocher avec exclusivité « Aucun »", async () => {
    const user = userEvent.setup();
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />
    );

    // Page « Situation particulière » (révélation progressive) → page « Motif ».
    await passerFiltresM0(user);

    // Page « Motif » : une seule question, rendue en cases à cocher.
    const motif = screen.getByRole("group", {
      name: /quelle situation justifie le transport/i,
    });
    const hospit = within(motif).getByRole("checkbox", {
      name: /hospitalisation/i,
    });
    const ald = within(motif).getByRole("checkbox", {
      name: /en lien avec une ALD/i,
    });
    const aucun = within(motif).getByRole("checkbox", {
      name: /aucun de ces motifs/i,
    });

    // Choix multiple : deux motifs cochés simultanément (les autres options ne
    // doivent pas se désactiver une fois l'agrégat OU satisfait).
    await user.click(hospit);
    await user.click(ald);
    expect(hospit).toBeChecked();
    expect(ald).toBeChecked();

    // Exclusivité : cocher « Aucun » décoche tous les motifs.
    await user.click(aucun);
    expect(aucun).toBeChecked();
    expect(hospit).not.toBeChecked();
    expect(ald).not.toBeChecked();
  });

  it("motifs (M1.1) : décocher la dernière case rebloque l'avancement (aucune sélection ≠ répondu)", async () => {
    const user = userEvent.setup();
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />
    );

    await passerFiltresM0(user);

    const motif = screen.getByRole("group", {
      name: /quelle situation justifie le transport/i,
    });
    const hospit = within(motif).getByRole("checkbox", {
      name: /hospitalisation/i,
    });

    // La mosaïque fige toutes ses options dans la situation à chaque clic ; une
    // fois « répondues » au sens de @publicodes/forms, un coche→décoche laisse le
    // groupe visuellement vide MAIS sans « aucun » explicite. Le parcours ne doit
    // pas être considéré terminé : le CTA de fin ne doit pas apparaître et
    // l'avancement reste bloqué (« aucune sélection » n'est pas une réponse).
    await user.click(hospit);
    await user.click(hospit);
    expect(hospit).not.toBeChecked();

    expect(screen.queryByRole("button", { name: /^voir/i })).toBeNull();
    expect(screen.getByRole("button", { name: /^suivant$/i })).toBeDisabled();
  });

  it("critères — « Aucune situation » (aucun à sémantique métier) mène au transport véhicule personnel", async () => {
    const user = userEvent.setup();
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />
    );

    // Situation (révélation progressive) → Motif.
    await passerFiltresM0(user);

    // Motif : cocher « hospitalisation ».
    const motif = screen.getByRole("group", {
      name: /quelle situation justifie le transport/i,
    });
    await user.click(
      within(motif).getByRole("checkbox", { name: /hospitalisation/i })
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    // Autonomie (v6 : gate des critères) : répondre.
    const autonomie = screen.getByRole("group", { name: /^le patient/i });
    await user.click(
      within(autonomie).getByRole("radio", { name: /aucune de ces situations/i })
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    // Critères : cocher « Aucune de ces situations » (option aucun = règle métier
    // p1_critere_aucune_situation_encadree, qui doit être activée).
    const crit = screen.getByRole("group", {
      name: /prise en charge plus encadrée/i,
    });
    await user.click(
      within(crit).getByRole("checkbox", { name: /aucune de ces situations/i })
    );
    await user.click(screen.getByRole("button", { name: /^voir/i }));

    // Résultat déduit : transport véhicule personnel ou transport en commun.
    expect(
      screen.getByRole("heading", { name: /avis médical favorable/i })
    ).toBeInTheDocument();
    // (getAllByText : le panneau de debug répète la valeur du transport.)
    expect(
      screen.getAllByText(/véhicule personnel ou transport en commun/i).length
    ).toBeGreaterThan(0);
  });

  it("critères VSL/taxi → la question « transport partagé » est posée (cible sortie P1)", async () => {
    const user = userEvent.setup();
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />
    );

    await passerFiltresM0(user);
    await user.click(
      within(
        screen.getByRole("group", {
          name: /quelle situation justifie le transport/i,
        })
      ).getByRole("checkbox", { name: /hospitalisation/i })
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));
    await user.click(
      within(screen.getByRole("group", { name: /^le patient/i })).getByRole(
        "radio",
        { name: /aucune de ces situations/i }
      )
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    // Critère menant à un VSL/taxi → transport partagé devient applicable ET, la
    // sortie étant ciblée, la question est posée à l'étape suivante.
    await user.click(
      within(
        screen.getByRole("group", { name: /prise en charge plus encadrée/i })
      ).getByRole("checkbox", { name: /respect rigoureux de règles d’hygiène/i })
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    expect(
      screen.getByRole("group", { name: /transport partagé/i })
    ).toBeInTheDocument();
  });

  it("contrainte bariatrique seule → avis défavorable", async () => {
    const user = userEvent.setup();
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />
    );

    await terminerParcours(user, [[/contrainte bariatrique/i, "Oui"]]);

    expect(
      screen.getByRole("heading", { name: /non justifié médicalement/i })
    ).toBeInTheDocument();
  });

  it("favorable : le bloc « Information destinée au patient » liste critères et motifs retenus", async () => {
    const user = userEvent.setup();
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />
    );

    await passerFiltresM0(user);

    // Motif : hospitalisation → attendu dans les motifs ouvrant droit.
    await user.click(
      within(
        screen.getByRole("group", {
          name: /quelle situation justifie le transport/i,
        })
      ).getByRole("checkbox", { name: /hospitalisation/i })
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    await user.click(
      within(screen.getByRole("group", { name: /^le patient/i })).getByRole(
        "radio",
        { name: /aucune de ces situations/i }
      )
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    // Critère : « Aucune situation » → attendu dans les critères retenus.
    await user.click(
      within(
        screen.getByRole("group", { name: /prise en charge plus encadrée/i })
      ).getByRole("checkbox", { name: /aucune de ces situations/i })
    );
    await user.click(screen.getByRole("button", { name: /^voir/i }));

    expect(
      screen.getByRole("heading", { name: /information destinée au patient/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /critères médicaux retenus/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /aucune situation nécessitant une prise en charge plus encadrée/i
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /motifs ouvrant droit/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/entrée ou sortie d’hospitalisation/i)
    ).toBeInTheDocument();
  });

  it("défavorable : le bloc patient explique les deux conditions manquantes", async () => {
    const user = userEvent.setup();
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />
    );

    await terminerParcours(user, [[/contrainte bariatrique/i, "Oui"]]);

    expect(
      screen.getByRole("heading", { name: /information destinée au patient/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/deux éléments doivent être réunis/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/une situation ouvrant droit à la prise en charge/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/un besoin médical de transport adapté/i)
    ).toBeInTheDocument();
    // Aucune section « critères/motifs retenus » quand l'avis est défavorable.
    expect(
      screen.queryByRole("heading", { name: /critères médicaux retenus/i })
    ).toBeNull();
  });

  it("retour : changer une réponse recalcule la suite (pas de page suivante figée)", async () => {
    const user = userEvent.setup();
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />
    );

    const repondreFiltre = async (re: RegExp, val: string) => {
      const g = await screen.findByRole("group", { name: re });
      await user.click(within(g).getByRole("radio", { name: val }));
      await user.click(screen.getByRole("button", { name: /^suivant$/i }));
    };

    // SMUR non → bariatrique non → on atteint la page « permission de sortie ».
    await repondreFiltre(/équipe SMUR/i, "Non");
    await repondreFiltre(/contrainte bariatrique/i, "Non");
    expect(
      screen.getByRole("group", { name: /permission de sortie/i })
    ).toBeInTheDocument();

    // Retour → page « contrainte bariatrique ».
    await user.click(screen.getByRole("button", { name: /précédent/i }));
    expect(
      screen.getByRole("group", { name: /contrainte bariatrique/i })
    ).toBeInTheDocument();

    // Changer la réponse : bariatrique = Oui mène à une sortie directe. La page
    // « permission de sortie » ne doit plus être figée dans l'état : le parcours
    // se recalcule et se termine (bouton de fin), sans repasser par elle.
    await user.click(
      within(
        screen.getByRole("group", { name: /contrainte bariatrique/i })
      ).getByRole("radio", { name: "Oui" })
    );
    expect(
      screen.getByRole("button", { name: /voir le résultat médical/i })
    ).toBeEnabled();

    await user.click(
      screen.getByRole("button", { name: /voir le résultat médical/i })
    );
    expect(
      screen.queryByRole("group", { name: /permission de sortie/i })
    ).toBeNull();
    expect(
      screen.getByRole("heading", { name: /non justifié médicalement/i })
    ).toBeInTheDocument();
  });
});

describe("secrétariat — parcours administratif", () => {
  it("sans passation : invite à commencer par l'évaluation médicale", () => {
    render(<Secretariat onNouvelleSimulation={() => {}} />);
    expect(
      screen.getByRole("heading", { name: /aucune prescription en attente/i })
    ).toBeInTheDocument();
  });

  it("cas tranché dès la Partie 1 (SMUR) : affiche directement la Page Résultat 2", () => {
    emettrePassation({
      p1_situation_smur: "oui",
      p1_situation_bariatrique_seul: "non",
      p1_situation_permission_sans_motif_medical: "'Non'",
    });
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    // Bloc 1 — résultat final (titre du cas SMUR).
    expect(
      screen.getByRole("heading", { name: /transport par équipe SMUR/i })
    ).toBeInTheDocument();
    // Bloc 2 — information destinée au patient, avec les étapes.
    expect(
      screen.getByRole("heading", { name: /information destinée au patient/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /ce que vous devez faire maintenant/i })
    ).toBeInTheDocument();
    // Bloc 3 — informations pour le corps médical, avec le document (en texte).
    expect(
      screen.getByRole("heading", { name: /informations pour le corps médical/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/document à remettre au patient/i)).toBeInTheDocument();
  });

  it("cas défavorable sans transport (bariatrique) : bloc patient sur les deux conditions et reste à charge", () => {
    emettrePassation({
      p1_situation_smur: "non",
      p1_situation_bariatrique_seul: "oui",
    });
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    // Bloc 1 — aucun transport prescrit.
    expect(
      screen.getByRole("heading", { name: /au titre du seul motif « bariatrique »/i })
    ).toBeInTheDocument();
    // Bloc 2 — variante « aucun transport » : rappel des deux conditions, pas de
    // section critères/motifs retenus.
    expect(
      screen.getByText(/deux éléments doivent être réunis/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /critères médicaux retenus/i })
    ).toBeNull();
    expect(
      screen.getByRole("heading", { name: /prise en charge \/ reste à charge/i })
    ).toBeInTheDocument();
    // Bloc 3 — cas retenu détaillé pour le corps médical.
    expect(
      screen.getByText(/contrainte bariatrique seule insuffisante/i)
    ).toBeInTheDocument();
  });

  it("Bloc 3 « Mode de transport » : ne liste que les cases validées par la simulation", () => {
    // Cas succès (PMT, transport déduit = ambulance via critère « position
    // allongée »). La section « Mode de transport » ne doit afficher que les
    // cases établies par la simulation, pas la liste complète.
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={{
          p1_situation_smur: "non",
          p1_situation_bariatrique_seul: "non",
          p1_situation_permission_sans_motif_medical: "'Non'",
          p1_motif_hospitalisation: "non",
          p1_motif_seance_chimio_radio_hemodialyse: "non",
          p1_motif_ald: "oui",
          p1_ald_lien_avec_ald_reconnue: "oui",
          p1_ald_seance_specifique: "non",
          p1_ald_incapacite_ou_deficience: "oui",
          p1_motif_accident_travail_maladie_professionnelle: "non",
          p1_motif_retour_etablissement_penitentiaire: "non",
          p1_motif_aucun: "non",
          p1_autonomie: "'Aucune de ces situations.'",
          p1_critere_regles_hygiene: "non",
          p1_critere_risques_effets_secondaires: "non",
          p1_critere_fauteuil_sans_transfert: "non",
          p1_critere_position_allongee_demi_assise: "oui",
          p1_critere_brancardage_portage: "non",
          p1_critere_surveillance_personne_qualifiee: "non",
          p1_critere_oxygene: "non",
          p1_critere_asepsie: "non",
          p1_critere_aucune_situation_encadree: "non",
          p2_patient_hospitalise: "non",
          p2_convocation_ou_avis: "non",
          p2_distance_aller_superieure_150km: "non",
          p2_transport_en_serie: "oui",
          p2_avion_ou_bateau: "non",
          p2_camsp_cmpp: "non",
          p2_maternite_eloignee: "non",
          p2_samsah: "non",
          p2_accompagnement_tiers: "non",
          p2_trajet_aller_retour: "'Aller simple'",
          p2_trajet_depart: "'Domicile'",
          p2_trajet_arrivee: "'Structure de soins'",
          p2_nombre_transports_prevus: "4",
          p2_transport_urgence: "'Non'",
          p2_accident_cause_par_tiers: "'Non'",
        }}
      />
    );

    // On est bien sur le cas PMT (ambulance).
    expect(
      screen.getByRole("heading", {
        name: /vous êtes éligible à une prise en charge/i,
      })
    ).toBeInTheDocument();

    // Cases validées affichées.
    expect(screen.getByText("Ambulance.")).toBeInTheDocument();
    expect(
      screen.getByText("Position allongée ou demi-assise.")
    ).toBeInTheDocument();

    // Cases non établies par la simulation : absentes.
    expect(
      screen.queryByText("Surveillance par une personne qualifiée.")
    ).toBeNull();
    expect(screen.queryByText("Administration d’oxygène.")).toBeNull();
    expect(screen.queryByText("VSL ou taxi conventionné.")).toBeNull();
    expect(screen.queryByText("Moyen de transport individuel.")).toBeNull();
  });

  it("raccourci `situationFinale` : ouvre directement la Page Résultat 2, sans passation", () => {
    // Aucune passation émise : sans le raccourci, le secrétariat afficherait
    // « aucune prescription ». Une situation complète en `situationFinale`
    // court-circuite le parcours et rend le résultat final.
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={{
          p1_situation_smur: "oui",
          p1_situation_bariatrique_seul: "non",
          p1_situation_permission_sans_motif_medical: "'Non'",
        }}
      />
    );

    expect(
      screen.getByRole("heading", { name: /transport par équipe SMUR/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /aucune prescription en attente/i })
    ).toBeNull();
  });
});
