// Le référentiel, lu et complété dans un doc Grist. Côté serveur uniquement.
// Voir docs/knowledge/adr/identification.md, ADR-5.
//
// Tables Grist :
//   Etablissements   : Id2 (Int), Nom (Text)
//   Services_Unites  : Id2, Nom, Etablissement (Ref:Etablissements)
//
// `etabId` et `serviceId` sont la colonne Id2. Une colonne de référence stocke le
// rowId Grist, pas l'Id2 : on convertit donc l'Id2 en rowId avant de filtrer.

import {
  normalise,
  type RattachementSaisi,
} from "../../shared/rattachement-saisi.ts";
import type {
  Etablissement,
  Referentiel,
  Service,
} from "../../shared/referentiel.ts";
import type { DocGrist } from "./lignes-grist.ts";
import { creerLigne, lignes, ouvrirDoc, texte } from "./lignes-grist.ts";

export type GristConfig = {
  /** Base API du doc, ex. https://…/api/docs/<docId> */
  docUrl: string;
  cleApi: string;
};

export function creerReferentielGrist({
  docUrl,
  cleApi,
}: GristConfig): Referentiel {
  const doc = ouvrirDoc(docUrl, cleApi);
  return {
    listerEtablissements: () => etablissements(doc),
    listerServices: (etabId) => services(doc, etabId),
    enrichirDepuisSaisie: (saisie) => enrichir(doc, saisie),
  };
}

// ---- implémentation ----

async function etablissements(doc: DocGrist): Promise<Etablissement[]> {
  return (await lignes(doc, TABLE.etablissements))
    .map((r) => ({
      id: texte(r.fields[COL.id]),
      libelle: texte(r.fields[COL.nom]),
    }))
    .filter((e) => e.id && e.libelle);
}

async function services(doc: DocGrist, etabId: string): Promise<Service[]> {
  const rowId = await rowIdDeId2(doc, TABLE.etablissements, etabId);
  if (rowId == null) return [];
  const trouvees = await lignes(doc, TABLE.services, {
    [COL.refEtablissement]: [rowId],
  });
  return trouvees
    .map((r) => ({
      id: texte(r.fields[COL.id]),
      libelle: texte(r.fields[COL.nom]),
    }))
    .filter((s) => s.id && s.libelle);
}

// Service « Autre » avec un vrai service saisi : on crée ou on réutilise ce
// service sous l'établissement, avec la colonne `Origine=formulaire`. À la
// connexion suivante, il apparaît dans la liste. C'est idempotent, la
// déduplication se faisant sur le nom normalisé, et sans effet pour une sélection
// issue des listes. Voir
// docs/knowledge/domain/enrichissement-referentiel-rattachement.md.
async function enrichir(
  doc: DocGrist,
  saisie: RattachementSaisi,
): Promise<void> {
  if (!saisie.serviceEstAutre || !saisie.serviceLibre?.trim()) return;
  const etabRowId = await rowIdDeId2(doc, TABLE.etablissements, saisie.etabId);
  if (etabRowId == null) return;
  await assurerService(doc, etabRowId, saisie.serviceLibre);
}

// Résout un Id2 métier vers le rowId interne Grist de la table donnée.
async function rowIdDeId2(
  doc: DocGrist,
  table: string,
  id: string,
): Promise<number | null> {
  const trouvees = await lignes(doc, table, { [COL.id]: [Number(id)] });
  return trouvees[0]?.id ?? null;
}

// Prochain Id2 métier libre de la table (max + 1). Les lignes du formulaire sont
// ainsi visibles immédiatement dans les listes (le read-path filtre sur Id2 non nul).
async function prochainId2(doc: DocGrist, table: string): Promise<number> {
  const trouvees = await lignes(doc, table);
  const max = trouvees.reduce(
    (m, r) => Math.max(m, Number(r.fields[COL.id]) || 0),
    0,
  );
  return max + 1;
}

// Réutilise le service homonyme (Nom normalisé) de l'établissement, sinon le crée.
async function assurerService(
  doc: DocGrist,
  etabRowId: number,
  nom: string,
): Promise<number> {
  const cn = normalise(nom);
  const existants = await lignes(doc, TABLE.services, {
    [COL.refEtablissement]: [etabRowId],
  });
  const deja = existants.find(
    (r) => normalise(texte(r.fields[COL.nom])) === cn,
  );
  if (deja) return deja.id;
  return creerLigne(doc, TABLE.services, {
    [COL.id]: await prochainId2(doc, TABLE.services),
    [COL.nom]: nom.trim(),
    [COL.refEtablissement]: etabRowId,
    [COL.origine]: ORIGINE_FORMULAIRE,
  });
}

const TABLE = {
  etablissements: "Etablissements",
  services: "Services_Unites",
} as const;

const COL = {
  id: "Id2",
  nom: "Nom",
  refEtablissement: "Etablissement",
  origine: "Origine",
} as const;

// Marqueur écrit dans la colonne `Origine` des lignes issues du formulaire (par
// opposition aux lignes saisies par l'admin), pour tri/validation ultérieure.
const ORIGINE_FORMULAIRE = "formulaire";
