# Spec — Alimenter Grist depuis les saisies manuelles du formulaire d'identification

> Statut : **à implémenter**. Décisions validées avec le porteur le 2026-07-08.

## Contexte

Le formulaire d'identification (`front/identification/Identification.tsx`) capture du
texte libre, plutôt qu'une sélection dans une liste du référentiel, dans un seul cas :
le prescripteur **hors liste** (`PRESCRIPTEUR_HORS_LISTE`), qui saisit son nom et son
prénom sous un service réel, le service « Autre » compris.

> **MàJ 2026-07-21** — la branche « non rattaché » a été supprimée. Les prescripteurs
> sans établissement de rattachement, en libéral, à la CNAM ou à la CPAM, sélectionnent
> désormais l'établissement **« Libéral / CNAM / CPAM / Autre »** du référentiel, puis
> passent par la branche ci-dessus. Il n'y a plus ni `categorie` ni sentinelle
> `ETAB_NON_RATTACHE` ; les sections ci-dessous qui mentionnent « non rattaché » ne
> valent plus que comme historique.

> **MàJ 2026-07-22 (a)** — la branche « service Autre », qui faisait saisir un nom de
> service libre derrière la sentinelle `SERVICE_AUTRE`, a été supprimée. « Autre » est
> devenu une entrée du référentiel, un service par établissement, qu'on sélectionne
> comme n'importe quelle autre. Il n'y a plus de sentinelle `SERVICE_AUTRE`.
>
> **MàJ 2026-07-22 (b) — implémentée.** On réintroduit une saisie libre du service, mais
> autrement : quand le prescripteur sélectionne l'entrée « Autre » du référentiel, il
> doit obligatoirement saisir son service ou son unité réels (`serviceLibre`). Le backend
> crée ce vrai service sous l'établissement, avec `Origine=formulaire`, et y rattache le
> prescripteur. S'il est hors liste, il est créé sous ce service ; s'il était déjà listé
> sous « Autre », il est déplacé par un `PATCH Service_Unite`. Le but est qu'à la
> connexion suivante il apparaisse sous son vrai service et non plus sous « Autre ». Le
> front porte deux champs pour cela : `serviceEstAutre: boolean`, parce que le front seul
> connaît le libellé, ce qui permet à `saisieComplete`, partagé, d'exiger le service sans
> relire Grist, et `serviceLibre`.
>
> **Analytics** : le `serviceRef` HMAC reste calculé sur l'id « Autre » du référentiel,
> le vrai service n'ayant pas encore d'id au moment de la pseudonymisation. La première
> visite est donc buckettée sous « Autre », les suivantes sous le vrai service. C'est un
> décrochage mineur, assumé en phase expérimentale. `enrichirDepuisSaisie` reste
> totalement découplé et best-effort : si Grist est indisponible, on accède quand même au
> simulateur.

Aujourd'hui ces valeurs libres ne servent qu'à calculer un pseudonyme HMAC pour
l'analytics (`server/identification/pseudonymisation.ts`), puis elles sont jetées. Le
but est qu'elles enrichissent le référentiel Grist, pour que l'admin et les utilisateurs
suivants en bénéficient sans avoir à ressaisir.

## Décisions

- **PII en clair dans Grist.** Grist est le backend admin de confiance : on y écrit le
  nom, le prénom et le service en clair. Le pipeline analytics ne change pas, il reste en
  HMAC seul. Cela assouplit l'invariant R-6 de l'ADR-4 : R-6 ne concerne plus que le
  transport vers l'analytics, pas le stockage référentiel côté serveur. La réserve RGPD
  est à instruire côté porteur, et a déjà été signalée.
- **Écriture directe dans le référentiel**, dans les tables `Services_Unites` et
  `Prescripteurs`, avec une colonne `Origine` valant `formulaire` pour marquer la
  provenance. L'admin peut ainsi filtrer et trier.
