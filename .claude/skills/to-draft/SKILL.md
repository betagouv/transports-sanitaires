---
name: to-draft
description: Déposer une idée en brouillon de spec dans `spec/0. draft/`, sous la forme d'un titre et d'un seul paragraphe en mots simples. À charger dès qu'on demande de « drafter », de « noter une idée », de « mettre ça de côté » ou d'ouvrir un brouillon de spec.
---

# Drafter une idée

Un brouillon capture une idée avant qu'elle ne soit cadrée. Il tient en **un
titre et un paragraphe**. Ce n'est pas un cadrage, et le cadrage viendra plus
tard, dans un autre document.

Le fichier va dans `spec/0. draft/`, première colonne du kanban des specs :

```
spec/0. draft/   les idées pas encore instruites
spec/1. backlog/
spec/2. todo/
spec/3. doing/
spec/4. done/
```

`spec/` est dans le `.gitignore` de la racine. Rien n'y est versionné.

## Le gabarit

```markdown
# Spec 0003 - Le titre de l'idée

Le paragraphe.
```

C'est tout. Pas de statut, pas de date, pas de section, pas de tableau, pas de
liste. Un brouillon qui a des sections n'est plus un brouillon.

## Choisir le numéro

Les specs sont numérotées à la suite sur quatre chiffres, **toutes colonnes
confondues**, et un numéro ne se réutilise jamais. Le numéro suit le document
quand il change de colonne.

```bash
find spec -name '[0-9][0-9][0-9][0-9]-*.md' -printf '%f\n' | cut -c1-4 | sort -n | tail -1
```

Le nom du fichier est `NNNN-<slug>.md`, le slug en minuscules et en tirets, tiré
du titre et raccourci à trois ou quatre mots.

## Écrire le paragraphe

En mots simples, trois à six phrases. Il dit **ce qu'on voudrait et pourquoi**,
tel qu'on l'expliquerait à voix haute. Ni conception, ni chiffres, ni noms de
fichiers, ni promesse de solution.

Si l'idée demande deux paragraphes, c'est qu'elle en contient deux : ouvre deux
brouillons.

```markdown
✅ OK
# Spec 0003 - Retrouver un établissement par son nom

Aujourd'hui il faut connaître le finess pour retrouver une ligne. Les gens qui
lisent le mart ne l'ont pas sous la main, ils ont un nom d'hôpital. On voudrait
pouvoir chercher par nom, même mal orthographié, et tomber sur le bon
établissement.
```

```markdown
❌ KO
# Spec 0003 - Recherche floue

## Le problème
Pas d'index de recherche.

## Piste
Un index trigrammes en SQLite, avec un seuil de similarité à 0,4, exposé par un
nouveau module `recherche/`.
```

Le KO cadre au lieu de drafter. Le seuil et le module sont des décisions que
personne n'a prises.

## Ne pas instruire l'idée

Le brouillon s'écrit avec ce que la conversation contient déjà. Ne lis pas le
code, ne compte pas les lignes d'un fichier, ne vérifie pas si c'est faisable.
L'instruction est le travail du cadrage, pas du brouillon.

S'il manque quelque chose d'essentiel, pose une question courte plutôt que de
combler par une hypothèse.

## Ce qui ne va pas là

| Ce que c'est | Où ça va |
|---|---|
| Une idée pas instruite | `spec/0. draft/` |
| Un chantier cadré, décisions prises | plus loin dans `spec/`, cf. `spec/4. done/0001-v1-to-v3.md` |
| Une décision d'architecture arrêtée | `docs/architecture/`, cf. le skill `doc-architecture` |
| Une convention d'écriture ou de commit | `docs/contributing/`, cf. le skill `regle-de-contribution` |
