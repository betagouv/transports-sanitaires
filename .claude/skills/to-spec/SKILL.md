---
name: to-spec
description: Transformer la conversation en cours en spec de cadrage dans `spec/`, prête à implémenter : le problème, les décisions, ce qu'il faut écrire, la recette, le hors périmètre. À charger dès qu'on demande de « cadrer », de « speccer », de passer un brouillon en spec, ou d'écrire le cadrage d'un chantier.
---

# Cadrer un chantier

La spec **synthétise ce que la conversation et le code disent déjà**. Elle
n'interroge pas. Si le cadrage a eu lieu, il est dans le fil : relis-le et
écris-le, ne le rejoue pas en questionnaire.

S'il manque une décision que personne n'a prise, pose **une question courte**, et
continue le reste. Un blocage complet ne se justifie que si toute la spec en
dépend.

L'opposé du brouillon, donc : `to-draft` capture une idée en un paragraphe, ici
on tranche. Un brouillon promu en spec **garde son numéro** et change de colonne.

## Où va le fichier

```
spec/0. draft/     l'idée pas encore instruite
spec/1. backlog/   cadrée, pas la prochaine
spec/2. todo/      cadrée, prête à démarrer
spec/3. doing/
spec/4. done/
```

Une spec fraîchement écrite va en `2. todo` si elle est la prochaine chose à
faire, en `1. backlog` sinon. Demande-le si le fil ne le dit pas.

| Cas | Numéro |
|---|---|
| Promotion d'un brouillon | le sien, `mv` le fichier depuis `0. draft` |
| Spec née cadrée | le suivant, sur quatre chiffres, jamais réutilisé |

```bash
find spec -name '[0-9][0-9][0-9][0-9]-*.md' -printf '%f\n' | cut -c1-4 | sort -n | tail -1
```

Les liens entre specs sont relatifs et l'espace du nom de dossier s'encode :
`[0002](../0.%20draft/0002-residu-parent-filles.md)`.

## Avant d'écrire

**1. Lis la zone touchée.** L'`AGENTS.md` de la racine, celui de l'app, le README
de l'app, les ADR de `docs/architecture/` qui la concernent. Un ADR se respecte
ou se révoque explicitement, cf. le skill `doc-architecture`. Jamais en silence.

Reprends **les mots du code et du README**. `mart`, `finess juridique`, `GHT`,
`situation de référence` : un synonyme inventé dans la spec devient un synonyme
inventé dans le code.

**2. Pose les coutures de test.** Choisis par quoi la fonctionnalité sera testée,
avant de décrire comment elle sera écrite.

- Une couture qui existe déjà vaut mieux qu'une nouvelle.
- La couture la plus haute possible vaut mieux qu'une couture interne.
- Le moins de coutures possible, idéalement une.
- Pas de mock, pas de donnée réelle : la 0001 fabrique un `.xlsx` synthétique en
  fichier temporaire et le fait traverser SheetJS pour de vrai.

**Fais valider les coutures** avant d'écrire la spec. C'est le seul aller-retour
qui vaut le coup : se tromper de couture se paie sur tout le lot.

**3. Relis pour la confidentialité.** `spec/` est ignoré par git, la spec peut
donc nommer des établissements, des fournisseurs et des fichiers réels. **Rien de
tout cela ne se recopie tel quel** dans le code, le README, un test ou un message
de commit. Quand le document en contient, il porte l'avertissement en tête, comme
la 0001.

## Le gabarit

| Section | Ce qu'elle porte |
|---|---|
| `# Spec NNNN - Titre` | le titre dit le chantier, pas le thème |
| `> **Statut**` / `> **Périmètre**` | cadrage validé le AAAA-MM-JJ, et l'app ou le dossier concerné |
| `> **Confidentialité.**` | seulement si le document nomme du réel |
| `## Le problème` | ce qui ne va pas aujourd'hui, du point de vue de qui le subit |
| `## Ce que contient réellement <la source>` | facultatif : le constat chiffré, en tableau, quand le lot part d'un fichier ou d'un existant mal connu |
| `## Décisions` | une sous-section `### N. <la décision>` par arbitrage |
| `## Ce qu'il faut implémenter` | un tableau fichier, nature, travail ; puis `### Le test` et `### Le README` |
| `## Recette` | une liste numérotée de vérifications |
| `## Hors périmètre` | ce qui est coupé, et où c'est parti |
| `## Questions ouvertes` | facultatif : un tableau question, enjeu, pour ce qui reste à trancher |

Prends `spec/4. done/0001-v1-to-v3.md` comme référence de forme.

## Écrire une décision

Le titre **est** la décision, à l'indicatif présent. Le corps donne l'arbitrage,
sa raison, et son effet mesuré quand il y en a un. Il dit aussi **ce qu'on perd**,
et que c'est assumé.

Pas de chemin de fichier ni de code dans une décision : ils vieillissent plus vite
que la prose, et ils ont déjà leur tableau dans `Ce qu'il faut implémenter`. La
seule exception est l'extrait issu d'un prototype qui encode la décision mieux
qu'une phrase. Un schéma ou une forme de type, par exemple, réduits à ce qui
décide.

```markdown
✅ OK
### 3. Les libellés d'établissement cessent d'être traités comme des GHT

C'est la décision structurante du lot. Les traiter comme des GHT était une
erreur. Ils deviennent des établissements identifiés par leur finess juridique.

Effet mesuré, hors article 80, année 2024 : la couverture au finess juridique de
cette plateforme passe de 39 % à 94 %.
```

```markdown
❌ KO
### 3. Amélioration du mapping

On va améliorer la gestion des libellés pour que ce soit plus robuste et mieux
adapté aux besoins, en modifiant `reconcile.ts` ligne 84.
```

Le KO ne décide rien, ne mesure rien, et date déjà par son numéro de ligne.

## Écrire la recette

Chaque point se vérifie par une commande ou par un fait observable, avec ses
chiffres quand il y en a. Une recette qu'on ne peut pas dérouler ne sert à rien.

```markdown
1. `pnpm etl` passe sans erreur.
2. `GHT Val-Rhône` contribue toujours 4 706 ambulances en 2023 dans `mart_ght`.
3. `pnpm verifier` est vert.
```

## Écrire le hors périmètre

Nomme ce que le lot ne fait pas, et où c'est parti : un brouillon dans
`0. draft`, cf. le skill `to-draft`, ou une action hors code. Un silence se lit
comme un oubli, et se réouvre en revue.

## Ce qui ne va pas là

| Ce que c'est | Où ça va |
|---|---|
| Une idée pas encore instruite | `spec/0. draft/`, cf. le skill `to-draft` |
| Une décision d'architecture durable | `docs/architecture/`, cf. le skill `doc-architecture` |
| Une convention d'écriture ou de commit | `docs/contributing/`, cf. le skill `regle-de-contribution` |
| Un cadrage versionné, ou une spec produit | `docs/specs/`, cf. `AGENTS.md § Où écrire quoi` |
| Ce que le lot a réellement livré | le README de l'app et son `CHANGELOG.md`, à la livraison |

Une carte de `spec/` est un document de travail, ignoré par git. La trace durable
d'un lot livré est le README de l'app, que la spec liste elle-même dans
`Ce qu'il faut implémenter`.
