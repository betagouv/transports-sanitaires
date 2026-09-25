// TS973-02 : un avion/bateau sans sous-situation Cerfa n'est plus bloqué par
// une adresse que ce parcours ne collecte pas — aucune DAP n'y étant produite,
// rien ne doit en réclamer une pour conclure. Contrat v9.7.3, guide
// développeur §5 : « les cibles de cases DAP sont fausses et ne réclament pas
// une adresse cachée ».
//
// Deux parcours mènent à l'orientation caisse (`p2_orientation_caisse`) : la
// convocation (`p2_convocation_orientation_caisse`) et les « situations
// spéciales » hors convocation (`p2_avion_orientation_caisse`). Seule la
// première est visée par ce ticket : une convocation ne pose aucune question
// de trajet, donc une adresse qu'elle exigerait serait bien « cachée ». La
// seconde qualifie un trajet réel (`p2_qualification_trajet_complete`) quelle
// que soit son issue — l'adresse y est une question ordinaire et visible, pas
// un contournement. La contre-épreuve ci-dessous le vérifie : elle reste, par
// construction du modèle, indécidable sans adresse.

import { render, screen } from "@testing-library/react";
import type { Situation } from "publicodes";
import { beforeEach, describe, expect, it } from "vitest";
import { seedParId } from "../../front/outils-produit/seeds/catalogue";
import { situationDe } from "../../front/outils-produit/seeds/seed";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { moteurDeTest } from "./moteur";

beforeEach(() => sessionStorage.clear());

const CASE_LABEL =
  "Convocation avec transport en avion ou bateau : orientation vers la caisse";
const CARACTERISTIQUES_TRAJET =
  "Confirmer les caractéristiques du trajet : avion ou bateau de ligne régulière et distance aller.";

const SEED_SANS_ADRESSE = seedParId(
  "secretariat-convocation-orientation-caisse-sans-adresse",
);
// Ses champs de trajet sont déjà absents (la seed les retire), donc les deux
// contre-épreuves ci-dessous n'ont qu'à retirer ce qui la rend « convocation ».
const CAISSE_SANS_ADRESSE = situationDe(SEED_SANS_ADRESSE);

function sans(
  situation: Situation<string>,
  champs: string[],
): Situation<string> {
  const copie = { ...situation };
  for (const champ of champs) delete copie[champ];
  return copie;
}

const CHAMPS_DE_CONVOCATION = [
  "p2_convocation_ou_avis_type",
  "p2_convocation_avion_bateau",
  "p2_convocation_aucune",
];

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
      ...sans(CAISSE_SANS_ADRESSE, CHAMPS_DE_CONVOCATION),
      p2_raison_principale: "'Entrée en hospitalisation'",
      p2_special_avion_bateau: "oui",
      p2_special_aucune: "non",
    };

    const resultat = moteurDeTest(situation).evaluate("cible_cas_final");
    expect(Object.keys(resultat.missingVariables ?? {})).not.toEqual([]);
  });

  it("le parcours hors convocation qualifie toujours le trajet, adresse comprise — hors périmètre de TS973-02", () => {
    // Même une orientation caisse hors convocation (avion/bateau en
    // « situations spéciales », sans hospitalisation/ALD/ATMP) reste
    // indécidable sans adresse : `p2_avion_orientation_caisse` exige
    // `p2_qualification_trajet_complete`, qui exige les deux adresses. Ce
    // n'est pas une adresse cachée : c'est la question de trajet ordinaire,
    // posée quelle que soit l'issue. Rien à retirer ici.
    const situation: Situation<string> = {
      ...sans(CAISSE_SANS_ADRESSE, CHAMPS_DE_CONVOCATION),
      p1_autonomie:
        "'Nécessite une prise en charge spécifique pendant le trajet, une aide d’un professionnel pour se déplacer ou, en l’absence d’un proche accompagnant, pour transmettre les informations nécessaires à l’équipe soignante.'",
      p1_critere_oxygene: "oui",
      p1_critere_aucun: "non",
      p2_raison_principale: "'Consultation médicale'",
      p2_special_avion_bateau: "oui",
      p2_special_aucune: "non",
    };

    const resultat = moteurDeTest(situation).evaluate("cible_cas_final");
    expect(Object.keys(resultat.missingVariables ?? {})).not.toEqual([]);
  });
});
