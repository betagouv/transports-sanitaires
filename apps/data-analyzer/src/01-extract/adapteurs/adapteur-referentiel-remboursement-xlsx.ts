// Format « référentiel de remboursement national » (xlsx à double en-tête).
//
// Structure (publique, non identifiante) :
//  - ligne 0 : libellés de période fusionnés du type « …JJ/AA-JJ/AA » (une par année) ;
//  - ligne 1 : colonnes d'identité (finess, nom, ville, département, catégorie) puis, par
//    période, les véhicules répétés ;
//  - données à partir de la ligne 2.
// Ce référentiel ne couvre que le **hors Article 80** (enveloppe posée en dur ici).

import type { EtablissementRow, TrajetRow } from "../../contrats.ts";
import type { Adapter, VehiculeCanonique } from "../../types.ts";
import { num, range, sheet, str } from "./shared.ts";

const LIGNE_PERIODES = 0; // en-tête haut : libellés de période fusionnés
const LIGNE_COLONNES = 1; // en-tête bas : identité + véhicules répétés par période
const PREMIERE_LIGNE_DONNEES = 2;
const SIECLE = 2000; // les périodes notent l'année de fin sur 2 chiffres (« 24 » → 2024)
const PERIODE_ANNEE = /\d{2}\/\d{2}-\d{2}\/(\d{2})/; // capture ces 2 chiffres

const VEHICULE: Record<string, VehiculeCanonique> = {
  Ambulance: "Ambulance",
  VSL: "Assis",
  TP_VSL: "Assis",
  taxi: "Assis",
  "autre mode": "Autre",
};

const ID_LABELS: Record<keyof Omit<EtablissementRow, "score">, string> = {
  finess_juridique: "finess juridique",
  finess_geographique: "finess g",
  nom: "nom de l",
  ville: "ville",
  departement: "département",
  categorie: "catégorie",
};

export const referentielRemboursementXlsx: Adapter = (location, entry) => {
  const ws = sheet(location);
  const { s, e } = range(ws);

  const idCols: Partial<Record<keyof typeof ID_LABELS, number>> = {};
  const valueCols: { c: number; annee: string; vehicule: string }[] = [];
  let annee = "";
  for (let c = s.c; c <= e.c; c++) {
    const match = str(ws, LIGNE_PERIODES, c).match(PERIODE_ANNEE);
    if (match) annee = String(SIECLE + Number(match[1]));

    const label = str(ws, LIGNE_COLONNES, c);
    for (const [key, needle] of Object.entries(ID_LABELS)) {
      const k = key as keyof typeof ID_LABELS;
      if (idCols[k] === undefined && label.toLowerCase().includes(needle)) idCols[k] = c;
    }
    if (annee && VEHICULE[label]) valueCols.push({ c, annee, vehicule: label });
  }

  const trajets: TrajetRow[] = [];
  const etablissements: EtablissementRow[] = [];
  for (let r = PREMIERE_LIGNE_DONNEES; r <= e.r; r++) {
    const finessJur = str(ws, r, idCols.finess_juridique!);
    if (!finessJur) continue;
    const finessGeo = str(ws, r, idCols.finess_geographique!);

    let score = 0;
    for (const { c, annee, vehicule } of valueCols) {
      const nb = num(ws, r, c);
      if (nb <= 0) continue;
      score += nb;
      trajets.push({
        role: entry.role,
        source: entry.label,
        finess_juridique: finessJur,
        finess_geographique: finessGeo,
        ght_libelle: "",
        enveloppe: "Hors Article 80",
        annee,
        vehicule_canonique: VEHICULE[vehicule]!,
        nb_trajets: nb,
      });
    }
    etablissements.push({
      finess_juridique: finessJur,
      finess_geographique: finessGeo,
      nom: str(ws, r, idCols.nom!),
      ville: str(ws, r, idCols.ville!),
      departement: str(ws, r, idCols.departement!),
      categorie: str(ws, r, idCols.categorie!),
      score,
    });
  }
  return { trajets, etablissements };
};
