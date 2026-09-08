// La colonne `plateforme` des marts : d'où vient le numérateur d'une cellule.
//
// Le nom lui-même vient de `mapping.json` (cf. `mapping.ts`), jamais du code. Ici on ne
// sait que deux choses : une cellule peut en agréger plusieurs, et la valeur doit être
// stable d'une exécution à l'autre pour que deux publications se comparent.

export function joindrePlateformes(noms: Set<string>): string {
  return [...noms].sort().join(SEPARATEUR);
}

export function separerPlateformes(valeur: string): string[] {
  return valeur.split(SEPARATEUR).filter(Boolean);
}

// ---- implémentation ----

// Masquer la deuxième plateforme d'une cellule reviendrait à mentir sur l'origine du
// chiffre : on les joint. L'espace autour du « + » les garde lisibles dans Grist.
const SEPARATEUR = " + ";
