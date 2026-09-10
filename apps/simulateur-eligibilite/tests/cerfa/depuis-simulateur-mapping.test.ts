// `saisiesDepuisSituation` (PMT) : les champs que la spec 0007 vient brancher
// sur le mapping documentaire, et qui restaient vierges avant elle — l'ALD, le
// mode non professionnalisé, l'exonération du ticket modérateur, la pension
// militaire, les six types de lieu du trajet. `depuis-simulateur.test.ts` garde
// les cas déjà couverts avant ce lot.

import { describe, expect, it } from "vitest";
import { saisiesDepuisSituation } from "../../front/outils-produit/beta/cerfa/pmt/depuis-simulateur.ts";
import { remplirCerfa } from "../../front/outils-produit/beta/cerfa/remplir-cerfa.ts";
import { seedParId } from "../../front/outils-produit/seeds/catalogue.ts";
import { situationDe } from "../../front/outils-produit/seeds/seed.ts";
import { moteurDeTest } from "../simulateur/moteur.ts";
import {
  GABARIT,
  HOSPITALISATION,
  PROCHE_ACCOMPAGNANT,
  relire,
  situation,
} from "./gabarit.ts";

describe("saisiesDepuisSituation — cases branchées sur le mapping (0007)", () => {
  it("coche « ALD exo » selon la validation et le type d'ALD", async () => {
    // Validée (un critère caractérise l'incapacité) et exonérante : « Oui ».
    const exonérante = situation({
      p1_autonomie: PROCHE_ACCOMPAGNANT,
      p1_m0_ald: "oui",
      p1_m0_aucun: "non",
      p1_type_ald: "'Exonérante'",
    });
    expect(
      (
        await relire(
          await remplirCerfa(
            GABARIT,
            saisiesDepuisSituation(moteurDeTest(), exonérante),
          ),
        )
      )["ALD exo"],
    ).toBe("/OUI");

    // Validée, non exonérante (le type par défaut du catalogue) : « Non ».
    const nonExonérante = situationDe(
      seedParId("prescripteur-ald-proche-accompagnant"),
    );
    expect(
      (
        await relire(
          await remplirCerfa(
            GABARIT,
            saisiesDepuisSituation(moteurDeTest(), nonExonérante),
          ),
        )
      )["ALD exo"],
    ).toBe("/NON");

    // Déclarée mais non validée (aucune incapacité ni séance) : aucune case.
    // Le droit reste ouvert par ailleurs — hospitalisation, ici.
    const déclaréeSansValidation = situationDe(
      seedParId("secretariat-ald-non-retenue-autre-motif"),
    );
    const lu = await relire(
      await remplirCerfa(
        GABARIT,
        saisiesDepuisSituation(moteurDeTest(), déclaréeSansValidation),
      ),
    );
    expect(lu).not.toHaveProperty("ALD exo");
  });

  it("coche « transp indiv » ou « transp terres », jamais les deux ni aucun", async () => {
    const individuel = situationDe(
      seedParId("prescripteur-vehicule-personnel"),
    );
    const luIndividuel = await relire(
      await remplirCerfa(
        GABARIT,
        saisiesDepuisSituation(moteurDeTest(), individuel),
      ),
    );
    expect(luIndividuel["transp indiv"]).toBe("/On");
    expect(luIndividuel).not.toHaveProperty("transp terres");

    const collectif = situation({
      ...HOSPITALISATION,
      p1_mode_non_professionnalise: "'Transports en commun'",
    });
    const luCollectif = await relire(
      await remplirCerfa(
        GABARIT,
        saisiesDepuisSituation(moteurDeTest(), collectif),
      ),
    );
    expect(luCollectif["transp terres"]).toBe("/On");
    expect(luCollectif).not.toHaveProperty("transp indiv");

    // Un mode professionnalisé — l'ambulance de la seed principale — ne coche
    // ni l'un ni l'autre : ce ne sont pas des cases par défaut.
    const ambulance = situationDe(seedParId("secretariat-prescription"));
    const luAmbulance = await relire(
      await remplirCerfa(
        GABARIT,
        saisiesDepuisSituation(moteurDeTest(), ambulance),
      ),
    );
    expect(luAmbulance).not.toHaveProperty("transp indiv");
    expect(luAmbulance).not.toHaveProperty("transp terres");
  });

  it("coche l'exonération du ticket modérateur et la pension militaire quand la cible est vraie", async () => {
    // Rien ne les tranche à « rien » dans ce tableau : les deux mosaïques que
    // le modèle leur fait porter (`p2_tm_pmt`, `p2_contextes_complementaires`)
    // conditionnent elles-mêmes l'aboutissement du parcours à un cas final.
    // Un cas final « prescription médicale de transport » les a donc toujours
    // tranchées, l'une comme l'autre — vraies ou explicitement fausses. Le
    // test de la seed principale (`depuis-simulateur.test.ts`) montre déjà le
    // côté « explicitement faux ».
    const pensionMilitaire = situation({
      ...HOSPITALISATION,
      p2_contexte_pension_militaire: "oui",
      p2_contexte_aucun: "non",
    });
    const luPension = await relire(
      await remplirCerfa(
        GABARIT,
        saisiesDepuisSituation(moteurDeTest(), pensionMilitaire),
      ),
    );
    expect(luPension.oui2).toBe("/OUI");

    const exonérationTicketModérateur = situation({
      ...HOSPITALISATION,
      p2_tm_pmt_acte: "oui",
      p2_tm_pmt_aucun: "non",
    });
    const luExonération = await relire(
      await remplirCerfa(
        GABARIT,
        saisiesDepuisSituation(moteurDeTest(), exonérationTicketModérateur),
      ),
    );
    expect(luExonération.oui1).toBe("/OUI");
  });

  it("écrit l'adresse composée d'un départ EHPAD et d'une arrivée USLD", async () => {
    // La correction de la 0006, vue depuis le document : trois familles de
    // lieu, six types, et non plus seulement domicile / structure / autre.
    const saisies = saisiesDepuisSituation(
      moteurDeTest(),
      situationDe(seedParId("secretariat-ehpad-vers-usld")),
    );
    const lu = await relire(await remplirCerfa(GABARIT, saisies));

    expect(lu["départ autre lieu"]).toBe(
      "EHPAD Les Tilleuls, 3 rue des Tilleuls, 35000, Rennes",
    );
    expect(lu["arrivée struct soins"]).toBe(
      "USLD du CH, 2 rue de l’Arrivée, 75002, Paris",
    );
    expect(lu).not.toHaveProperty("domicile");
    expect(lu).not.toHaveProperty("domicile_2");
  });

  it("ne produit aucune saisie pour les éléments médicaux, le prescripteur et le transporteur", async () => {
    const saisies = saisiesDepuisSituation(
      moteurDeTest(),
      situationDe(seedParId("secretariat-prescription")),
    );
    const lu = await relire(await remplirCerfa(GABARIT, saisies));

    for (const champ of [
      "comm évent",
      "N et P prescript",
      "raison sociale VSL",
      "adresse VSL",
      "fait à",
      "date1",
      "n° ident",
    ]) {
      expect(lu, champ).not.toHaveProperty(champ);
    }
  });
});
