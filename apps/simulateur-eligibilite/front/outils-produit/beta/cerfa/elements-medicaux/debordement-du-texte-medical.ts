// Le texte médical qui ne tient pas dans sa rubrique, même au plancher de
// lisibilité (contrat EM-2). Levée par le remplissage, rattrapée par
// `BoutonCerfa`, qui fait réviser le texte (`ReviserLeTexteMedical.tsx`).
//
// Réencode l'état `overflow` de `medicalPrintPlan` (v9.7.3) : le texte est
// rendu entier, jamais coupé ni renvoyé à une annexe, et aucun PDF ne sort.
// Le message ne cite pas le texte : c'est une donnée de santé, et une erreur
// finit parfois dans une console.

/** Le texte médical composé ou révisé, trop long pour sa rubrique. */
export class DebordementDuTexteMedical extends Error {
  readonly texte: string;

  constructor(texte: string) {
    super("Le texte médical ne tient pas dans sa rubrique.");
    this.name = "DebordementDuTexteMedical";
    this.texte = texte;
  }
}
