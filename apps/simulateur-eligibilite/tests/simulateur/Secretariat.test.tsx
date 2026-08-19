import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { emettrePassation } from "../../front/simulateur/passation";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";

beforeEach(() => sessionStorage.clear());

describe("secrétariat — parcours administratif", () => {
  it("sans passation : invite à commencer par l'évaluation médicale", () => {
    render(<Secretariat onNouvelleSimulation={() => {}} />);
    expect(
      screen.getByRole("heading", { name: /aucune prescription en attente/i }),
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
      screen.getByRole("heading", { name: /transport par équipe SMUR/i }),
    ).toBeInTheDocument();
    // Bloc 2 — information destinée au patient, avec les étapes.
    expect(
      screen.getByRole("heading", { name: /information destinée au patient/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /ce que vous devez faire maintenant/i,
      }),
    ).toBeInTheDocument();
    // Bloc 3 — informations pour le corps médical, avec le document (en texte).
    expect(
      screen.getByRole("heading", {
        name: /informations pour le corps médical/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/document à remettre au patient/i),
    ).toBeInTheDocument();
  });

  it("cas défavorable sans transport (bariatrique) : bloc patient sur les deux conditions et reste à charge", () => {
    emettrePassation({
      p1_situation_smur: "non",
      p1_situation_bariatrique_seul: "oui",
    });
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    // Bloc 1 — aucun transport prescrit.
    expect(
      screen.getByRole("heading", {
        name: /au titre du seul motif « bariatrique »/i,
      }),
    ).toBeInTheDocument();
    // Bloc 2 — variante « aucun transport » : rappel des deux conditions, pas de
    // section critères/motifs retenus.
    expect(
      screen.getByText(/deux éléments doivent être réunis/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /critères médicaux retenus/i }),
    ).toBeNull();
    expect(
      screen.getByRole("heading", {
        name: /prise en charge \/ reste à charge/i,
      }),
    ).toBeInTheDocument();
    // Bloc 3 — cas retenu détaillé pour le corps médical.
    expect(
      screen.getByText(/contrainte bariatrique seule insuffisante/i),
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
          // v8.10 : A2.3 (prestation prise en charge) applicable hors motif déjà
          // qualifiant → doit être répondue pour trancher le cas final.
          p2_prestation_prise_en_charge_assurance_maladie: "oui",
          p2_distance_aller_superieure_150km: "non",
          // v8.10 : série calculée depuis le nombre (>=4) + distance de chaque trajet.
          p2_chaque_trajet_aller_superieur_50km: "oui",
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
      />,
    );

    // On est bien sur le cas PMT (ambulance).
    expect(
      screen.getByRole("heading", {
        name: /vous êtes éligible à une prise en charge/i,
      }),
    ).toBeInTheDocument();

    // Cases validées affichées.
    expect(screen.getByText("Ambulance.")).toBeInTheDocument();
    expect(
      screen.getByText("Position allongée ou demi-assise."),
    ).toBeInTheDocument();

    // Cases non établies par la simulation : absentes.
    expect(
      screen.queryByText("Surveillance par une personne qualifiée."),
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
      />,
    );

    expect(
      screen.getByRole("heading", { name: /transport par équipe SMUR/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", {
        name: /aucune prescription en attente/i,
      }),
    ).toBeNull();
  });
});
