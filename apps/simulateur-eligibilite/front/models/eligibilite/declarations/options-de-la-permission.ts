// Les options de la permission (Q2.7 et Q2.8), sous le même format que `OPTIONS`
// (`questions.ts`) : le slug de chaque option, et son libellé du catalogue.

export const OPTIONS_DE_LA_PERMISSION = {
  /**
   * Dans quelle tranche d’âge se situe le patient pendant la période prescrite
   * et quel est le cadre de la permission ?
   */
  "Q2.7": {
    "1_MOINS_DE_SEIZE_ANS": "Moins de 16 ans.",
    "2_SEIZE_A_DIX_NEUF_ANS": "De 16 à 19 ans.",
    "3_ADULTE_AUTORISEE":
      "20 ans ou plus : permission autorisée, liée aux soins ou à l’organisation de l’établissement.",
    "4_ADULTE_A_SA_CHARGE":
      "20 ans ou plus : transport exceptionnel demandé par écrit par le patient, sans fondement médical, pouvant lui être facturé.",
  },
  /** La confirmation de l'option 4 de Q2.7, nommée par nous (D-107). */
  "Q2.7.a": {
    "1_OUI": "Oui, les conditions de facturation ont été vérifiées.",
    "2_NON": "Non.",
    "3_NE_SAIT_PAS": "Je ne peux pas le vérifier.",
  },
  /** L'autorisation de la permission, sous-question de Q2.8 (D-107). */
  "Q2.8.4": {
    "1_OUI": "Oui.",
    "2_NON": "Non.",
    "3_NE_SAIT_PAS": "Je ne peux pas le vérifier.",
  },
  /** Quel est le cadre de cette permission ? */
  "Q2.8.4.a": {
    "1_SOINS": "Elle est liée aux soins du patient.",
    "2_ORGANISATION": "Elle est liée à l’organisation de l’établissement.",
    "3_DEMANDE_PERSONNELLE":
      "Elle répond à une demande personnelle du patient.",
  },
  /** La prescription couvre-t-elle plusieurs permissions ? */
  "Q2.8.5": {
    "1_OUI": "Oui.",
    "2_NON": "Non.",
  },
  /** Le patient restera-t-il âgé de moins de 20 ans durant toute la période ? */
  "Q2.8.6.b": {
    "1_OUI": "Oui.",
    "2_NON": "Non.",
  },
} as const;
