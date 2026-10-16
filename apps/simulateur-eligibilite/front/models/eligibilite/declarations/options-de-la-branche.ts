// Les options de la page de branche (Q2.12 à Q2.14), dans l'ordre du catalogue.

export const OPTIONS_DE_LA_BRANCHE = {
  /**
   * D’où part le patient pour ce trajet ? Les libellés viennent de
   * `QUESTIONS_P2_LIBELLES_2026-10-15.json`, clé `Q2.13.depart`.
   */
  "Q2.13.depart": {
    "1_DOMICILE": "De son domicile ou d’un autre lieu de vie.",
    "2_ETABLISSEMENT_DE_SANTE": "D’un établissement de santé.",
    "3_EHPAD": "D’un EHPAD.",
    "4_USLD": "D’une unité de soins de longue durée (USLD).",
    "5_HEBERGEMENT_NON_MEDICALISE":
      "D’un hébergement temporaire non médicalisé.",
    "6_ETABLISSEMENT_PENITENTIAIRE": "D’un établissement pénitentiaire.",
    "7_AUTRE_LIEU": "D’un autre lieu.",
  },
  /**
   * « Engagement maternité » : le dispositif est-il établi pour la maternité
   * éloignée ? (Q2.14, premier point du catalogue.)
   */
  "Q2.14.1": {
    "1_OUI": "Oui.",
    "2_NON": "Non.",
  },
  /**
   * Le rattachement d’un HTNM déjà déclaré (Q2.14, deuxième point). Jamais de
   * « Non » : l’existence du HTNM est acquise.
   */
  "Q2.14.2": {
    "1_DANS_L_ENGAGEMENT": "Dans l’Engagement maternité.",
    "2_HORS_ENGAGEMENT": "Hors Engagement maternité.",
  },
  /**
   * Le médecin prescripteur atteste-t-il que ce transport est urgent ? Même
   * question que Q2.3.4, réutilisée sur la page de branche (Q2.12).
   */
  "Q2.12": {
    "1_OUI": "Oui.",
    "2_NON": "Non.",
  },
} as const;
