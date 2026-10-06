// Le format d'une date dans un champ du CERFA.
//
// Un champ de date a un nombre fixe de cases. Huit cases donnent `JJMMAAAA`, dix
// cases donnent `JJ/MM/AAAA`. Le nombre de cases se lit sur le champ du PDF.

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
