// Format « référentiel GHT » (open data data.gouv `etablissements-de-sante-par-ght`).
//
// `location` désigne un dossier de bundles FHIR JSON (un par GHT), aspiré par `fetch-ght`.
// Chaque bundle contient des ressources Organization :
//  - une pour le GHT              (identifiant système …:ght → code + libellé) ;
//  - une par entité juridique     (identifiant système …:ej → finess juridique) rattachée
//    au GHT (partOf → l'Organization du GHT) ;
//  - une par entité géographique  (…:eg), ignorée ici (grain finess juridique).
//
// Sortie : une dimension `finess juridique → GHT` (aucun trajet). Cf. `GhtRattachementRow`.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { GhtRattachementRow } from "../../contrats.ts";
import type { Adapter, AdapterOutput, MappingEntry } from "../../types.ts";

export class AdapterGhtFhirDatagouv implements Adapter {
  readonly #location: string;

  constructor(location: string, _entry: MappingEntry) {
    this.#location = location;
  }

  execute(): AdapterOutput {
    const parJuridique = new Map<string, GhtRattachementRow>();
    for (const fichier of this.#bundles())
      this.#collectBundle(fichier, parJuridique);
    return { trajets: [], ght: [...parJuridique.values()] };
  }

  #bundles(): string[] {
    return readdirSync(this.#location)
      .filter((f) => f.endsWith(".json"))
      .sort() // ordre déterministe : le rattachement « premier gagnant » ne dépend pas du FS
      .map((f) => join(this.#location, f));
  }

  #collectBundle(
    fichier: string,
    parJuridique: Map<string, GhtRattachementRow>,
  ): void {
    const orgs = this.#organizations(fichier);
    const ght = orgs.find((o) => this.#identifiant(o, SUFFIXE_SYSTEME.ght));
    if (!ght) return; // bundle sans GHT : ignoré
    const code = this.#identifiant(ght, SUFFIXE_SYSTEME.ght)!;
    for (const org of orgs)
      this.#collectJuridique(org, code, ght.name ?? "", parJuridique);
  }

  #collectJuridique(
    org: Organization,
    ghtCode: string,
    ghtLibelle: string,
    parJuridique: Map<string, GhtRattachementRow>,
  ): void {
    const finess = this.#identifiant(org, SUFFIXE_SYSTEME.ej);
    if (!finess || !FINESS_VALIDE.test(finess) || parJuridique.has(finess))
      return; // pas une EJ valide, ou déjà vue
    parJuridique.set(finess, {
      finess_juridique: finess,
      ght_code: ghtCode,
      ght_libelle: ghtLibelle,
      region: this.#region(ghtCode),
      raison_sociale: org.name ?? "",
    });
  }

  #organizations(fichier: string): Organization[] {
    const bundle = JSON.parse(readFileSync(fichier, "utf8")) as Bundle;
    return (bundle.entry ?? [])
      .map((e) => e.resource)
      .filter((r): r is Organization => r?.resourceType === "Organization");
  }

  #identifiant(org: Organization, suffixe: string): string | undefined {
    return org.identifier?.find((i) => i.system?.endsWith(suffixe))?.value;
  }

  #region(ghtCode: string): string {
    return ghtCode.replace(/^ght-/, "").split("-")[0] ?? "";
  }
}

// ---- implémentation ----

const SUFFIXE_SYSTEME = { ght: ":ght", ej: ":ej" } as const; // urn:fr-gouv-sante[-finess]:{ght,ej}
// FINESS = 9 caractères : 2 de département (dont 2A/2B pour la Corse) + 7 chiffres.
// Écarte les identifiants cassés de la source (ex. « nan ») sans perdre la Corse.
const FINESS_VALIDE = /^(\d{2}|2[AB])\d{7}$/;

// Sous-ensemble FHIR effectivement lu (le reste du bundle est ignoré).
interface Bundle {
  entry?: { resource?: Resource }[];
}
interface Resource {
  resourceType?: string;
}
interface Organization extends Resource {
  name?: string;
  identifier?: { system?: string; value?: string }[];
}
