// Le format d'une date dans un champ du CERFA.
//
// Un champ de date a un nombre fixe de cases. Huit cases donnent `JJMMAAAA`, dix
// cases donnent `JJ/MM/AAAA`. Le nombre de cases se lit sur le champ du PDF.

/**
 * La date ISO (`AAAA-MM-JJ`), écrite selon le `boxCount` du champ. Une
 * valeur qui n'a pas la forme ISO ressort telle quelle : un champ vide ne doit
 * pas devenir `00000000`.
 */
export function formatDateForField(iso: string, boxCount: number): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return iso;
  return boxCount === 10 ? `${day}/${month}/${year}` : `${day}${month}${year}`;
}
