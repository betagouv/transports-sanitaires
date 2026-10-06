// Le format d'une date écrite dans un champ du CERFA.
//
// Sur un CERFA, un champ de date est **peigné** : un cadre à cases fixes, le
// plus souvent huit. `remplir-cerfa.ts` refuse toute valeur plus longue que le
// champ : y écrire un séparateur sur huit cases dépasserait de deux caractères.
//
// La règle : huit cases donnent `JJMMAAAA`, dix cases donnent `JJ/MM/AAAA`. Le
// nombre de cases se lit sur le champ du PDF.

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