- **Non rattaché.** On se rattache aux lignes déjà créées par le porteur dans Grist :
  l'établissement « Libéral / CNAM » (Id2=2), et les services CNAM (Id2=2) et Libéral
  (Id2=3). On ne crée que le prescripteur, sous le bon service.
- **Visible immédiatement.** Les lignes créées reçoivent un Id2 automatique, le max(Id2)
  de la table plus un, pour apparaître dans les listes des utilisateurs suivants. La
  déduplication se fait sur le `Nom` normalisé, et le `Prenom`, sous le même parent : on
  réutilise une ligne existante au lieu d'empiler des doublons.
- **Non bloquant.** Une écriture Grist qui échoue ne bloque jamais l'accès au simulateur.
  C'est une dégradation gracieuse, cohérente avec l'existant, et les erreurs sont loguées.

## Ce qui s'écrit, par branche

| Branche | Service créé/réutilisé | Prescripteur créé/réutilisé/déplacé |
|---|---|---|
| service « Autre » + `serviceLibre` + hors liste | oui : vrai service sous l'établissement | créé sous le vrai service |
| service « Autre » + `serviceLibre` + prescripteur listé | oui : vrai service sous l'établissement | **déplacé** (PATCH `Service_Unite`) vers le vrai service |
| prescripteur hors liste (service réel, hors « Autre ») | non (service réel existant, Id2=serviceId) | créé sous ce service |

Un prescripteur pris dans une liste, sous un service réel autre que « Autre », ne
déclenche aucune écriture.

## Changements

### 1. `shared/referentiel.ts` — capacité d'enrichissement (optionnelle)

Ajouter à l'interface `Referentiel` une méthode optionnelle, que le client HTTP du front
n'implémente pas :

```ts
enrichirDepuisSaisie?(saisie: IdentiteSaisie): Promise<void>;
```

`IdentiteSaisie` s'importe depuis `shared/identite-saisie.ts`, qui reste isomorphe et
sans dépendance node. Le `snapshotReferentiel` reçoit une implémentation vide, pour le
dev sans clé Grist et pour les tests qui n'exercent pas l'écriture.

### 2. `shared/identite-saisie.ts` — helper `normalise` partagé

Extraire la normalisation de texte, aujourd'hui privée dans `pseudonymisation.ts` sous la
forme `trim().replace(/\s+/g," ").toLowerCase()`, en un export partagé `normalise(s)`.
Il sert au HMAC et à la déduplication Grist, qui travaillent ainsi sur le même bucket.
Mettre à jour `pseudonymisation.ts` pour qu'il l'importe au lieu de sa copie locale.

### 3. `server/identification/referentiel-grist.ts` — écriture Grist

C'est le cœur du changement. Ajouter :

- un helper `create(table, fields)` : `POST ${base}/tables/${table}/records` avec le corps
  `{ records: [{ fields }] }` et un `Authorization: Bearer`, qui renvoie le rowId créé. Il
  réutilise le pattern de `records()`.
- un helper `nextId2(table)` : le `max(Id2)+1` sur `records(table)`, en Int, avec 1 par
  défaut.
- un helper `trouverEnfant(table, refCol, parentRowId, predicat)` : il liste les enfants
  d'un parent et renvoie le record, son rowId et son Id2, dont le `Nom` ou le `Prenom`
  normalisé correspond, et `null` sinon. La déduplication se fait en JS, la normalisation
  de casse et d'espaces n'étant pas filtrable côté Grist.
