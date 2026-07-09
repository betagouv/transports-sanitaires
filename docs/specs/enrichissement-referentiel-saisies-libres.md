# Spec — Alimenter Grist depuis les saisies manuelles du formulaire d'identification

> Statut : **à implémenter**. Décisions validées avec le porteur le 2026-07-08.

## Contexte

Le formulaire d'identification (`front/identification/Identification.tsx`) est à
branches (voir `shared/selection.ts`). Trois branches capturent du **texte libre**
plutôt qu'une sélection dans une liste du référentiel :

- **service « Autre »** (`SERVICE_AUTRE`) : nom de service libre + nom/prénom ;
- **prescripteur « hors liste »** (`PRESCRIPTEUR_HORS_LISTE`) : nom/prénom sous un
  service réel ;
- **« non rattaché »** (`ETAB_NON_RATTACHE` + `categorie` libéral/CNAM) : nom/prénom.

Aujourd'hui ces valeurs libres ne servent qu'à calculer un **pseudonyme HMAC** pour
l'analytics (`server/identification/pseudonymisation.ts`) puis sont jetées. **But** :
que ces saisies **enrichissent le référentiel Grist** pour que l'admin (et les
utilisateurs suivants) en bénéficient, sans re-saisir.

## Décisions

- **PII en clair dans Grist** : Grist est le backend admin de confiance ; on y écrit
  nom/prénom/service **en clair**. Le pipeline analytics reste inchangé (HMAC only).
  → **assouplit l'invariant R-6 / ADR-4** : R-6 ne concerne plus que le transport vers
  l'analytics, pas le stockage référentiel côté serveur. Réserve RGPD à instruire côté
  porteur (déjà signalée).
- **Écriture directe dans le référentiel** (tables `Services_Unites`, `Prescripteurs`),
  avec une colonne **`Origine` = `formulaire`** marquant l'origine (l'admin filtre/tri).
- **Non rattaché** : rattaché aux lignes déjà créées par le porteur dans Grist —
  établissement « Libéral / CNAM » (Id2=2), services **CNAM (Id2=2)** et
  **Libéral (Id2=3)**. On crée seulement le **prescripteur** sous le bon service.
- **Visible immédiatement** : les lignes créées reçoivent un **Id2 auto** (max(Id2)+1
  de la table) pour apparaître dans les listes des utilisateurs suivants.
  **Déduplication** sur `Nom` normalisé (+ `Prenom`) sous le même parent → on
  **réutilise** une ligne existante au lieu d'empiler des doublons.
