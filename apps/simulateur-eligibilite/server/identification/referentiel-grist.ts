// Implémentation `Referentiel` au-dessus d'un doc Grist.
//
// Voir docs/architecture/identification.md — ADR-5 & §5. Ce module vit côté
// serveur uniquement : il détient la clé Grist (jamais exposée au navigateur) et
// ne renvoie que des données filtrées (les noms de prescripteurs seulement pour
// le service demandé, jamais l'annuaire complet). L'accès HTTP lui-même est
// dans `lignes-grist.ts`.
//
// Modèle Grist (identifiants de tables/colonnes réels, assainis par Grist) :
//   Etablissements   : Id2 (Int, « Id » métier), Nom (Text)
//   Services_Unites  : Id2, Nom, Etablissement (Ref:Etablissements)
//   Prescripteurs    : Id2, Nom, Prenom, Service_Unite (Ref:Services_Unites)
//
// Les identifiants opaques de l'identité saisie (`etabId`/`serviceId`/`prescripteurId`)
// sont la colonne **Id2** (choix produit). Les colonnes de référence stockent le
// **rowId interne Grist** de la ligne cible, pas son Id2 : on résout donc Id2 →
// rowId avant de filtrer les enfants.

import {
  type IdentiteSaisie,
  normalise,
  PRESCRIPTEUR_HORS_LISTE,
} from "../../shared/identite-saisie.ts";
import type {
  Etablissement,
  Prescripteur,
  Referentiel,
  Service,
} from "../../shared/referentiel.ts";
import type { DocGrist } from "./lignes-grist.ts";
import {
  creerLigne,
  lignes,
  majLigne,
  ouvrirDoc,
  texte,
} from "./lignes-grist.ts";

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
    listerPrescripteurs: (serviceId) => prescripteurs(doc, serviceId),
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

async function prescripteurs(
  doc: DocGrist,
  serviceId: string,
): Promise<Prescripteur[]> {
  const rowId = await rowIdDeId2(doc, TABLE.services, serviceId);
  if (rowId == null) return [];
  const trouvees = await lignes(doc, TABLE.prescripteurs, {
    [COL.refService]: [rowId],
  });
  return trouvees
    .map((r) => ({
      id: texte(r.fields[COL.id]),
      libelle:
        `${texte(r.fields[COL.prenom])} ${texte(r.fields[COL.nom])}`.trim(),
    }))
    .filter((p) => p.id && p.libelle);
}

// Écrit les saisies **libres** dans le référentiel (colonne `Origine=formulaire`).
// Idempotent (dédup sur Nom/Prénom normalisés) ; ne fait rien pour une sélection
// issue des listes. Voir docs/specs/enrichissement-referentiel-saisies-libres.md.
async function enrichir(doc: DocGrist, saisie: IdentiteSaisie): Promise<void> {
  if (saisie.serviceEstAutre && saisie.serviceLibre?.trim()) {
    return rattacherAuServiceReel(doc, saisie, saisie.serviceLibre);
  }
  // Prescripteur hors liste (service réel, « Autre » sans service saisi compris) :
  // prescripteur sous le service sélectionné.
  if (saisie.prescripteurId === PRESCRIPTEUR_HORS_LISTE) {
    if (!saisie.serviceId || !saisie.nom || !saisie.prenom) return;
    const serviceRowId = await rowIdDeId2(
      doc,
      TABLE.services,
      saisie.serviceId,
    );
    if (serviceRowId == null) return;
    await assurerPrescripteur(doc, serviceRowId, saisie.nom, saisie.prenom);
  }
  // Sinon : sélection issue des listes → rien à écrire.
}

// Service « Autre » avec un vrai service saisi : on crée/réutilise ce service
// sous l'établissement, puis on y **rattache** le prescripteur (au lieu de
// « Autre »), pour qu'à la connexion suivante il apparaisse sous son service
// réel — et ne soit plus rattaché à « Autre ». Voir la spec.
async function rattacherAuServiceReel(
  doc: DocGrist,
  saisie: IdentiteSaisie,
  serviceLibre: string,
): Promise<void> {
  const etabRowId = await rowIdDeId2(doc, TABLE.etablissements, saisie.etabId);
  if (etabRowId == null) return;
  const serviceRowId = await assurerService(doc, etabRowId, serviceLibre);

  if (saisie.prescripteurId === PRESCRIPTEUR_HORS_LISTE) {
    // Nouveau prescripteur : on le crée directement sous le vrai service.
    if (!saisie.nom || !saisie.prenom) return;
    await assurerPrescripteur(doc, serviceRowId, saisie.nom, saisie.prenom);
    return;
  }
  // Prescripteur déjà listé sous « Autre » : on le **déplace** vers son vrai
  // service (met à jour sa référence de service).
  if (!saisie.prescripteurId) return;
  const prescRowId = await rowIdDeId2(
    doc,
    TABLE.prescripteurs,
    saisie.prescripteurId,
  );
  if (prescRowId == null) return;
  await majLigne(doc, TABLE.prescripteurs, prescRowId, {
    [COL.refService]: serviceRowId,
  });
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

// Réutilise le prescripteur homonyme (Nom+Prénom normalisés) du service, sinon le crée.
async function assurerPrescripteur(
  doc: DocGrist,
  serviceRowId: number,
  nom: string,
  prenom: string,
): Promise<number> {
  const cn = normalise(nom);
  const cp = normalise(prenom);
  const existants = await lignes(doc, TABLE.prescripteurs, {
    [COL.refService]: [serviceRowId],
  });
  const deja = existants.find(
    (r) =>
      normalise(texte(r.fields[COL.nom])) === cn &&
      normalise(texte(r.fields[COL.prenom])) === cp,
  );
  if (deja) return deja.id;
  return creerLigne(doc, TABLE.prescripteurs, {
    [COL.id]: await prochainId2(doc, TABLE.prescripteurs),
    [COL.nom]: nom.trim(),
    [COL.prenom]: prenom.trim(),
    [COL.refService]: serviceRowId,
    [COL.origine]: ORIGINE_FORMULAIRE,
  });
}

const TABLE = {
  etablissements: "Etablissements",
  services: "Services_Unites",
  prescripteurs: "Prescripteurs",
} as const;

const COL = {
  id: "Id2",
  nom: "Nom",
  prenom: "Prenom",
  refEtablissement: "Etablissement",
  refService: "Service_Unite",
  origine: "Origine",
} as const;

// Marqueur écrit dans la colonne `Origine` des lignes issues du formulaire (par
// opposition aux lignes saisies par l'admin), pour tri/validation ultérieure.
const ORIGINE_FORMULAIRE = "formulaire";
