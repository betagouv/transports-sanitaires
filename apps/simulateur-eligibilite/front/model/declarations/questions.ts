// Les questions du modèle, sous l'identifiant que l'éditeur leur donne, et le
// type de la réponse de chacune. Une option se répond par son numéro dans le
// catalogue de l'éditeur.

export type Questions = {
  /** Quel est votre besoin ? */
  "Q0.1": "1" | "2";
  /** Concernant son déplacement, le patient : */
  "Q1.1": "1" | "2" | "3";
  /** Quelles aides ou conditions particulières sont nécessaires pendant le transport ? */
  "Q1.2": readonly (
    | "1"
    | "2"
    | "3"
    | "4"
    | "5"
    | "6"
    | "7"
    | "8"
    | "9"
    | "10"
    | "11"
  )[];
  /** Les cas particuliers concernant le patient. « 7 » : aucun. */
  "Q1.3": readonly ("1" | "2" | "3" | "4" | "5" | "6" | "7")[];
  /** La préférence du patient en matière de transport. */
  "Q1.4": "1" | "2";
};
