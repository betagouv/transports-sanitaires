// TS973-11 : une adresse déjà saisie perd son sens si le lieu qu'elle décrit
// change de type entre deux saisies. Ce fichier verrouille `avecLieuInvalide`
// directement, sur des situations déjà passées par `avecEntreesCalculees`
// (c'est ce que `recalcul.ts` lui passe).

import type { Situation } from "publicodes";
import { describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { avecEntreesCalculees } from "../../front/simulateur/entrees-calculees";
import { moteur } from "../../front/simulateur/moteur";
import { avecLieuInvalide } from "../../front/simulateur/questionnaire/invalidation-lieu";

const MAINTENANT = new Date("2026-09-08T10:00:00Z");

// `avecCalculs` positionne `moteur` sur la situation courante avant d'appeler
// `avecLieuInvalide` ; ce test le fait à sa place.
const invalide = (apres: Situation<string>, avant: Situation<string>) =>
  avecLieuInvalide(moteur.setSituation(apres), apres, avant);

// Une arrivée répondue en EHPAD, distincte de toute valeur qu'une déduction
// produirait : un changement de type est donc non équivoque à repérer.
const AVEC_ADRESSES = avecEntreesCalculees(
  { ...BASE_NEUTRE, p2_trajet_arrivee: "'EHPAD'" },
  MAINTENANT,
);

// « Entrée en hospitalisation » déduit l'arrivée en « Structure de soins »,
// sans toucher au départ (resté « Domicile », répondu comme dans la base).
const ARRIVEE_DESORMAIS_DEDUITE = avecEntreesCalculees(
  {
    ...BASE_NEUTRE,
    p2_trajet_arrivee: "'EHPAD'",
    p2_raison_principale: "'Entrée en hospitalisation'",
  },
  MAINTENANT,
);

describe("TS973-11, l'adresse d'un lieu qui change de type est invalidée", () => {
  it("retire l'adresse d'arrivée quand son type déduit change", () => {
    const resultat = invalide(ARRIVEE_DESORMAIS_DEDUITE, AVEC_ADRESSES);
    expect(resultat.p2_arrivee_nom_lieu).toBeUndefined();
    expect(resultat.p2_arrivee_adresse).toBeUndefined();
    expect(resultat.p2_arrivee_code_postal).toBeUndefined();
    expect(resultat.p2_arrivee_commune).toBeUndefined();
  });

  it("laisse l'adresse de départ intacte quand seule l'arrivée change de type", () => {
    const resultat = invalide(ARRIVEE_DESORMAIS_DEDUITE, AVEC_ADRESSES);
    expect(resultat.p2_depart_adresse).toBe(AVEC_ADRESSES.p2_depart_adresse);
    expect(resultat.p2_depart_code_postal).toBe(
      AVEC_ADRESSES.p2_depart_code_postal,
    );
  });

  it("ne retire rien quand le type de lieu ne change pas", () => {
    const memeSituation = avecEntreesCalculees(
      {
        ...BASE_NEUTRE,
        p2_trajet_arrivee: "'EHPAD'",
        p2_motif_detail: "'Autre motif'",
      },
      MAINTENANT,
    );
    const resultat = invalide(memeSituation, AVEC_ADRESSES);
    expect(resultat.p2_arrivee_adresse).toBe(AVEC_ADRESSES.p2_arrivee_adresse);
    expect(resultat.p2_depart_adresse).toBe(AVEC_ADRESSES.p2_depart_adresse);
  });

  it("retire l'adresse d'arrivée quand elle cesse d'être déduite", () => {
    // Le motif change pour une raison qui ne déduit plus l'arrivée : la
    // question rouvre, sans réponse (`p2_trajet_arrivee` retiré, comme le
    // ferait le prescripteur qui n'a jamais eu à y répondre pendant que le
    // lieu était déduit).
    const { p2_trajet_arrivee: _ignore, ...sansTypeArrivee } = {
      ...BASE_NEUTRE,
      p2_raison_principale: "'Consultation médicale'",
    };
    const arriveeRedevientQuestion = avecEntreesCalculees(
      sansTypeArrivee,
      MAINTENANT,
    );
    const resultat = invalide(
      arriveeRedevientQuestion,
      ARRIVEE_DESORMAIS_DEDUITE,
    );
    expect(resultat.p2_arrivee_adresse).toBeUndefined();
    expect(resultat.p2_arrivee_code_postal).toBeUndefined();
    expect(resultat.p2_arrivee_commune).toBeUndefined();
  });

  it("ne retire rien quand le lieu précédent n'était pas encore tranché", () => {
    // Situation vide : aucun type de lieu ne se déduit ni ne se lit encore,
    // donc rien à comparer à la nouvelle situation.
    const avantTrajet = avecEntreesCalculees({}, MAINTENANT);
    const resultat = invalide(AVEC_ADRESSES, avantTrajet);
    expect(resultat.p2_arrivee_adresse).toBe(AVEC_ADRESSES.p2_arrivee_adresse);
    expect(resultat.p2_depart_adresse).toBe(AVEC_ADRESSES.p2_depart_adresse);
  });
});
