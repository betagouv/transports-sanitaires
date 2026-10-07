# 09: Capacités du socle pour la v10

**What to build:** ce que la v10 demande au socle et qu'il ne sait pas encore
faire. Chaque capacité est générique, testée sur le factice, et n'ajoute rien
au contrat `Model`.

**Blocked by:** 06 (le parcours).

**Status:** cadré. Rien n'est codé. Restent deux attentes côté éditeur et le détail de l'adresse.

## Décisions prises

- **D-60** L'adresse est un type de question du socle. Sa réponse est un
  objet, et le type `Answer` s'élargit.
- **D-61** Un texte trop long ne bloque jamais le PDF. Le socle applique les
  règles de l'éditeur tant qu'elles suffisent. Si le texte ne tient toujours
  pas, il est écrit en entier et déborde du cadre, comme sur un formulaire
  papier. C'est un écart au livrable, qui demande de bloquer : à signaler à
  l'éditeur.
- **D-62** Les gabarits sont ceux de Notion, « 05. LIVRABLES » :
  `PMT_cerfa_11574-07`, `DAP_cerfa_11575-08` et celui des moins de 20 ans.
  Les PDF du dossier `formulaires/` du livrable ne servent pas.
- **D-63** Avant de déborder, le socle applique les seules règles
  automatiques : réduire le corps jusqu'au plancher (9 pt visés, 8 pt au
  minimum), puis retirer le commentaire facultatif en prévenant le
  prescripteur. La reformulation à valider n'est pas reprise : depuis D-61,
  elle ne débloque plus rien.
- **D-64** Le simulateur n'existe que dans le navigateur.
- **D-65** La recherche d'acte de Q2.1 porte sur la sélection de l'éditeur :
  16 profils, 3 suggestions, leurs synonymes, et « je ne trouve pas ». Pas
  sur les index CCAM et NABM entiers.
  C'est conforme au livrable : `QUALIFICATION_PRESTATIONS.md` désigne la
  sélection comme le dictionnaire des intitulés courants, et le contrat des
  saisies veut « l'identifiant stable du libellé usuel », « jamais un code
  brut ».
- **D-66** Chaque capacité a ses tests sur des pages écrites dans le test, et
  une page de démonstration dans le factice.
- **D-67** Un texte qui déborde continue sous son cadre, quitte à recouvrir
  ce qui s'y trouve.
- **D-68** La taille visée et la taille plancher du texte viennent d'un
  fichier de configuration du socle, qu'une nouvelle version du modèle peut
  modifier. Le contrat `Model` ne change pas.

## Ce que ces décisions entraînent

- **D-60.** Une réponse n'est plus seulement une chaîne, un nombre ou une
  liste. La comparaison de deux réponses, l'effacement des dépendances, les
  seeds et la trace doivent accepter un objet. Les règles postales françaises
  entrent dans le socle.
- **D-61.** `fillCerfa` lève aujourd'hui `TextOverflowError` et ne produit
  aucun PDF. Cette règle s'inverse. Un champ AcroForm coupe ce qui dépasse de
  son cadre : pour déborder, le texte se dessine sur la page, hors du champ.
  L'écran « PDF bloqué » sort de l'inventaire.

## Inventaire

Tiré de `CONTRAT_SAISIES_ET_PAGES.md`, `SPECIFICATION_NAVIGATION.md`,
`COMPLETION_DOCUMENTS.md`, `mapping_documents.json` et du catalogue des
questions, puis confronté au socle.

### Ce que le socle sait déjà faire

| Besoin de la v10 | Dans le socle |
|---|---|
| Sous-questions conditionnelles sur la même page (Q2.1.a à k, Q2.6, Q2.8) | `askedIf` par question, plusieurs questions par page |
| « Aucune » exclusive (Q1.3, Q2.2.1, Q2.6, Q3.7) | `exclusiveOption` |
| Avance immédiate, « Suivant » au retour | `auto-advance.ts` |
| Effacement des seules réponses dépendantes | `dependsOn`, `page-commit.ts` |
| Stepper en parties, trois ou quatre segments | D-45 |
| Verrou, pas de retour en P2 depuis P3 | `simulateur/start.ts` |
| Questions de P3 qui lisent la préconisation figée | `askedIf(answers, cibles)` (D-44) |
| PDF produit dans le navigateur, sans texte coupé | `fillCerfa`, `TextOverflowError` |

### Saisie