- **Non bloquant** : une écriture Grist qui échoue **ne bloque jamais** l'accès au
  simulateur (dégradation gracieuse, cohérent avec l'existant). Erreurs loguées.

## Ce qui s'écrit, par branche

| Branche | Service créé/réutilisé | Prescripteur créé/réutilisé |
|---|---|---|
| service « Autre » | oui : `Nom`=serviceLibre sous l'étab. réel (Id2=etabId) | oui : sous le service ci-dessus |
| prescripteur hors liste | non (service réel existant, Id2=serviceId) | oui : sous ce service |
| non rattaché (libéral/CNAM) | non (service existant : cnam→Id2 2, liberal→Id2 3) | oui : sous ce service |

Prescripteur pris dans une liste + service réel → **aucune écriture**.

## Changements

### 1. `shared/referentiel.ts` — capacité d'enrichissement (optionnelle)
Ajouter à l'interface `Referentiel` une méthode **optionnelle** (le client HTTP front ne
l'implémente pas) :

```ts
enrichirDepuisSaisie?(sel: Selection): Promise<void>;
```

Import de `Selection` depuis `shared/selection.ts` (reste isomorphe, sans dép. node).
Le `snapshotReferentiel` reçoit une implémentation **no-op** (dev sans clé Grist / tests
qui n'exercent pas l'écriture).

### 2. `shared/selection.ts` — helper `normalise` partagé
Extraire la normalisation texte (aujourd'hui privée dans `pseudonymisation.ts` :
`trim().replace(/\s+/g," ").toLowerCase()`) en export partagé `normalise(s)`, réutilisé
par le HMAC **et** par la déduplication Grist (même « bucket »). Mettre à jour
`pseudonymisation.ts` pour l'importer au lieu de sa copie locale.

### 3. `server/identification/referentiel-grist.ts` — écriture Grist
Cœur du changement. Ajouter :

- helper `create(table, fields)` : `POST ${base}/tables/${table}/records` body
  `{ records: [{ fields }] }`, `Authorization: Bearer`, renvoie le rowId créé (réutilise
  le pattern de `records()`).
- helper `nextId2(table)` : `max(Id2)+1` sur `records(table)` (Int, défaut 1).
- helper `trouverEnfant(table, refCol, parentRowId, predicat)` : liste les enfants d'un
  parent et renvoie le **record** (rowId + Id2) dont le `Nom`/`Prenom` normalisé matche,
  sinon `null` (dédup en JS, la normalisation casse/espaces n'étant pas filtrable Grist).
- `enrichirDepuisSaisie(sel)` : dispatch par branche (sentinelles de `selection.ts`) :
  - **service_autre** : résoudre etab rowId (Id2=`sel.etabId`) → réutiliser/créer le
    service (`Nom`=serviceLibre, `Etablissement`=etab rowId, `Origine`=formulaire,
    `Id2`=nextId2) → réutiliser/créer le prescripteur sous ce service.
  - **prescripteur_hors_liste** : résoudre service rowId (Id2=`sel.serviceId`) →
    réutiliser/créer le prescripteur.
  - **non rattaché** : mapper `categorie` → service Id2 (`{ cnam:"2", liberal:"3" }`) →
    résoudre rowId → réutiliser/créer le prescripteur.
  - Prescripteur créé : `Nom`=sel.nom, `Prenom`=sel.prenom, `Service_Unite`=service
    rowId, `Origine`=formulaire, `Id2`=nextId2.
- Constantes : `COL.origine = "Origine"`, `ORIGINE_FORMULAIRE = "formulaire"`,
  `SERVICE_ID_PAR_CATEGORIE`. **Pré-requis Grist** : la colonne `Origine` doit exister
  sur `Services_Unites` et `Prescripteurs` (à confirmer/ajuster : id de colonne exact,
  valeur exacte).

### 4. `server/identification/routes.ts` — déclencher l'enrichissement
Dans `POST /contexte`, après le `selectionComplete` (donc sélection valide) : appeler
`referentiel.enrichirDepuisSaisie?.(sel)`, **isolé dans un try/catch qui logue et avale
l'erreur** — la réponse (le contexte pseudonymisé) part quoi qu'il arrive. Le front et
`Selection` n'ont **rien à changer** (le formulaire envoie déjà la sélection complète).

## Tests (sans mock, convention repo)

- `tests/identification/server.test.ts` : ajouter un cas avec un **référentiel double
  en mémoire** (objet réel implémentant `Referentiel` + un `enrichirDepuisSaisie` qui
  enregistre ses appels) passé à `createApp`, et vérifier que `POST /api/contexte` sur
  chaque branche libre déclenche l'enrichissement avec les bons champs ; et qu'une
  branche **sans** saisie libre ne le déclenche pas. Vérifier aussi qu'une erreur
  d'enrichissement **n'empêche pas** la réponse 200 (double qui `throw`).
- `tests/identification/grist-ecriture.smoke.test.ts` (nouveau, `skipIf` sans
  `GRIST_API_KEY`, comme `grist.smoke.test.ts`) : contre le vrai doc, crée puis relit
  une saisie et vérifie la dédup (2e appel identique → même rowId). ⚠️ crée des lignes
  réelles marquées `Origine=formulaire` → soit nettoyer en fin de test, soit assumer et
  laisser l'admin purger. À arbitrer.

## Docs / mémoire (à mettre à jour lors de l'implémentation)

- `docs/architecture/identification.md` : nouvelle sous-section §4/ADR (enrichissement
  référentiel depuis les saisies libres) ; noter l'assouplissement de **R-6** (PII en
  clair dans Grist, HMAC only pour l'analytics) et **R-9**.
- Mémoire `project_identification_analytics.md` : acter l'écriture Grist + les Id2 des
  lignes Libéral/CNAM.

## Vérification

1. `npm --prefix apps/simulateur-eligibilite test` → tout vert (dont les nouveaux cas
   route + double en mémoire).
2. `npm --prefix apps/simulateur-eligibilite run build` → `tsc -b && vite build` OK.
3. Grist réel (clé dans `.env`) : `mise run dev-simulateur`, sur
   `http://localhost:5173` dérouler chaque branche libre (service Autre, hors liste,
   non rattaché) → vérifier dans Grist que la/les ligne(s) apparaissent avec
   `Origine=formulaire` et un `Id2` ; re-soumettre à l'identique → **pas de doublon** ;
   rouvrir le formulaire → la nouvelle entrée apparaît dans la liste.
4. Vérifier que l'accès au simulateur reste immédiat même si Grist est injoignable
   (couper la clé / le réseau → on entre quand même, erreur loguée).
