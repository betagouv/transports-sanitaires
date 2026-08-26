---
name: doc-architecture
description: Écrire ou mettre à jour un document d'architecture dans docs/architecture/, au format ADR maison du dépôt. À charger dès qu'une décision structurante est prise, révisée ou révoquée, ou qu'on demande de « documenter l'archi ».
---

# Écrire un document d'architecture

Les documents d'architecture vivent dans `docs/architecture/`, aujourd'hui
`identification.md` et `analytics.md`. Il y a **un document par sujet**, et non un
fichier par décision : les ADR sont groupés dedans et numérotés.

Ils restent au niveau composant C4 : ce qui parle, à quoi, et pourquoi. On n'y met
aucun détail de fichier ni de fonction. Ça, c'est le code et le README de l'app qui
le portent, et ça se périme en une semaine.

## Le squelette

```markdown
# Architecture : <sujet>

> Statut : **décidé (phase expérimentale)** · Dernière mise à jour : AAAA-MM-JJ

## 1. Contexte & objectifs
## 2. Décisions (ADR)
### ADR-1 - <titre de la décision>
### ADR-2 - …
## 3. Architecture cible          (diagramme Mermaid + tableau de composants)
## 4. <le cœur du sujet>
## 5. Découpage en incréments     (✅ sur ce qui est fait)
## 6. Risques & validations en attente   (tableau R-1, R-2, …)
```

Chaque ADR porte, dans son corps, le contexte, la décision et les conséquences.

## La particularité à respecter : on ne réécrit pas l'histoire

**Une décision révoquée reste dans le document, barrée**, avec ce qui l'a remplacée
dans le titre :

```markdown
### ADR-1 - Identification intégrée en écran-porte (~~app dédiée~~)
### ADR-4 - Identité pseudonymisée : refs, en mémoire (~~fragment d'URL~~)
```

Et un encart daté en tête du document dit ce qui a été renversé :

```markdown
> **Mise à jour 2026-07-08, fusion des apps.** L'ADR-1, l'ADR-4 et l'invariant
> n° 3 de l'ADR-5 sont renversés : …
```

La même mécanique vaut pour les risques (`~~R-9~~ … Résolu (2026-07-08)`) et pour
les composants disparus dans les tableaux, avec une colonne « statut » qui prend
`modifié`, `déplacé` ou `supprimé`.

La raison est simple : quelqu'un, humain ou agent, retombera sur l'ancienne décision
dans un commit, un commentaire ou sa mémoire. Il doit trouver ici pourquoi elle ne
vaut plus, et non un document qui fait comme si elle n'avait jamais existé.

## En écrivant

- **Français**, comme tout le dépôt, et en phrases normales : la règle d'écriture
  simple d'`AGENTS.md` vaut ici aussi. Le fond peut rester argumenté et détaillé.
- **Mermaid** pour les diagrammes, et des **tableaux** pour les événements, les
  variables d'environnement, les risques et les composants.
- **Toujours mettre à jour la date** de l'en-tête quand une décision bouge. Un
  document non daté ne se laisse pas arbitrer. Une simple relecture de forme ne la
  touche pas : la date dit quand les décisions ont changé.
- Des renvois relatifs entre documents, comme `./identification.md`.
- Terminer par une section **Vérification** en commandes exécutables, quand le
  document décrit quelque chose qu'on peut éprouver.

## Ce qui ne va pas là

Ce qui n'est pas une décision d'architecture se range ailleurs :
`AGENTS.md § Où écrire quoi` dit où.

Un point vaut d'être retenu en écrivant ici. Le test, le code et le README d'une
app priment sur `docs/architecture/`. Un document d'architecture qui contredit le
code a tort : corrige-le, ne t'y fie pas.
