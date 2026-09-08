// Normalisation d'un numéro finess.
//
// Un finess vaut 9 caractères. Certaines sources le livrent amputé de son zéro de tête,
// parce que la colonne a été stockée en numérique en amont. Sans le zéro, le code ne se
// rapproche plus du référentiel : l'établissement sort sans nom ni ville.

export function normaliserFiness(valeur: string): string {
  if (!TRONQUE.test(valeur)) return valeur;
  return valeur.padStart(LONGUEUR, "0");
}

// ---- implémentation ----

const LONGUEUR = 9;
// Ne rétablit que ce qui est réellement tronqué : un code plus court que 9, fait de
// chiffres, et non nul. Laisse passer le vide et la sentinelle « 0 » (finess non renseigné).
const TRONQUE = /^(?!0+$)\d{1,8}$/;
