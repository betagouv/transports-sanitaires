---
name: regle-publicodes
description: Ajouter, modifier ou supprimer une règle du modèle d'éligibilité (apps/simulateur-eligibilite/regles/regles.publicodes). À charger dès qu'il s'agit de toucher au modèle métier, à une question du questionnaire, à une cible, ou d'encoder une question à choix multiple en mosaïque.
---

# Toucher au modèle publicodes

Le modèle vit dans un fichier unique,
`apps/simulateur-eligibilite/regles/regles.publicodes`, mais il n'est jamais seul.
Une règle nouvelle traverse quatre endroits, et sauter l'un d'eux laisse le produit
dans un état incohérent que rien ne signale tout de suite.

## L'ordre

### 1. Le modèle : `regles/regles.publicodes`

- Les clés se séparent par ` . `. Les valeurs d'`une possibilité` s'écrivent entre
  quotes, sous la forme `"'valeur'"`. Les booléens s'écrivent `oui` et `non`.
- Le fichier ne porte que de l'éligibilité, ni identification ni analytics.
  `tests/architecture.test.ts` échoue sinon, et il a raison : le modèle doit rester
  une transcription de la réglementation, rejouable hors de l'application.
- Nomme en français, comme le reste du modèle.

### 2. Le contrat : `front/simulateur/contrat-regles-publicodes.ts`

Rien dans le code ne peut nommer une clé absente de ce fichier. Trois listes s'y
partagent le travail, et le rangement compte :

| Liste | Ce qu'on y met |
|---|---|
| `CIBLES` | les sorties que le produit affiche ou décide |
| `QUESTIONS` | les règles **que le code renseigne** dans une situation |
| `REGLES_LUES` | les règles que le code lit sans jamais les écrire |

C'est cet ajout qui autorise l'usage : `Cible` et `CleDeRegle` font rejeter le
reste par TypeScript, que ce soit dans un littéral de situation, dans un tableau
`cibles` ou dans un appel à `texte()` ou `vrai()`.

Ne lis jamais une règle par un `engine.evaluate("…")` nu. Passe par `texte()` ou
`vrai()`.

`tests/regles-front.test.ts` confronte le contrat au modèle : une clé déclarée qui
n'existe pas dans les règles, ou l'inverse, y échoue.

### 3. Une situation de référence : `front/outils-produit/seeds/catalogue.ts`

Une règle qu'aucune seed ne traverse n'est pas testée. Voir le skill
`situation-de-reference`.

### 4. Vérifier

```
cd apps/simulateur-eligibilite
pnpm valider-regles   # syntaxe YAML, puis compilation publicodes
pnpm verifier         # tout le reste
```

`valider-regles` rapporte la ligne et la colonne d'une erreur YAML, et les
références manquantes ou cycliques à la compilation.

## Questions à choix multiple : la mosaïque

Publicodes n'a pas de type « choix multiple ». On l'encode par N règles booléennes
et une règle parente inerte, qui porte la métadonnée `mosaique`. C'est cette
métadonnée que lit `front/simulateur/questionnaire/mosaique.ts` pour rendre un
`fieldset` de cases à cocher.

Le format exact est dans
[`docs/specs/formalisation-mosaique-choix-multiple.md`](../../../docs/specs/formalisation-mosaique-choix-multiple.md).
Lis-le avant d'encoder une question de ce type, et ne réinvente pas la forme.

## Ce qui trahit une erreur

| Symptôme | Cause probable |
|---|---|
| Le moteur lève sur une clé inconnue | La situation emploie une clé absente du modèle. Les clés doivent être exactes |
| TypeScript refuse une chaîne de clé | La clé n'est pas dans le contrat : ajoute-la, ou c'est qu'elle n'existe pas |
| Une question n'est jamais posée | Elle est applicable mais hors du graphe des cibles du parcours. Cible la sortie qui en dépend |
| `tests/simulateur/scenarios.test.ts` signale des « cibles à variables manquantes » | `BASE_NEUTRE` ne répond pas à la nouvelle question : complète-la |
