// L'erreur levée quand un texte ne tient pas dans son champ, même à la plus
// petite taille lisible. L'écran la rattrape pour faire réviser le texte.
//
// Le message ne cite pas le texte : ce peut être une donnée de santé.

/** Un texte mesuré, trop long pour le champ qui devait le recevoir. */
export class TextOverflowError extends Error {
  readonly field: string;
  readonly text: string;

  constructor(field: string, text: string) {
    super(`Le texte ne tient pas dans le champ « ${field} ».`);
    this.name = "TextOverflowError";
    this.field = field;
    this.text = text;
  }
}
