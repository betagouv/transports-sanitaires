// TS973-02 : un avion/bateau sans sous-situation Cerfa n'est plus bloqué par
// une adresse que ce parcours ne collecte pas — aucune DAP n'y étant produite,
// rien ne doit en réclamer une pour conclure. Contrat v9.7.3, guide
// développeur §5 : « les cibles de cases DAP sont fausses et ne réclament pas
// une adresse cachée ».

import { render, screen } from "@testing-library/react";
import type { Situation } from "publicodes";
import { beforeEach, describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { moteurDeTest } from "./moteur";

beforeEach(() => sessionStorage.clear());

const CASE_LABEL =
  "Convocation avec transport en avion ou bateau : orientation vers la caisse";
const CARACTERISTIQUES_TRAJET =
  "Confirmer les caractéristiques du trajet : avion ou bateau de ligne régulière et distance aller.";

const CHAMPS_DE_TRAJET = [
  "p2_depart_nom_lieu",
  "p2_depart_adresse",
  "p2_depart_complement_adresse",
  "p2_depart_code_postal",
  "p2_depart_commune",
  "p2_depart_pays",
  "p2_arrivee_nom_lieu",
  "p2_arrivee_adresse",
  "p2_arrivee_complement_adresse",
  "p2_arrivee_code_postal",
  "p2_arrivee_commune",
  "p2_arrivee_pays",
  "p2_tranche_distance_trajet_aller",
] as const;

function sansTrajet(situation: Situation<string>): Situation<string> {
  const copie = { ...situation };
  for (const champ of CHAMPS_DE_TRAJET) delete copie[champ];
  return copie;
}

const CAISSE_SANS_ADRESSE: Situation<string> = {
  ...sansTrajet(BASE_NEUTRE),
  p2_convocation_ou_avis_type:
    "'Convocation du contrôle médical de l’Assurance Maladie.'",
  p2_convocation_avion_bateau: "oui",
  p2_convocation_aucune: "non",
  p2_transport_urgence: "'Non'",
};

describe("TS973-02 — orientation caisse sans adresse", () => {
  it("conclut sans qu’aucune adresse ne soit citée comme manquante", () => {
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={CAISSE_SANS_ADRESSE}
      />,
    );

    // Le cas retenu se détermine malgré l'absence totale d'adresse.
    expect(screen.getByText(CASE_LABEL)).toBeInTheDocument();
    // Le fait avion/bateau reste visible dans la synthèse remise au
    // prescripteur.
    expect(screen.getByText(CARACTERISTIQUES_TRAJET)).toBeInTheDocument();
    // Aucun motif de DAP ne s'affiche : les six cibles valent faux.
    expect(
      screen.queryByRole("list", { name: /motif ou motifs/i }),
    ).not.toBeInTheDocument();
  });

  it("n’allège pas une vraie DAP : une sous-situation justifiée exige toujours ses adresses", () => {
    // Contre-épreuve : avec un contexte d'hospitalisation (sous-situation
    // Cerfa justifiée), l'avion/bateau donne une vraie DAP — et celle-ci
    // reste bloquée tant que le trajet n'est pas qualifié.
    const situation: Situation<string> = {
      ...sansTrajet(BASE_NEUTRE),
      p2_raison_principale: "'Entrée en hospitalisation'",
      p2_special_avion_bateau: "oui",
      p2_special_aucune: "non",
    };

    const resultat = moteurDeTest(situation).evaluate("cible_cas_final");
    expect(Object.keys(resultat.missingVariables ?? {})).not.toEqual([]);
  });
});
