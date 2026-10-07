# Alimenter Grist depuis le service saisi à l'écran de rattachement

> Statut : **implémenté**. Décisions validées avec le porteur le 2026-07-08, révisées
> le 2026-09-29.
>
> **Mise à jour 2026-09-29, rattachement sans identité.** L'écran de rattachement ne demande plus
> qui réalise la simulation (voir [l'ADR d'identification](../adr/identification.md),
> ADR-3). Les branches qui écrivaient un **prescripteur** dans Grist disparaissent :
> plus de création d'un prescripteur « hors liste », plus de déplacement d'un
> prescripteur listé sous « Autre » vers son vrai service. Seule reste l'écriture du
> **service** saisi sous « Autre ». Le document s'appelait
> `enrichissement-referentiel-saisies-libres.md`.
>
> **Historique.**
>
> - 2026-07-21 : la branche « non rattaché » (catégories libéral / CNAM) est supprimée.
>   Ces prescripteurs sélectionnent l'établissement « Libéral / CNAM / CPAM / Autre ».
> - 2026-07-22 : la sentinelle `SERVICE_AUTRE` et son service libre disparaissent.
>   « Autre » devient une entrée du référentiel, un service par établissement. La
>   saisie du service réel est réintroduite derrière cette entrée.

## Contexte

L'écran de rattachement capture du texte libre, plutôt qu'une sélection dans une liste du
référentiel, dans un seul cas : l'utilisateur choisit le service « Autre » d'un
établissement et doit alors saisir son service ou son unité réels (`serviceLibre`).

Sans enrichissement, ce texte serait perdu. Le but est qu'il enrichisse le
référentiel Grist, pour que l'admin et les utilisateurs suivants en bénéficient sans
avoir à ressaisir.

## Décisions

- **Écriture directe dans le référentiel**, dans la table `Services_Unites`, avec une
  colonne `Origine` valant `formulaire` pour marquer la provenance. L'admin peut ainsi
  filtrer et trier.
- **Visible immédiatement.** Le service créé reçoit un `Id2` automatique, le
  `max(Id2)` de la table plus un, pour apparaître dans la liste des utilisateurs
  suivants.
- **Sans doublon.** La déduplication se fait sur le `Nom` normalisé (casse et espaces)
  sous le même établissement : on réutilise une ligne existante au lieu d'empiler.
- **Non bloquant.** Une écriture Grist qui échoue ne bloque jamais l'accès au
  simulateur. C'est une dégradation gracieuse, et l'erreur est loguée.
- **Aucune personne dans Grist.** ~~Le nom et le prénom d'un prescripteur hors liste
  étaient écrits en clair dans la table `Prescripteurs`.~~ Depuis le 2026-09-29, l'app
  n'écrit plus aucune donnée de personne, et ne lit plus cette table.
- **Sans attente.** Le front déclare le service saisi (`POST /api/rattachement`) et
  entre dans le simulateur sans attendre la réponse. Seul ce cas est déclaré : un
  service choisi dans la liste n'apprend rien au référentiel.
- **Analytics.** Matomo reçoit l'id de l'entrée « Autre » du référentiel, le vrai
  service n'ayant pas encore d'id à la validation. La première visite est donc
  comptée sous « Autre », les suivantes sous le vrai service. C'est un décrochage
  mineur, assumé.

## Ce qui s'écrit

| Sélection | Écriture Grist |
|---|---|
| service « Autre » + `serviceLibre` | le vrai service, créé ou réutilisé sous l'établissement |
| tout autre service du référentiel | rien |
| ~~prescripteur hors liste~~ | ~~prescripteur créé sous le service~~ (retiré le 2026-09-29) |
| ~~prescripteur listé sous « Autre »~~ | ~~prescripteur déplacé vers le vrai service~~ (retiré le 2026-09-29) |

La route délègue toujours l'enrichissement à la source du référentiel ; c'est la
source Grist qui décide de ne rien écrire pour une sélection issue des listes. Le
snapshot factice et le client HTTP du front n'écrivent jamais.

**Prérequis Grist** : la colonne `Origine` doit exister sur `Services_Unites`.

## Vérification

```bash
# Route et enrichissement, sans Grist (double en mémoire)
pnpm --filter simulateur-eligibilite exec vitest run tests/socle/rattachement/enrichissement.test.ts

# Contre le vrai Grist : crée de vraies lignes, à purger à la main côté admin
GRIST_ECRITURE_TEST=1 GRIST_API_KEY=… pnpm --filter simulateur-eligibilite exec vitest run grist-ecriture
```
