// L'erreur levée quand un texte ne tient pas dans son champ, même à la plus
// petite taille lisible. L'écran la rattrape pour faire réviser le texte.
//
// Le message ne cite pas le texte : ce peut être une donnée de santé.

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
