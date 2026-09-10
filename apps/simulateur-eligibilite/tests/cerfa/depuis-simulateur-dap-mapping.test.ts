// `saisiesDepuisSituation` (DAP) : les champs que la spec 0008 vient brancher
// sur le mapping documentaire, et qui restaient vierges — faux, ou dérivés à la
// main — avant elle. `depuis-simulateur-dap.test.ts` garde les cas déjà couverts
// avant ce lot.

import { describe, expect, it } from "vitest";
import { saisiesDepuisSituation } from "../../front/outils-produit/beta/cerfa/dap/depuis-simulateur.ts";
import { remplirCerfa } from "../../front/outils-produit/beta/cerfa/remplir-cerfa.ts";
import { dateDePrescription } from "../../front/simulateur/secretariat/date-de-prescription.ts";
import { moteurDeTest } from "../simulateur/moteur.ts";
import {
  AIDE_PROFESSIONNEL,
  GABARIT_DAP,
  PROCHE_ACCOMPAGNANT,
  relire,
  situation,
} from "./gabarit.ts";

const depuisLaSituation = async (entrées: Record<string, string>) =>
  relire(
    await remplirCerfa(
      GABARIT_DAP,
      saisiesDepuisSituation(moteurDeTest(), situation(entrées)),
    ),
  );

