# Les règles de commit

> Les 8 règles `GIT-*`. Les conventions du dépôt sont dans
> [`../../AGENTS.md`](../../AGENTS.md), les règles de code dans
> [`regles-de-code.md`](regles-de-code.md).

**8 règles**, mêmes conventions que les `QUAL-*`. Cite l'identifiant plutôt que de
reformuler la règle.

| Id | Règle | Garde |
|---|---|---|
| GIT-001 | Travailler sur `main` par défaut | aucune |
| GIT-002 | Une branche pour le structurant qu'aucun drapeau ne masque | aucune |
| GIT-003 | Conventional Commits, scope entre parenthèses | aucune |
| GIT-004 | Sujet en français, 3ᵉ personne de l'indicatif présent | aucune |
| GIT-005 | Corps argumenté : ce qui change, et surtout pourquoi | aucune |
| GIT-006 | Terminer par l'état de vérification | aucune |
| GIT-007 | Aucune métadonnée d'IA | aucune |
| GIT-008 | Relire le diff et le message avant de commiter sur `data-analyzer` | aucune |

Aucune de ces règles n'a de garde. GIT-003 et GIT-007 sont pourtant mécanisables
par un hook `commit-msg`, que le dépôt n'a pas. Les six autres sont du jugement,
et restent à la relecture.

---

### GIT-001 - Travailler sur `main` par défaut

> Raison : une branche coûte une divergence à réconcilier. Le dépôt a un seul
> auteur, et un feature flag masque presque tout travail en cours. La divergence
> ne se paie donc presque jamais.

Commiter directement. Pas de branche de fonctionnalité, pas de PR. Le doute se
tranche vers `main` : si un drapeau *pourrait* masquer le travail, il n'y a pas
de branche à ouvrir.

**Exemples**

```bash
# ✅ OK : le travail est masquable, il va sur main
git commit -m "feat(simulateur): ajoute le bloc Article 80, derrière un drapeau"
```

```bash
# ❌ KO : une branche ouverte pour un travail qu'un drapeau masquerait
git switch -c feat/bloc-article-80
```

*Aucune garde.* C'est du jugement, pas de la forme.

---

### GIT-002 - Une branche pour le structurant qu'aucun drapeau ne masque

> Raison : certains changements touchent l'ossature, au point qu'aucun drapeau ne
> rendrait le produit livrable à mi-chemin. Les livrer par morceaux casserait le
> produit entre deux commits.

L'ossature, c'est le modèle de règles, l'enchaînement des écrans, le format d'un
livrable. Le changement vit alors sur une branche jusqu'à ce qu'il tienne debout,
puis rejoint `main` d'un bloc.

**Exemples**

```
✅ OK : le format du livrable change, rien ne le masque à mi-chemin
la mise à disposition de la PMT au format PDF
```

```
❌ KO : un drapeau suffirait, donc pas de branche
un bloc de résultat en plus, caché tant qu'il n'est pas relu
```

*Aucune garde.* C'est du jugement, pas de la forme.

---

### GIT-003 - Conventional Commits, scope entre parenthèses

> Raison : le type dit d'un coup d'œil si le commit change le produit. Le journal
> des versions groupe ses lignes par type, et se construit à partir de là.

Le scope va entre parenthèses (`simulateur`, `data-analyzer`, `identification`)
quand le changement est circonscrit à une app. Un changement qui traverse le
dépôt n'en porte pas.

**Exemples**

```
✅ OK
docs(simulateur): refait les liens de commit du journal après la réécriture
build: passe le dépôt en workspace pnpm
```

```
❌ KO
Mise à jour du journal des versions
update simulateur
```

*Aucune garde.* Un hook `commit-msg` la porterait.

---

### GIT-004 - Sujet en français, 3ᵉ personne de l'indicatif présent

> Raison : le sujet décrit ce que le commit fait au dépôt, pas ce qu'on demande à
> quelqu'un. L'impératif s'adresse à un lecteur, l'infinitif ne s'adresse à
> personne.

Même règle pour les lignes du journal des versions, qui décrivent un commit.

**Exemples**

```
✅ OK
coupe aux jointures du sens
plafonne les fonctions à 30 lignes
rend les invariants d'architecture exécutables
```

```
❌ KO
couper aux jointures du sens          (infinitif)
Plafonnez les fonctions à 30 lignes   (impératif)
make architecture invariants runnable (anglais)
```

*Aucune garde.* C'est du jugement, pas de la forme.

---

### GIT-005 - Corps argumenté : ce qui change, et surtout pourquoi

> Raison : le diff dit déjà ce qui change. Le corps sert à ce qu'il ne dit pas :
> pourquoi, et ce qu'on a écarté. Un renommage non nommé ne se retrouve plus.

Nommer les renommages un par un. Argumenté ne veut pas dire littéraire : des
phrases normales.

Ne pas dépasser deux paragraphes.

**Exemples**

```
✅ OK
pnpm ne résout pas les dépendances fantômes, ce qui a révélé une déclaration
manquante : `glossaire-notion` compilait avec `types: ["node"]` sans avoir
jamais listé `@types/node`, que le hoisting npm lui fournissait. La dépendance
est déclarée.
```

```
❌ KO
Corrige un problème de dépendances.
```

*Aucune garde.* C'est du jugement, pas de la forme.

---

### GIT-006 - Terminer par l'état de vérification

> Raison : un message muet sur ce qui a été passé laisse croire que tout l'a été.
> L'état de vérification rend le commit relisible sans avoir à le rejouer.

**Exemples**

```
✅ OK
Vérification : 414 tests verts, bundle et aperçu CERFA inchangés.
```

```
❌ KO
Tout fonctionne.
```

*Aucune garde.* C'est du jugement, pas de la forme.

---

### GIT-007 - Aucune métadonnée d'IA

> Raison : un message de commit dit ce qui change et pourquoi. Par qui n'apprend
> rien à qui relit l'historique, et ces noms changent bien plus vite que le
> dépôt.

Nulle part, trailers compris. Ni le nom d'un outil, ni celui d'un modèle, ni un
numéro de version, ni un lien de session.

**Exemples**

```
✅ OK
docs: interdit toute métadonnée d'IA dans les messages de commit

La règle précédente imposait un trailer et se contentait d'interdire le nom du
modèle à l'intérieur. C'était le mauvais partage.
```

```
❌ KO : les trailers, sous n'importe quel nom
docs: interdit toute métadonnée d'IA dans les messages de commit

Co-Authored-By: <un modèle>
Claude-Session: <une URL de session>
```

*Aucune garde.* Un hook `commit-msg` la porterait, et c'est celle qui s'y prête
le mieux : le motif est fixe.

---

### GIT-008 - Relire le diff et le message avant de commiter sur `data-analyzer`

> Raison : le monorepo est public, les données et l'identité des fournisseurs ne
> le sont pas. Un nom de fournisseur fuite par un commentaire, un nom de
> variable, un fichier de test ou le message lui-même.

Relire les deux, pas seulement le diff. Voir
[`apps/data-analyzer/AGENTS.md`](../../apps/data-analyzer/AGENTS.md).

**Exemples**

```
✅ OK : le message ne nomme qu'un rôle
feat(data-analyzer): rattache la plateforme au niveau GHT par mapping manuel
```

```
❌ KO : le message nomme le fournisseur
feat(data-analyzer): rattache les GHT de <nom du fournisseur> par mapping manuel
```

*Aucune garde.* `gitleaks` scanne les secrets, pas les noms de fournisseurs. La
liste des fournisseurs ne peut pas vivre dans un dépôt public, ce qui est la
raison même de la règle.
