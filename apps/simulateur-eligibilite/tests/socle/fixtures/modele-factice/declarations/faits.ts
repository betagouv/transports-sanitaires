// Les faits du modèle factice : ce que ses règles reçoivent.

export type Faits = {
  /** La boisson commandée, en toutes lettres. `null` : aucune. */
  boisson: string | null;
  /** Ce qui l'accompagne, en toutes lettres. */
  accompagnements: readonly string[];
};
