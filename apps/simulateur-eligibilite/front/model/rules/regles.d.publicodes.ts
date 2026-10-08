// Le type de `regles.publicodes`, vu du code. Le fichier est du YAML : Vite le
// convertit en objet à la compilation (`vite.config.ts`), et aucun analyseur
// YAML ne part dans le navigateur.

import type { RawPublicodes } from "publicodes";

/** Les règles de l'éditeur, par nom : les faits, puis les cibles. */
export declare const rules: RawPublicodes<string>;