| Capacité | Demandée par | Écart | Poids |
|---|---|---|---|
| Cartes radio | Q0.1 | Une option n'a pas d'explication. Ajouter une description et le rendu DSFR. | petit |
| Liste déroulante | Q3.2, Q3.3 | `SelectField` existe, aucun `kind` ne le rend. | petit |
| Question facultative | complément d'adresse, commentaire de Q3.4, case de Q2.3.2 | Toute question affichée est obligatoire. | petit |
| Entier strict | Q3.1 | `number` accepte les décimales. | petit |
| Bornes de date et d'heure | Q2.8, Q3.6 | `date` et `datetime` n'ont ni minimum ni maximum. | petit |
| Valeur déjà connue, en lecture seule | 17 questions : Q2.1, Q2.1.f, Q2.1.k, Q2.2.1, Q2.2.3, Q2.3.2, Q2.3.4, Q2.5, Q2.6, Q2.11, Q2.13, Q2.14, Q3.2, Q3.3, Q3.4, Q3.7, Q3.8 | Une page ne contient que des questions. Voir « Ce que l'éditeur fixe ». | moyen |
| Validation croisée | Q3.1 contre Q2.3.3, début avant fin, code postal selon le pays, extrémité contre le segment verrouillé | `errorOf` ne voit qu'une réponse. | moyen |
| Adresse, type du socle (D-60) | Q3.2, Q3.3, Q3.8 | Aucun type. La réponse devient un objet. | moyen |
| Options qui dépendent des réponses | Q1.3 (option 6), Q2.2.1, Q2.6, Q2.13, Q3.2, Q3.3 : « ne proposer que les situations compatibles et encore inconnues » | Les options d'une question sont une liste fixe. | moyen |
| Libellé qui dépend des réponses | Q1.4 (« en toute autonomie » ou « avec l'aide d'un proche »), Q2.2.1 (libellé de « Aucune ») | Le libellé d'une question et d'une option est un texte fixe. | petit |
| Liste filtrable (D-65) | Q2.1.c, Q2.1.d | Rien. Une vingtaine d'options embarquées, filtrées sur le libellé et les synonymes, accessible au clavier, avec « je ne trouve pas ». Aucun chargement à la demande. | moyen |

### Ce que l'éditeur fixe sur la lecture seule et l'adresse

- **Jamais de seconde saisie.** « Les valeurs déjà établies sont affichées en
  lecture seule, sans seconde saisie. » Une valeur reprise n'est donc pas une
  réponse : elle se calcule à l'affichage.
- **Deux formes d'affichage.** Un rappel en clair (Q2.1, Q2.2.1, Q3.2 : « sans
  case à recocher »). Et, dans un choix multiple, des cases « reprises cochées
  en lecture seule » (Q2.3.2, Q3.7), que « Aucune » n'efface pas. « Aucun »
  devient indisponible dès qu'une case est acquise.
- **Le pays.** « Pays si hors France. » En France, un code postal de cinq
  chiffres. Hors France, le pays est obligatoire et le code postal suit le
  format local. L'éditeur ne dit pas comment le pays se saisit.

### Résultats

| Capacité | Demandée par | Écart | Poids |
|---|---|---|---|
| Impression de la fiche | R2 | `printLabel` n'est pas lu. | petit |
| Téléchargement du PDF | R3 | `downloadLabel`, `template` et `mapping` ne sont pas lus. C'est le reste du chantier 06. | moyen |
| Texte trop long : règles de l'éditeur, puis débordement (D-61) | adresses, texte médical | `fillCerfa` refuse aujourd'hui d'écrire. | moyen |

### PDF

- **Les gabarits de Notion (D-62).** Trois fichiers, tous en AcroForm : PMT
  (53 champs), DAP (56 champs), moins de 20 ans (46 champs). Le DAP et le
  moins de 20 ans sont identiques à l'octet à ceux que le dépôt portait avant
  la v10. Le PMT a été réenregistré le 26 août 2026 : mêmes champs, mêmes
  positions, même texte.
- **Les PDF du livrable.** `S3138g.pdf` et `S3139h.pdf` sont les spécimens
  publiés sur ameli.fr : filigrane « SPECIMEN », aucun champ. `S3141.pdf` est
  le même fichier que celui de Notion.
- **Un écart de texte.** Les spécimens datent de février 2026 et ont deux
  corrections que nos gabarits n'ont pas : une référence légale perd la
  mention « annexe VI », et le DAP écrit « prescripteur » là où le nôtre écrit
  « descripteur ». À signaler à l'équipe.
- **Le numéro du troisième formulaire.** Il porte le cerfa 16184*01, la
  référence S3141, et sa notice le numéro 52996#01. Notion le nomme par la
  notice, le livrable par la référence.
- **Conséquence.** `fillCerfa` écrit dans des champs sur les trois formulaires.
  Aucune écriture par coordonnées n'est nécessaire, hors soulignement et
  débordement.
- **Le mapping.** 182 lignes, sans aucune coordonnée : chaque cellule est
  décrite en prose. Écrire sur les PDF sans champs demande de relever chaque
  position, volet par volet.
- **Les sept rendus.** `checkbox` (74), `text` (39), `joined_address` (36),
  `date_fr` (12), `underline_printed_label_and_shared_address` (12),
  `checkbox_expression` (6), `integer` (3). Tous sont du calcul, que le mapping
  du modèle fait avec `textFrom` et `formatDateForField`. Le soulignement
  n'est plus nécessaire : voir « Problèmes restants ».
