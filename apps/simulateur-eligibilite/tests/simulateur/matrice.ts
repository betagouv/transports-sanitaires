// Rejouer une part de la matrice de non-régression du livrable.
//
// Le livrable énonce ses scénarios en prose ; ils sont réencodés en `given` /
// `expect`, un cas par scénario, et répartis par sujet dans les fichiers voisins
// — le droit ouvert et le mode médical, la charge de l'établissement, l'accord
// préalable et le trajet. Ce module est ce qu'ils partagent : la forme d'un cas,
// et la façon de le jouer.
//
// L'identifiant du livrable est le nom du test : c'est lui qu'on cite quand un
// désaccord doit remonter au fournisseur du modèle.

import { expect, it } from "vitest";
import { evalue, type Reponses } from "./situations-v9-5-1";

/** Un scénario : des réponses, et ce que le modèle doit en tirer. */
export type Cas = {
  id: string;
  given: Reponses;
  expect: Record<string, unknown>;
};

/** Un `it` par scénario, sous l'identifiant que le livrable lui donne. */
export function rejouerLaMatrice(matrice: readonly Cas[]) {
  for (const cas of matrice)
    it(cas.id, () => {
      const moteur = evalue(cas.given);
      for (const [regle, attendu] of Object.entries(cas.expect))
        expect(moteur.evaluate(regle).nodeValue, `${cas.id} — ${regle}`).toBe(
          attendu,
        );
    });
}