- `enrichirDepuisSaisie(saisie)`, qui dispatche par branche selon les sentinelles
  d'`identite-saisie.ts` :
  - **service_autre** : résoudre le rowId de l'établissement (Id2=`saisie.etabId`),
    réutiliser ou créer le service (`Nom`=serviceLibre, `Etablissement`=etab rowId,
    `Origine`=formulaire, `Id2`=nextId2), puis réutiliser ou créer le prescripteur sous ce
    service.
  - **prescripteur_hors_liste** : résoudre le rowId du service (Id2=`saisie.serviceId`),
    puis réutiliser ou créer le prescripteur.
  - **non rattaché** : mapper la `categorie` vers un service Id2 avec
    `{ cnam:"2", liberal:"3" }`, résoudre le rowId, puis réutiliser ou créer le
    prescripteur.
  - Un prescripteur créé porte `Nom`=saisie.nom, `Prenom`=saisie.prenom,
    `Service_Unite`=service rowId, `Origine`=formulaire et `Id2`=nextId2.
- des constantes : `COL.origine = "Origine"`, `ORIGINE_FORMULAIRE = "formulaire"` et
  `SERVICE_ID_PAR_CATEGORIE`. **Pré-requis Grist** : la colonne `Origine` doit exister sur
  `Services_Unites` et sur `Prescripteurs`. L'id exact de la colonne et la valeur exacte
  restent à confirmer ou à ajuster.

### 4. `server/identification/routes.ts` — déclencher l'enrichissement

Dans `POST /identite-pseudonymisee`, après le `saisieComplete` donc sur une saisie valide,
appeler `referentiel.enrichirDepuisSaisie?.(saisie)`. L'appel est isolé dans un try/catch
qui logue et avale l'erreur : la réponse, l'identité pseudonymisée, part quoi qu'il
arrive. Le front et `IdentiteSaisie` n'ont rien à changer, le formulaire envoyant déjà la
saisie complète.

## Tests (sans mock, convention repo)

- `tests/identification/server.test.ts` : ajouter un cas avec un référentiel double en
  mémoire, c'est-à-dire un objet réel implémentant `Referentiel` avec un
  `enrichirDepuisSaisie` qui enregistre ses appels, passé à `createApp`. Vérifier que
  `POST /api/identite-pseudonymisee` déclenche l'enrichissement avec les bons champs sur
  chaque branche libre, et qu'une branche sans saisie libre ne le déclenche pas. Vérifier
  aussi qu'une erreur d'enrichissement n'empêche pas la réponse 200, avec un double qui
  lève.
- `tests/identification/grist-ecriture.smoke.test.ts`, nouveau, en `skipIf` sans
  `GRIST_API_KEY` comme `grist.smoke.test.ts` : contre le vrai doc, il crée puis relit une
  saisie et vérifie la déduplication, un second appel identique devant rendre le même
  rowId. ⚠️ Il crée des lignes réelles marquées `Origine=formulaire` : soit on nettoie en
  fin de test, soit on assume et l'admin purge. À arbitrer.

## Docs / mémoire (à mettre à jour lors de l'implémentation)

- `docs/architecture/identification.md` : une nouvelle sous-section en §4, ou un ADR, sur
  l'enrichissement du référentiel depuis les saisies libres. Y noter l'assouplissement de
  R-6, la PII en clair dans Grist et le HMAC réservé à l'analytics, ainsi que R-9.
- Mémoire `project_identification_analytics.md` : acter l'écriture Grist et les Id2 des
  lignes Libéral et CNAM.

## Vérification

1. `pnpm --filter simulateur-eligibilite test` doit être vert, y compris les nouveaux
   cas de route et le double en mémoire.
2. `pnpm --filter simulateur-eligibilite build` doit passer, `tsc -b` puis
   `vite build`.
3. Contre le Grist réel, avec la clé dans `.env` : lancer `mise run dev-simulateur`, puis
   sur `http://localhost:5173` dérouler chaque branche libre — service Autre, hors liste,
   non rattaché. Vérifier dans Grist que les lignes apparaissent avec `Origine=formulaire`
   et un `Id2` ; resoumettre à l'identique ne doit pas créer de doublon ; rouvrir le
   formulaire doit montrer la nouvelle entrée dans la liste.
4. Vérifier que l'accès au simulateur reste immédiat même si Grist est injoignable : en
   coupant la clé ou le réseau, on entre quand même, et l'erreur est loguée.
