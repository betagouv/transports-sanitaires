// Registre des adaptateurs de format, indexés par la clé `format` du mapping.
// Ajouter un format = écrire un adaptateur et l'enregistrer ici.

import type { Adapter } from "../../types.ts";
import { referentielRemboursementXlsx } from "./adapteur-referentiel-remboursement-xlsx.ts";
import { plateformeFinessTsv } from "./adapteur-plateforme-finess-tsv.ts";
import { plateformeGhtXlsx } from "./adapteur-plateforme-ght-xlsx.ts";

export const FORMATS: Record<string, Adapter> = {
  "referentiel-remboursement-xlsx": referentielRemboursementXlsx,
  "plateforme-finess-tsv": plateformeFinessTsv,
  "plateforme-ght-xlsx": plateformeGhtXlsx,
};
