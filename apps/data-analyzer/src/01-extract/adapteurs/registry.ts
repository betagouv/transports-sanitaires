// Registre des adaptateurs de format, indexés par la clé `format` du mapping.
// Ajouter un format = écrire une classe d'adaptateur et l'enregistrer ici.

import type { FormatRegistry } from "../../types.ts";
import { AdapterReferentielRemboursementXlsx } from "./adapteur-referentiel-remboursement-xlsx.ts";
import { AdapterPlateformeFinessTsv } from "./adapteur-plateforme-finess-tsv.ts";
import { AdapterPlateformeFinessXlsx } from "./adapteur-plateforme-finess-xlsx.ts";
import { AdapterPlateformeGhtXlsx } from "./adapteur-plateforme-ght-xlsx.ts";
import { AdapterGhtFhirDatagouv } from "./adapteur-ght-fhir-datagouv.ts";

export const FORMATS: FormatRegistry = {
  "referentiel-remboursement-xlsx": AdapterReferentielRemboursementXlsx,
  "plateforme-finess-tsv": AdapterPlateformeFinessTsv,
  "plateforme-finess-xlsx": AdapterPlateformeFinessXlsx,
  "plateforme-ght-xlsx": AdapterPlateformeGhtXlsx,
  "ght-fhir-datagouv": AdapterGhtFhirDatagouv,
};
