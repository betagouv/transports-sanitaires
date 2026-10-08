// Les questions du modèle factice, et le type de la réponse de chacune.

export type Questions = {
  boisson: "the" | "cafe" | "rien";
  accompagnements: readonly ("lait" | "sucre" | "aucun")[];
  quantite: number;
};
