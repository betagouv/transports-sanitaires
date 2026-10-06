// Le texte qui ne tient pas dans son champ, même au plancher de lisibilité.
// Levée par le remplissage, à rattraper par l'écran qui fait réviser le texte.
//
// Le texte est rendu entier, jamais coupé ni renvoyé à une annexe, et aucun PDF
// ne sort. Le message ne cite pas le texte : ce peut être une donnée de santé,
// et une erreur finit parfois dans une console.

/** Un texte mesuré, trop long pour le champ qui devait le recevoir. */
export class DebordementDuTexte extends Error {
  readonly champ: string;
  readonly texte: string;

  constructor(champ: string, texte: string) {
    super(`Le texte ne tient pas dans le champ « ${champ} ».`);
    this.name = "DebordementDuTexte";
    this.champ = champ;
    this.texte = texte;
  }
}
