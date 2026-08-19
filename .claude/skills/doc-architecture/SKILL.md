---
name: doc-architecture
description: Écrire ou mettre à jour un document d'architecture dans docs/architecture/ — format ADR maison du dépôt. À charger dès qu'une décision structurante est prise, révisée ou révoquée, ou qu'on demande de « documenter l'archi ».
---

# Écrire un document d'architecture

Les documents d'architecture vivent dans `docs/architecture/` — aujourd'hui
`identification.md` et `analytics.md`. **Un document par sujet**, pas un fichier
par décision : les ADR sont groupés dedans, numérotés.

Ils restent au **niveau composant C4** : ce qui parle, à quoi, et pourquoi. Aucun
détail de fichier ni de fonction — ça, c'est le code et le README de l'app qui le
portent, et ça se périme en une semaine.

## Le squelette

```markdown
# Architecture — <sujet>

> Statut : **décidé (phase expérimentale)** · Dernière mise à jour : AAAA-MM-JJ

## 1. Contexte & objectifs
## 2. Décisions (ADR)
### ADR-1 — <titre de la décision>
### ADR-2 — …
## 3. Architecture cible          (diagramme Mermaid + tableau de composants)
## 4. <le cœur du sujet>
## 5. Découpage en incréments     (✅ sur ce qui est fait)
## 6. Risques & validations en attente   (tableau R-1, R-2, …)
```

Chaque ADR porte, dans son corps : le contexte, la décision, les conséquences.

## La particularité à respecter — on ne réécrit pas l'histoire

**Une décision révoquée reste dans le document, barrée**, avec ce qui l'a
remplacée dans le titre :

```markdown
### ADR-1 — Identification intégrée en écran-porte (~~app dédiée~~)
### ADR-4 — Identité pseudonymisée : refs, en mémoire (~~fragment d'URL~~)
```

Et un encart daté en tête du document dit ce qui a été renversé :

```markdown
> **Mise à jour 2026-07-08 — fusion des apps.** L'ADR-1, l'ADR-4 et l'invariant
> n° 3 de l'ADR-5 sont renversés : …
```

Même mécanique pour les risques (`~~R-9~~ … Résolu (2026-07-08)`) et pour les
composants disparus dans les tableaux (colonne « statut » :
`modifié` / `déplacé` / `supprimé`).

La raison : quelqu'un — humain ou agent — retombera sur l'ancienne décision dans
un commit, un commentaire ou sa mémoire. Il doit trouver ici pourquoi elle ne
vaut plus, pas un document qui fait comme si elle n'avait jamais existé.

## En écrivant

- **Français**, comme tout le dépôt.
- **Mermaid** pour les diagrammes, **tableaux** pour les événements, variables
  d'environnement, risques, composants.
- **Toujours mettre à jour la date** de l'en-tête. Un document non daté ne se
  laisse pas arbitrer.
- Renvois relatifs entre documents (`./identification.md`).
- Terminer par une section **Vérification** en commandes exécutables quand le
  document décrit quelque chose qu'on peut éprouver.

## Ce qui ne va pas là

| Ce que tu veux écrire | Où ça va |
|---|---|
| Le cadrage d'un chantier, avec ses décisions produit | `docs/specs/` |
| Le mode d'emploi d'une app | son `README.md` |
| Une règle pour l'IA | `AGENTS.md`, racine ou app |
| Une garde | **un test** |

Et rappelle-toi l'ordre d'autorité du dépôt : **le test > le code > le README de
l'app > `docs/architecture/` > `docs/specs/`**. Un document d'architecture qui
contredit le code a tort — corrige-le, ne t'y fie pas.
