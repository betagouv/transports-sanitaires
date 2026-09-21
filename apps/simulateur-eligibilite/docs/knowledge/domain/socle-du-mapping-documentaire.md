# Une transcription unique du mapping documentaire

> **Statut** : implémenté le 2026-09-10 (ex-spec 0006).
> **Périmètre** : dossiers `front/simulateur/secretariat/` et
> `front/outils-produit/beta/cerfa/`. Le modèle de règles n'est pas touché, le
> catalogue de seeds non plus. Rien ne change à l'écran.
>
> **Prérequis des specs 0007, 0008 et 0009** (mapping du PMT, de la DAP et du
> S3141 depuis ce socle), qui consomment ce que ce lot pose. Elles sont
> indépendantes entre elles.

> **Confidentialité.** Ce document ne nomme aucune donnée réelle. Le
> [Google Sheet](https://docs.google.com/spreadsheets/d/1NXQzQUwJdK7dfTg3GYctjIwmkk2Y21tImo0-DwaGzc4/edit?gid=2040210112)
> qu'il cite non plus.

## Le problème

Le porteur tient un référentiel de mapping documentaire : pour chaque case des trois
Cerfa, il nomme la règle qui la remplit, la condition d'existence et le rendu attendu. La
[page Notion](https://app.notion.com/p/3d63fa01860780109589de9916918661) qui le décrit est
sans ambiguïté sur son statut : c'est **le contrat de correspondance** entre le simulateur
et le document remis au patient, et le développeur ne doit « pas reconstruire une règle
réglementaire à partir de l'interface ».

Le dépôt en lit la moitié.

| Ce qui existe | Ce qu'il en lit |
|---|---|
| La checklist du Bloc 3, `front/simulateur/secretariat/rubriques-*.ts` | les lignes que publicodes tranche, et elles seules |
| Le pré-remplissage PDF, `front/outils-produit/beta/cerfa/` | rien : il dérive les cases lui-même, sur une logique antérieure au mapping |

Compté ligne à ligne, l'écart est le suivant.

| Formulaire | Lignes de l'onglet | Déclarées aujourd'hui | Manquantes |
|---|---|---|---|
| PMT | 64 | 36 | 28 |
| DAP | 71 | 42 | 29 |
| S3141 | 55 | 29 | 26 |

Les manquantes sont toujours les mêmes familles : l'en-tête bénéficiaire et assuré,
l'organisme, les six composants d'adresse par extrémité, les éléments d'ordre médical, le
bloc prescripteur et structure, la date de prescription, la signature, le cadre
transporteur et, sur la DAP, l'avis de la caisse. Le PDF a un champ pour chacune. La
checklist n'en a pas besoin, le pré-remplissage si.

Trois conséquences, qui se cumulent.

- **Le pré-remplissage cite des règles que le mapping ne désigne pas.** Il lit
  `p1_critere_position_allongee_demi_assise` et compare `MODE.assisTPMR` là où la feuille
  nomme `cible_ambulance_position_allongee_demi_assise` et `cible_fauteuil_roulant`. Ce
  sont les dérivations que la v9.7 a justement rapatriées dans le modèle, parce que
  l'application se trompait.
- **Une douzaine de champs restent vierges alors que le modèle les tranche.** Les deux
  cases de mode non professionnalisé, l'ALD exonérante ou non, l'exonération du ticket
  modérateur, la pension militaire, le centre de référence maladies rares, les trois dates.
  Chacun porte aujourd'hui un `auPrescripteur("hors modèle")` qui n'est plus vrai.
- **Rien ne confronte le code à la feuille.** Une ligne ajoutée par l'éditeur à la
  prochaine livraison ne casse rien et n'apparaît nulle part.

## Décisions

### 1. La transcription du mapping vit en un seul endroit, dans `secretariat/`

Les fichiers `rubriques-*.ts` sont déjà la transcription de l'onglet, faite depuis le même
YAML documentaire. Ils la portent en entier, et non plus à moitié.

Une seconde transcription sous `cerfa/` était l'autre option. Elle a été écartée : la même
feuille recopiée deux fois, ce sont deux copies qui divergent à la première livraison, et
la condition `p1_ald_validee` écrite deux fois.

Le sens de la dépendance impose l'emplacement. `tests/architecture.test.ts` interdit à
`front/simulateur/` d'importer `front/outils-produit/`, et l'autorise dans l'autre sens.
La transcription reste donc dans le secrétariat, et le Cerfa la lit.

Ce qu'on perd : les trois fichiers de rubriques, livrés en v0.3.0, sont retouchés en
entier. C'est assumé, ils sont jeunes et leur forme ne change pas.

### 2. Chaque ligne porte son origine, et la checklist filtre dessus

Le mapping range chaque ligne sous une des quatre origines de sa légende : `Publicodes`,
`Application`, `Externe / manuel`, `Manuel / destinataire`. C'est cette colonne qui dit ce
que l'application a le droit de faire de la ligne.

Elle devient un champ de `CaseDeFormulaire`. La checklist du Bloc 3 ne garde que
`publicodes` et `application` : à l'écran, rien ne change. Le pré-remplissage lit tout, et
tire de l'origine ce qu'il laisse vierge et à qui.

Effet secondaire voulu : la raison d'un champ vierge cesse d'être écrite à la main dans le
tableau de remplissage. Elle vient de la feuille.

### 3. L'évaluation d'une case passe par un lecteur, pas par le moteur de l'app

`case-de-formulaire.ts` évalue aujourd'hui contre `typeof moteur`, le singleton de module.
Le Cerfa, lui, a son propre `Engine` et sa propre `Situation`, et il ne peut pas importer
ce singleton : `scripts/verifier-bundle.ts` interdit au moteur d'entrer dans le chunk
chargé au clic.

L'évaluation prend donc en argument un **lecteur**, une fonction de la clé de règle vers sa
valeur. Le secrétariat lui passe son moteur positionné, le Cerfa lui passe le sien. C'est
la forme qu'ont déjà `texte`, `vrai` et `faux` dans `front/simulateur/moteur.ts`, et celle
de `Reponses` dans `cerfa/reponses.ts`.

### 4. Les dates s'écrivent au format que le champ impose, pas au format que la feuille annonce

La feuille annonce `date_fr`, soit `DD/MM/YYYY`. Relevé par introspection sur les trois
gabarits, **tous les champs de date sont peignés**, la plupart à huit cases. Y écrire dix
caractères lève, `remplir-cerfa.ts` refusant toute valeur plus longue que le champ.

La règle devient : huit cases donnent `JJMMAAAA`, dix cases donnent `JJ/MM/AAAA`. Le
nombre de cases se lit sur le champ du PDF, il ne se déclare pas dans le tableau. Deux
champs seulement sont à dix, `date id` et `date fait` sur la DAP.

C'est un écart au rendu annoncé par la feuille, assumé et documenté : les cases peignées
du Cerfa officiel ne prennent pas de séparateur.

### 5. Le trajet se lit sur les cibles documentaires, et couvre les six types de lieu

`lieux-du-trajet.ts` compose l'adresse depuis les six questions `p2_depart_*`. Le mapping
nomme six cibles pour cela, `cible_document_depart_nom` et ses sœurs, qui aliasent
exactement ces questions. Ce sont elles que le code lit désormais : c'est le vocabulaire du
contrat, et l'alias peut cesser d'en être un.

Le mapping tranche aussi le placement des six types de lieu de la v9.7, que le code
n'assumait que pour deux :

| Ligne du Cerfa | Types de lieu |
|---|---|
| domicile, une case | `Domicile` |
| structure de soins, une ligne de texte | `Structure de soins`, `USLD` |
| autre lieu, une ligne de texte | `EHPAD`, `Autre lieu`, `Établissement pénitentiaire` |

Aujourd'hui `EHPAD`, `USLD` et `Établissement pénitentiaire` ne sont placés nulle part :
l'adresse disparaît du document. C'est une correction, pas une préférence.

## Ce qu'il faut implémenter

| Fichier | Nature | Travail |
|---|---|---|
| `front/simulateur/secretariat/case-de-formulaire.ts` | modifié | `origine` sur `CaseDeFormulaire`, `publicodes` par défaut. `source` et `libelle` facultatifs pour les origines que le moteur ne tranche pas. `rubriquesRetenues` filtre sur l'origine. L'évaluation passe par un lecteur, décision 3. Exporter `casesParId(rubriques)`, l'index dont le Cerfa a besoin. |
| `front/simulateur/secretariat/rubriques-communes.ts` | modifié, sans doute scindé | Les familles partagées par les trois onglets : en-tête bénéficiaire et assuré, les six composants d'adresse par extrémité, le bloc prescripteur et structure, la date de prescription, la signature. |
| `front/simulateur/secretariat/rubriques-du-pmt.ts` | modifié | Les 28 lignes manquantes de l'onglet `PMT`, dont `organisme`, `elements_medicaux` et `cadre_transporteur`. Total : 64. |
| `front/simulateur/secretariat/rubriques-de-la-dap.ts` | modifié | Les 29 lignes manquantes de l'onglet `DAP`, dont `avis_caisse`. Total : 71. |
| `front/simulateur/secretariat/rubriques-du-s3141.ts` | modifié | Les 26 lignes manquantes de l'onglet `PMT_Moins20`. Ni organisme, ni éléments médicaux : l'onglet n'en a pas. Total : 55. |
| `front/outils-produit/beta/cerfa/mapping.ts` | créé | `depuisLeMapping(rubriques, id, état?)`, qui rend un `Remplissage` de `remplissage.ts` à partir d'un id de la feuille : il applique le `quand`, puis rend `{ coché }`, `{ texte }` ou rien selon le `rendu`, et le `laisséÀ` correspondant pour les origines `externe` et `manuel`. Plus `adresseSurLaLigne(id)`, qui compose les six composants pour une ligne `address_line_selector`. |
| `front/outils-produit/beta/cerfa/dates.ts` | créé | La décision 4. Une fonction de la date ISO et du nombre de cases vers la chaîne à écrire. |
| `front/outils-produit/beta/cerfa/lieux-du-trajet.ts` | modifié | La décision 5 : les six cibles documentaires, et les trois familles de lieu. |
| `front/outils-produit/beta/cerfa/reponses.ts` | modifié | `LIEU` gagne les valeurs manquantes si besoin, et `VALEURS_COMPAREES` suit. `MODE` reste, la 0007 et la 0008 diront s'il sert encore. |
| `tests/cerfa/mapping.test.ts` | créé | Cf. ci-dessous |

Attention à la limite de 300 lignes par fichier, assertée dans
`tests/architecture.test.ts`. `rubriques-communes.ts` en fait 235 et double.
`rubriques-de-la-dap.ts` en fait 153. Scinder par bloc du formulaire, en-tête, mode,
trajet, prescripteur, plutôt que d'allonger.

### Le test

La couture est celle qui existe déjà pour le Cerfa : le moteur réel, sans mock, sur des
situations du catalogue de seeds. On y ajoute une couture de contrat, plus haute, qui ne
touche pas au PDF.

`tests/cerfa/mapping.test.ts`, nouveau :

- **le compte de lignes par formulaire est figé** : 64, 71, 55. C'est la garantie qu'une
  ligne ajoutée ou retirée par l'éditeur se voit ;
- les ids sont uniques à l'intérieur d'un formulaire ;
- chaque `source` déclarée s'évalue sur le moteur réel, sur une situation du catalogue.
  Le contrat de règles la garantit déjà à la compilation, le test le confirme à
  l'exécution ;
- toute ligne d'origine `publicodes` ou `application` porte une `source` ; aucune ligne
  d'origine `externe` ou `manuel` n'en porte ;
- une date rendue sur huit cases donne `JJMMAAAA`, sur dix `JJ/MM/AAAA`, et une valeur qui
  n'a pas la forme ISO ressort telle quelle.

Les tests existants du Bloc 3, qui rendent la checklist sur `<App />`, ne changent pas et
doivent rester verts : c'est la preuve que la décision 2 ne modifie rien à l'écran.

### Le README

| Fichier | Travail |
|---|---|
| `apps/simulateur-eligibilite/AGENTS.md`, § « Le CERFA » | Dire que le tableau de remplissage nomme des ids du mapping documentaire, et que la correspondance id vers règle vit dans `front/simulateur/secretariat/`. La phrase « chaque champ du PDF est une clé du tableau de remplissage » reste vraie et le reste. |
| `apps/simulateur-eligibilite/README.md` | Ajouter le Google Sheet à la liste des sources externes, à côté du paquet de l'éditeur. |

## Recette

1. `cd apps/simulateur-eligibilite && pnpm verifier` est vert.
2. `tests/cerfa/mapping.test.ts` compte 64, 71 et 55 lignes.
3. Retirer une ligne d'un fichier de rubriques fait échouer ce test, et lui seul.
4. Le Bloc 3 du Résultat 2 affiche exactement les mêmes cases qu'avant sur trois seeds du
   catalogue, une par formulaire : la décision 2 ne se voit pas.
5. `pnpm build` puis `verifier-bundle` : le chunk d'entrée ne contient toujours ni
   `pdf-lib` ni le catalogue de seeds. C'est ce que la décision 3 protège.
6. `pnpm apercu-cerfa` produit toujours un PDF, identique à celui d'avant le lot : aucun
   tableau de remplissage n'a encore changé.

## Hors périmètre

- **Rebâtir les tableaux de remplissage.** C'est la 0007 pour le PMT, la 0008 pour la DAP,
  la 0009 pour le S3141. Ce lot pose le socle et ne change aucun PDF.
- **Les éléments d'ordre médical.** Le mapping les attribue à l'application sans qu'elle
  puisse les produire : cf.
  [`composer-les-elements-medicaux.md`](composer-les-elements-medicaux.md). La ligne est
  déclarée d'origine `application`, sans source, et le Cerfa la laisse au prescripteur.
- **L'identité du patient, du prescripteur et de la structure.** Le simulateur est anonyme
  par construction et le référentiel d'identification ne porte que des libellés. Les
  lignes sont déclarées, l'origine `externe` dit pourquoi elles restent vierges.
- **Engendrer les rubriques depuis le YAML documentaire.** Le paquet le porte, et une
  génération éviterait la recopie. Elle demanderait de charger un quatrième YAML au build
  et de traduire ses conditions. À rouvrir si la recopie se met à coûter, pas avant.
