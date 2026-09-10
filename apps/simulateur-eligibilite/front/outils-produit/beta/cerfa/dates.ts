// Le format d'une date écrite dans un champ du CERFA.
//
// Le mapping documentaire annonce `date_fr`, soit `DD/MM/YYYY`. Relevé par
// introspection sur les trois gabarits, tous les champs de date sont **peignés**
// — un cadre à cases fixes, la plupart à huit —, et `remplir-cerfa.ts` refuse
// toute valeur plus longue que le champ. Y écrire un séparateur sur un champ à
// huit cases dépasserait donc de deux caractères.
//
// La règle retenue : huit cases donnent `JJMMAAAA`, dix cases donnent
// `JJ/MM/AAAA`. Deux champs seulement sont à dix, `date id` et `date fait` sur la
// DAP. Le nombre de cases se lit sur le champ du PDF ; il ne se déclare pas dans
// le tableau de remplissage.

/**
 * La date ISO (`AAAA-MM-JJ`) écrite comme le champ à `nombreDeCases` l'impose.
 * Une valeur qui n'a pas la forme ISO ressort telle quelle plutôt que découpée de
 * travers — un champ vide, notamment, ne doit pas devenir `00000000`.
 */
export function dateSurLeChamp(iso: string, nombreDeCases: number): string {
  const [annee, mois, jour] = iso.split("-");
  if (!annee || !mois || !jour) return iso;
  return nombreDeCases === 10
    ? `${jour}/${mois}/${annee}`
    : `${jour}${mois}${annee}`;
}
