// TS973-16 : toute modification réelle d'une réponse efface les réponses des
// étapes suivantes (`state.on_change` du contrat d'interface). Revenir sans
// rien changer, ou répondre pour la première fois, n'efface rien.

import { FormBuilder } from "@publicodes/forms";
import { describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { formBuilder } from "../../front/simulateur/questionnaire/constructeur-de-formulaire";
import {
  avecReponse,
  avecReponses,
} from "../../front/simulateur/questionnaire/reponse-unique";

const etatDe = (situation: Record<string, string>) =>
  formBuilder.start(FormBuilder.newState(situation), "cible_cas_final");

describe("TS973-16, une réponse modifiée efface l'aval", () => {
  it("hors transfert : le type de départ efface adresses, distance et précision", () => {
    const apres = avecReponse(etatDe(BASE_NEUTRE), "p2_trajet_depart", "EHPAD");
    expect(apres.situation.p2_trajet_depart).toBe("'EHPAD'");
    for (const aval of [
      "p2_trajet_arrivee",
      "p2_depart_adresse",
      "p2_tranche_distance_trajet_aller",
      "p2_motif_detail",
    ])
      expect(apres.situation[aval], aval).toBeUndefined();
    // L'amont reste.
    expect(apres.situation.p2_raison_principale).toBe(
      BASE_NEUTRE.p2_raison_principale,
    );
    expect(apres.situation.p2_nature_transfert).toBe(
      BASE_NEUTRE.p2_nature_transfert,
    );
  });

  it("une mosaïque modifiée efface l'aval", () => {
    const apres = avecReponses(etatDe(BASE_NEUTRE), [
      ["p2_contexte_at_mp", true],
      ["p2_contexte_aucun", false],
    ]);
    expect(apres.situation.p2_transport_urgence).toBeUndefined();
    expect(apres.situation.p2_trajet_depart).toBeUndefined();
  });

  it("la même réponse n'efface rien", () => {
    const apres = avecReponse(
      etatDe(BASE_NEUTRE),
      "p2_trajet_depart",
      "Domicile",
    );
    expect(apres.situation.p2_depart_adresse).toBe(
      BASE_NEUTRE.p2_depart_adresse,
    );
  });

  it("une première réponse n'efface rien", () => {
    const { p2_trajet_depart, ...sansDepart } = BASE_NEUTRE;
    const apres = avecReponse(etatDe(sansDepart), "p2_trajet_depart", "EHPAD");
    expect(apres.situation.p2_depart_adresse).toBe(
      BASE_NEUTRE.p2_depart_adresse,
    );
  });
});
