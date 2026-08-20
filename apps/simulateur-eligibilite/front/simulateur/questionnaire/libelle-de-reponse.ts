// Le libellé sous lequel une réponse s'affiche, distinct de la valeur que le
// modèle stocke.

/**
 * Le libellé d'une réponse, prêt à l'affichage : majuscule initiale.
 *
 * Le modèle nomme certaines possibilités en minuscule — les trois d'A4.1
 * (`'aller simple'`, `'aller-retour identique'`, `'aller-retour différent'`)
 * se lisent dans une phrase, pas en tête d'un bouton radio. La valeur, elle,
 * reste celle du modèle : c'est elle qui part au moteur puis au CERFA, et la
 * capitaliser romprait les comparaisons `p2_trajet_aller_retour = '…'`.
 */
export function libelleDeReponse(libelle: string): string {
  return libelle.charAt(0).toLocaleUpperCase("fr") + libelle.slice(1);
}
