---
name: situation-de-reference
description: Ajouter une situation de référence (« seed ») au simulateur d'éligibilité : un cas métier nommé avec ses attendus. À charger dès qu'il s'agit de couvrir un cas du modèle, d'écrire un test métier, ou de reproduire un scénario signalé par le porteur.
---

# Ajouter une situation de référence

**Une situation de référence va dans
`apps/simulateur-eligibilite/front/outils-produit/seeds/catalogue.ts`, pas dans un
fichier de test.**

C'est la source unique, et la même définition sert trois publics :

- `tests/simulateur/scenarios.test.ts` rejoue tout le catalogue et compare le moteur
  aux attendus, ce qui fait de la seed un cas de non-régression ;
- la galerie de seeds (`GalerieSeeds.tsx`) l'affiche et ouvre l'écran correspondant,
  ce qui la rend consultable ;
- `pnpm apercu-cerfa` en tire un CERFA de contrôle.

Écrire le même cas dans un `it()` le prive des deux derniers usages, et le rend
invisible à qui parcourt le catalogue pour savoir ce qui est couvert.

## La forme

```ts
{
  // kebab-case, stable : les tests, les scripts et la doc le citent.
  id: "prescripteur-ambulance",
  // Ce qu'on voit en ouvrant la seed dans la galerie.
  libelle: "Prescripteur : ambulance justifiée",
  // Pourquoi elle existe : ce qu'elle permet de voir ou de verrouiller.
  description: "…",
  // L'écran d'atterrissage : "prescripteur" (Page Résultat 1) ou
  // "secretariat" (Page Résultat 2, quand l'intérêt est le cas final).
  outil: "prescripteur",
  // Uniquement ce qui distingue cette seed. Tout le reste vient de BASE_NEUTRE.
  entrees: { p1_motif_hospitalisation: "oui", … },
  // Ce qu'on attend en sortie. Partiel : on n'annonce que ce qui la caractérise,
  // sauf `cible_regime_financement`, que toutes déclarent.
  attendu: { cible_resultat_medical: "favorable", … },
}
```

## Une seed qui s'arrête en chemin

Par défaut, une seed est complète : elle décide toutes ses cibles, ses attendus sont
vérifiés, et elle ouvre une page de résultat. Une seed peut au contraire déclarer
`atterrissage: "questionnaire"`. Elle s'arrête alors volontairement avant la fin, et
la galerie ouvre le parcours sur la première question restée sans réponse. C'est un
raccourci vers un écran, pas un cas de non-régression.

```ts
{
  id: "secretariat-saisie-adresses",
  …
  outil: "secretariat",          // obligatoire : l'ouverture passe par la passation
  atterrissage: "questionnaire",
  // `null` retire la réponse de la base neutre. Une surcharge ne saurait que la
  // remplacer, et la base répond à tout.
  entrees: { …, p2_depart_adresse: null, … },
  attendu: {},                   // elle ne décide rien : c'est son propos
}
```

`scenarios.test.ts` range ces seeds à part. Elles échappent aux attendus
obligatoires, mais doivent prouver qu'elles laissent bien une cible indécise, sans
quoi elles ouvriraient un résultat quoi qu'elles déclarent.

`entrees` et `attendu` sont typés par le contrat
(`front/simulateur/contrat-regles-publicodes.ts`) : une clé qui n'y est pas est
refusée à la compilation. Les cibles déclarables dans `attendu` sont celles de
`CIBLES_SEED`, dans `seeds/seed.ts`. Ce sont les sorties que le produit affiche, ni
les questions ni les règles intermédiaires. Une seed décrit ce qu'on voit, pas
comment le moteur y arrive.

## Vérifier

```
cd apps/simulateur-eligibilite
pnpm test scenarios       # la matrice de non-régression
pnpm verifier            # tout
```

Deux échecs sont typiques :

- **« cibles à variables manquantes »** : `BASE_NEUTRE` (`seeds/base-neutre.ts`) ne
  répond pas à une question que la nouvelle seed rend applicable. Complète la base
  neutre, sans quoi les attendus porteraient sur du vide.
- **« écarts avec les attendus »** : le moteur ne dit pas ce que tu annonces. Avant
  de corriger la seed, vérifie que c'est bien elle qui a tort. C'est souvent le
  modèle.

## Le catalogue déborde de 300 lignes, et c'est voulu

`catalogue.ts` est exempté de la limite, dans le test comme dans la configuration
Biome, et l'exemption est commentée aux deux endroits. C'est une liste de données :
la scinder pour tenir sous le seuil ne produirait qu'un découpage arithmétique, et
ferait perdre la propriété qui compte, à savoir une seule liste à lire pour
connaître tous les cas couverts.
