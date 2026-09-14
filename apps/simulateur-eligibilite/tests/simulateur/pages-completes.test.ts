// Une page d'adresse ou une mosaïque se pose en entier, même quand une partie de
// ses champs a déjà sa réponse. Le cas se produit après un retour en arrière : les
// adresses saisies dans une première branche restent dans la situation, et quand
// la page revient, le moteur ne réclame plus que ce qui manque — le complément et
// le pays. Posée ainsi, la page cachait l'adresse sans qu'on puisse la corriger.

import { FormBuilder } from "@publicodes/forms";
import { describe, expect, it } from "vitest";
import { CIBLES_ADMINISTRATIVES } from "../../front/simulateur/cibles-du-parcours";
import { avecEntreesCalculees } from "../../front/simulateur/entrees-calculees";
import { formBuilder } from "../../front/simulateur/questionnaire/constructeur-de-formulaire";
import { pagesDuParcours } from "../../front/simulateur/questionnaire/pagination";
import { PARTIE_1_AMBULANCE } from "./parcours";

const ADRESSE_DE_DEPART = [
  "p2_depart_nom_lieu",
  "p2_depart_adresse",
  "p2_depart_complement_adresse",
  "p2_depart_code_postal",
  "p2_depart_commune",
  "p2_depart_pays",
];

describe("une page qui porte une règle de complétude se pose en entier", () => {
  it("rend les six saisies d'adresse quand seules deux manquent", () => {
    const [page] = pagesDuParcours([
      "p2_depart_complement_adresse",
      "p2_depart_pays",
    ]);
    expect(page?.elements).toEqual(ADRESSE_DE_DEPART);
  });

  it("garde le filtre ailleurs : une étape sans règle de complétude ne pose que ce qui manque", () => {
    expect(pagesDuParcours(["p2_trajet_depart"])).toEqual([
      { elements: ["p2_trajet_depart"] },
    ]);
  });

  it("repose l'adresse déjà saisie quand le type de départ revient après coup", () => {
    const etat = formBuilder.handleInputChange(
      formBuilder.start(
        FormBuilder.newState(avecEntreesCalculees(ADRESSES_SANS_TYPES)),
        ...CIBLES_ADMINISTRATIVES,
      ),
      "p2_trajet_depart",
      "Domicile",
    );

    expect(etat.nextPages[0]?.elements).toEqual(ADRESSE_DE_DEPART);
  });
});

// ---- implémentation ----

// La Partie 2 répondue jusqu'au trajet, adresses comprises, types de lieu non :
// l'état que laisse une première branche où les types ne se posaient pas.
const ADRESSES_SANS_TYPES: Record<string, string> = {
  ...PARTIE_1_AMBULANCE,
  p2_raison_principale:
    "'Soin ou traitement autre qu’une séance de chimiothérapie, de radiothérapie ou de dialyse'",
  p2_depart_nom_lieu: "'Domicile'",
  p2_depart_adresse: "'141 avenue Jean Jaurès'",
  p2_depart_code_postal: "'75019'",
  p2_depart_commune: "'Paris'",
  p2_arrivee_nom_lieu: "'Hôpital'",
  p2_arrivee_adresse: "'1 avenue du Général de Gaulle'",
  p2_arrivee_code_postal: "'10100'",
  p2_arrivee_commune: "'Dijon'",
  p2_motif_detail: "'Consultation de cardiologie'",
  p2_contexte_at_mp: "non",
  p2_contexte_engagement_maternite: "non",
  p2_contexte_retour_penitentiaire: "non",
  p2_contexte_centre_reference: "non",
  p2_contexte_pension_militaire: "non",
  p2_contexte_aucun: "oui",
  p2_transfert_en_cours: "non",
  p2_convocation_ou_avis_type: "'Aucun de ces cas.'",
  p2_transport_urgence: "'Non'",
  p2_special_avion_bateau: "non",
  p2_special_camsp_cmpp: "non",
  p2_special_samsah: "non",
  p2_special_aucune: "oui",
  p2_nombre_transports_prevus: "4",
  p2_organisation_transports: "'aller-retour identique'",
};