- **Le corps du texte.** Le livrable vise 9 pt, plancher 8 pt. Le socle a 10 et
  6 en constantes.

### Hors de ce chantier

- Le verrou serveur : l'éditeur l'a retiré du livrable (D-64). Le socle ne
  garde rien entre deux chargements et n'a pas d'URL par écran : recharger
  recommence une simulation, sans garde à écrire.
- Le retour différent (Q2.12) et les deux simulations : une question du modèle,
  pas une capacité.
- La concaténation d'une adresse et la composition du texte médical : le
  mapping du modèle.

## Proposé, à confirmer

- **L'ordre suit le questionnaire.** D'abord ce que P0 à P2 et R2 demandent,
  puis P3 et R3 sur le S3141, puis PMT et DAP. La v10 peut ainsi s'intégrer
  partie par partie.
- **Une capacité entre dans le socle par un commit**, avec ses tests et sa
  page de démonstration. Son usage par le modèle v10 vient dans un autre.
- **La lecture seule : en attente.** Le livrable demande l'affichage à 21
  endroits et reste ambigu à 24 autres. L'éditeur a dit à l'oral qu'une question
  déjà répondue ne doit pas être affichée. La contradiction lui est remontée
  dans Notion (« v10 : préciser quand une valeur "en lecture seule" doit être
  réaffichée »). D'ici sa réponse, rien n'est réaffiché : la valeur sert
  seulement à déduire le fait, et la capacité n'est pas construite.
- **Le pays : en attente de l'éditeur.** Notre préférence est une case « Adresse
  hors de France », qui fait apparaître le pays en texte libre et lève la
  règle des cinq chiffres. La question lui est posée avec les deux autres
  possibilités (liste déroulante, champ toujours visible).

## Problèmes restants

### En attente d'une réponse de l'éditeur

1. **La lecture seule.** Réafficher une valeur connue, ou seulement la
   réutiliser. La capacité n'est pas construite d'ici là.
2. **Les deux blocages avant un résultat.** Un équipement bariatrique
   incompatible avec le mode (avant la fin de P1), et deux segments
   incompatibles (avant R2). La validation croisée sait bloquer, mais la
   règle n'est pas écrite dans le livrable.

   Un segment est un sens du trajet : l'aller, ou le retour. Ce n'est pas une
   contradiction entre réponses, que le moteur de questionnaire empêche déjà.
   Le prescripteur peut déclarer un retour différent de l'aller (catalogue,
   ligne 487). Chaque segment est alors qualifié à part. S'ils ne donnent pas
   le même mode, le même financeur et le même document, le livrable demande
   de bloquer et de faire deux simulations.

   Le socle n'a aucune notion de segment : une réponse par question, une
   préconisation par simulation. Le YAML non plus : il reçoit un seul jeu de
   faits et un booléen `fait_seconde_branche_incompatible`. La comparaison des
   deux segments est donc laissée à l'application, qui devrait poser P2 deux
   fois et calculer deux préconisations. C'est plus qu'une question du modèle
   (D-46), et cela relève du chantier 10.

### Conception à arrêter

3. **L'adresse (D-60).** Moins lourd qu'annoncé. Quatre fichiers du socle
   manipulent une réponse. La comparaison de deux réponses accepte déjà un
   objet, et l'audience ne lit aucune réponse. Restent deux points : une
   question ne porte aujourd'hui qu'un message d'erreur, et l'adresse en
   demande un par champ ; le pays reste proposé (case « Adresse hors de
   France »).

Tranchés : le débordement va sous le cadre (D-67), la taille du texte vient
d'un fichier de configuration du socle (D-68), la liste filtrable s'écrit dans
le socle, et la page de démonstration disparaît avec le factice.

### Demandes du livrable qu'un programme ne sait pas tenir

Non implémentées, et notées dans les points à remonter à l'éditeur.

8. **Rejeter un texte libre contradictoire** (Q3.4, Q3.5) : « toute nouvelle
   indication, nature d'acte, régime ou urgence contradictoire doit être
   rejetée ».
9. **Vérifier le format postal local** d'une adresse hors de France.
10. **Bloquer le PDF pour une adresse « clairement incompatible »** avec le
    lieu ou la tranche de distance déclarés (Q3.2), sans déduire un seuil
    routier d'une distance à vol d'oiseau.

### Résolu en regardant les gabarits

- **Le soulignement n'est plus nécessaire.** Les trois gabarits ont un champ
  de texte par type de lieu : « autre lieu » et « structure de soins », au
  départ et à l'arrivée, plus une case « domicile ». L'adresse s'écrit dans le
  champ du type retenu. Les rendus `underline_printed_label_and_shared_address`
  et `joined_address` du mapping répondaient aux spécimens sans champs.

## Critères d'acceptation

- [ ] Chaque capacité a sa tâche, avec un test sur le factice.
- [ ] Aucune n'a modifié le type `Model`.