describe("saisiesDepuisSituation — cases branchées sur le mapping (0008)", () => {
  // Les quatre états de `sit`, relevés par introspection : le nom ne dit pas le
  // sens (`/non` vaut « ALD exonérante »). Un `it` par situation plutôt qu'un
  // seul groupant les trois : chacun reconstruit le moteur depuis le YAML
  // (`moteurDeTest`), et les regrouper approchait le délai par défaut de 5 s.
  it("coche « sit » en « /non » sur une ALD validée exonérante", async () => {
    const lu = await depuisLaSituation({
      p1_autonomie: PROCHE_ACCOMPAGNANT,
      p1_m0_ald: "oui",
      p1_m0_aucun: "non",
      p1_type_ald: "'Exonérante'",
      p2_special_avion_bateau: "oui",
      p2_special_aucune: "non",
    });
    expect(lu.sit).toBe("/non");
    expect(lu["bat ou av"]).toBe("/Oui");
    // `ald` (Rubrique ②) suit `lien_ald`, inconditionnel : ALD exonérante le
    // coche même ici, hors de la sous-situation avion ou bateau qui le porte.
    expect(lu.ald).toBe("/Oui");
    // Posée par l'application, hors mapping (`date-de-prescription.ts`) — comme
    // sur le PMT, mais ici sans qu'il faille retirer les séparateurs : le champ
    // fait dix cases et attend `JJ/MM/AAAA`.
    expect(lu["date id"]).toBe(dateDePrescription());
  });

  it("coche « sit » en « /ald » sur une ALD validée non exonérante", async () => {
    const lu = await depuisLaSituation({
      p1_autonomie: PROCHE_ACCOMPAGNANT,
      p1_m0_ald: "oui",
      p1_m0_aucun: "non",
      p1_type_ald: "'Non exonérante'",
      p2_special_avion_bateau: "oui",
      p2_special_aucune: "non",
    });
    expect(lu.sit).toBe("/ald");
  });

  it("coche « sit » en « /atmp » sur un accident du travail ou une maladie professionnelle", async () => {
    const lu = await depuisLaSituation({
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      p1_critere_aucun: "non",
      p2_special_avion_bateau: "oui",
      p2_special_aucune: "non",
      p2_contexte_at_mp: "oui",
      p2_contexte_aucun: "non",
      p2_date_at_mp: "'2026-02-03'",
    });
    expect(lu.sit).toBe("/atmp");
    expect(lu["dat at"]).toBe("03022026"); // huit cases, sans séparateur
    // `ald` suit ensuite `lien_atmp` : ni l'un ni l'autre ALD n'est en cause.
    expect(lu.ald).toBe("/non");
    expect(lu["date atmp 2"]).toBe("03022026");
  });

  it("part quand même sans sous-situation avion ou bateau imprimable", async () => {
    // Décision 3 : le README du mapping documentaire demande de bloquer la
    // génération dans ce cas. L'application ne le fait pas — `bat ou av` se
    // coche, `sit` reste vierge, et aucune erreur ne remonte. Atteint ici par une
    // permission spéciale : elle satisfait la sous-situation côté modèle sans
    // qu'aucune des quatre situations de `sit` ne soit vraie.
    const lu = await depuisLaSituation({
      p2_raison_principale: "'Permission temporaire de sortie'",
      p2_permission_age: "'De 16 à 19 ans'",
      p2_permission_rang_jour: "15",
      p2_permission_duree_heures: "8",
      p2_special_avion_bateau: "oui",
      p2_special_aucune: "non",
      p2_nombre_transports_permission_dap: "2",
    });
    expect(lu["bat ou av"]).toBe("/Oui");
    expect(lu).not.toHaveProperty("sit");
  });

  it("coche « pers acc » selon la cible propre à l’avion ou au bateau", async () => {
    // Bug corrigé n° 1 : la ligne suit `cible_avion_bateau_accompagnant`, pas la
    // cible générique `cible_accompagnant_necessaire`. Un mineur sans besoin
    // d'accompagnement professionnel ou proche les fait diverger : la première
    // vaut vrai par l'âge, la seconde reste fausse.
    const lu = await depuisLaSituation({
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      p1_critere_aucun: "non",
      p2_raison_principale: "'Entrée en hospitalisation'",
      p2_special_avion_bateau: "oui",
      p2_special_aucune: "non",
      p2_patient_moins_16_ans: "oui",
    });
    expect(lu["pers acc"]).toBe("/Oui");
  });

  it("coche « ti » en « /Oui » pour un moyen individuel", async () => {
    const lu = await depuisLaSituation({
      p2_tranche_distance_trajet_aller: "'Plus de 150 km'",
      p2_justification_longue_distance:
        "'Plateau technique spécialisé indisponible à moins de 150 km.'",
    });
    expect(lu.ti).toBe("/Oui");
  });

  it("coche « ti » en « /non » pour un transport en commun, jamais les deux", async () => {
    const lu = await depuisLaSituation({
      p1_mode_non_professionnalise: "'Transports en commun'",
      p2_tranche_distance_trajet_aller: "'Plus de 150 km'",
      p2_justification_longue_distance:
        "'Plateau technique spécialisé indisponible à moins de 150 km.'",
    });
    expect(lu.ti).toBe("/non");
  });

  it("écrit « nom tra » depuis la cible du document, pas les transports prévus par le prescripteur", async () => {
    // Bug corrigé n° 2 : une permission organisée en aller-retour différent, où
    // les deux nombres divergent réellement — 3 prévus par le prescripteur,
    // 5 couverts par cette DAP.
    const lu = await depuisLaSituation({
      p2_organisation_transports: "'aller-retour différent'",
      p2_nombre_transports_couvert_simulation: "5",
      p2_nombre_transports_prevus: "3",
      p2_tranche_distance_trajet_aller: "'Plus de 150 km'",
      p2_justification_longue_distance:
        "'Plateau technique spécialisé indisponible à moins de 150 km.'",
      p2_depart_nom_lieu: "'Domicile du patient'",
    });
    expect(lu["nom tra"]).toBe("5");
  });

  it("coche « ETM » en « /Oui » sur exonération vraie", async () => {
    const lu = await depuisLaSituation({
      p2_raison_principale: "'Entrée en hospitalisation'",
      p2_tranche_distance_trajet_aller: "'Plus de 150 km'",
      p2_justification_longue_distance:
        "'Plateau technique spécialisé indisponible à moins de 150 km.'",
      p2_tm_dap_acte: "oui",
      p2_tm_dap_aucun: "non",
    });
    expect(lu.ETM).toBe("/Oui");
  });

  it("coche « ETM » en « /NON » sur exonération explicitement fausse", async () => {
    const lu = await depuisLaSituation({
      p2_raison_principale: "'Entrée en hospitalisation'",
      p2_tranche_distance_trajet_aller: "'Plus de 150 km'",
      p2_justification_longue_distance:
        "'Plateau technique spécialisé indisponible à moins de 150 km.'",
      p2_tm_dap_aucun: "oui",
    });
    expect(lu.ETM).toBe("/NON");
  });
});
