// Les deux outils qui partagent le moteur derrière l'écran-porte : le parcours
// médical du **prescripteur** et le parcours administratif du **secrétariat**.
//
// Type isolé de `App.tsx` à dessein : `seeds/` en a besoin, et le faire dépendre
// d'un fichier `.tsx` embarquait tout le front dans les projets qui n'ont pas JSX —
// le script `scripts/apercu-cerfa.ts`, côté Node, notamment.
export type Outil = "prescripteur" | "secretariat";
