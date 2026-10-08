# 10: Intégration de la v10

**What to build:** le modèle v10 de l'éditeur, écrit dans `front/model/`, à la
place du factice. Un prescripteur déroule le vrai questionnaire, lit sa
préconisation et télécharge son cerfa.

**Blocked by:** 02 à 09.

**Status:** étapes 1 et 2 codées. Sept étapes (D-69). Les étapes 3 et 4 attendent l'éditeur.

## Décisions prises

- **D-04** La v10 est la référence de structure.
- **D-64** Le simulateur n'existe que dans le navigateur.
- **D-65** La recherche d'acte de Q2.1 porte sur la sélection de l'éditeur.
- **D-69** Sept étapes, dans l'ordre du questionnaire.
- **D-74** Les rubriques d'identité du cerfa restent vides : le rattachement
  n'est pas le « contexte fiable » du livrable.
- **D-73** Pas de mécanisme pour désactiver les positifs : staging pendant la
  recette, puis la production d'un bloc.
- **D-72** Pour les cerfa, le package fait foi, pas le Google Sheet.
- **D-71** `publicodes` figé en 1.10.1, YAML converti à la compilation,
  modèle chargé à la demande.
- **D-70** Le dépôt ne garde que le YAML et `VERSION`. Le reste du livrable
  est retranscrit dans `front/model/`. Un script local compare nos
  déclarations au package à chaque livraison.
- Décisions du 2026-10-06, antérieures à ce plan : le questionnaire est déclaré
  par l'application, publicodes ne fait que décider ; seules les réponses
  dépendantes sont effacées ; une saisie ne compte qu'au « Suivant ».

## Où va chaque pièce du livrable

| Livrable | Dans le modèle |
|---|---|
| Catalogue des questions, contrat des saisies | les parties et les déclarations |
| YAML publicodes, faits, preuve Q2.1, nomenclatures | `preconisation`, `rules/` |
| Fiche R2 | `transportAndEligibility.Resultat` |
| Inventaire des issues et de leur support | `cerfa.form` |
| Catalogue de P3 | `cerfa.part` |
| R3, `mapping_documents.json`, gabarits | `cerfa.Resultat`, `cerfa.form` |
| Oracle D01 à D25 | `tests/model/` |

## La livraison corrigée du 6 octobre

L'éditeur a relivré la v10.0.0. Sept fichiers ont changé : le README, le
catalogue, la navigation, les deux contrats publicodes, le protocole de recette
et le test du moteur. Le YAML garde ses 58 faits et ses 44 cibles, le
dictionnaire ses 89 cibles, le mapping ses 182 lignes.

- **Plus de serveur (D-64).** Verrou, trace et marqueurs de complétude sont
  dans le navigateur. Recharger la page recommence une simulation. Deux
  onglets sont indépendants. Le verrou est un invariant de navigation, pas une
  protection contre la manipulation.
- **Une règle de travail.** En cas de divergence qui change le résultat, la
  branche oriente vers la caisse. Simon signale la divergence et ne tranche
  pas une question juridique.
- **Le blocage des segments incompatibles** est désormais testé par le moteur.

## Ce que le livrable laisse à l'application

- **Passer des réponses aux faits.** Le YAML reçoit 58 faits « prouvés ».
  C'est `preconisation.faits`, et c'est le cœur du travail. Voir « Le lien
  entre les questions et les faits ».
- **Le moteur de preuve de Q2.1.** `selection_q21.json` liste 16 profils et 3
  suggestions. Seuls ces profils peuvent donner `COUVERTE`. Les familles 3, 5,
  14 et 15 n'en ont aucun : elles restent indéterminées.
- **La recherche d'acte.** L'index CCAM (8 558 actes, 3 Mo) ne mène à aucun
  positif dans cette livraison. Côté biologie, seules la NFS et la CRP sont
  qualifiantes.
- **L'oracle.** `oracle_cas.json` décrit les 25 cas en prose.
  `test_publicode.mjs` les porte en faits, numérotés D01 à D25 : l'étape 1
  les reprend tels quels.
- **Le mapping.** 182 lignes qui décrivent des cellules en prose. Nos gabarits
  ont des champs nommés (D-62) : il faut une table de correspondance, écrite à
  la main, de la cellule au champ.
- **Deux segments incompatibles.** Quand l'aller et le retour ne tiennent pas
  dans un seul document, `fait_seconde_branche_incompatible` vaut « oui » et
  le moteur ne rend ni issue ni support. L'application bloque avant R2 et
  demande deux simulations.
- **La dépendance.** Le YAML compile avec `publicodes@1.10.1`. Le paquet a été
  retiré de l'app quand elle a été vidée.

## Le lien entre les questions et les faits

Relevé sur les 58 faits du YAML, fait par fait.

- **Le catalogue n'en nomme aucun.** Le document qui « prime pour les
  questions et décisions » décrit chaque option et sa logique en phrases, sans
  jamais citer un `fait_`.
- **Un seul tableau fait le lien**, dans `PUBLICODE_MODELE_ET_ENTREES.md`. Il
  range les faits en dix groupes et donne à chacun une plage de questions :
  « Q1.1–Q1.4 », « Q2.3 et segments P2 », « Q2.5/Q2.6 ». Aucune ligne ne relie
  une option à un fait.
- **Quinze faits n'y figurent que par un préfixe** : les sept critères de P1
  (`fait_critere_*`) et les huit exceptions de l'article 80
  (`fait_exception_article80_*`). Leur seul descriptif est le titre du YAML.
- **Deux faits ne sont pas des réponses** : `fait_p1_complete` et
  `fait_p2_complete`, que l'application calcule (D-64).
- **Dans le YAML, un fait n'a qu'un titre.** Ni question d'origine, ni valeur
  par défaut, ni description.

- **Vérifié ailleurs, sans résultat.** Ni les JSON, ni les scripts de test du
  package, ni Notion ne portent ce lien. Le catalogue cite un seul fait,
  `fait_intention_entree`, qui n'existe pas dans le YAML.
- **C'est un recul par rapport à la v9.** La 9.7.3 livrait
  `transports-sanitaires.ui.v9-7-3.yaml`, un contrat d'interface lisible par
  une machine, où chaque question était une variable du moteur. La v10 sépare
  les questions (en Markdown) des faits (en YAML) sans livrer ce qui les relie.

Ce que cela implique, après classement des 58 faits
([annexe](10-annexe-faits.md)) :

- **31 faits sont directs** : une réponse du catalogue les donne sans
  jugement. **7 sont calculés** par une règle écrite. **20 restent à
  interpréter.**
- **L'étape 2 (P0 et P1) est faisable** : 11 faits directs et un calculé.
- **L'étape 3 (P2) l'est en partie.** Tout ce qui touche la preuve
  Q2.1, l'ALD, les permissions et les incertitudes « décisives » attend l'éditeur.
- **Les étapes 5 à 7 ne sont pas concernées** : P3 ne modifie aucun fait.
- **Les 20 faits à interpréter ne sont pas à nous de trancher.** Un fait est
  une « preuve vérifiée ». Décider quelle réponse le prouve est une
  interprétation juridique, que le README du package nous interdit.
- Le tout se vérifie par l'oracle (une seed par cas, D-57) et par un test qui
  exige que chaque fait du YAML soit produit par une réponse.

## Proposé, à confirmer

- **Demander à l'éditeur les 20 faits à interpréter**, avec l'annexe à l'appui, et
  lui faire relire les 38 autres.

## Les étapes (D-69)

| Étape | Contenu | Ce qui la retient |
|---|---|---|
| 1. Le noyau | Migration du factice (D-52). Le YAML dans `front/model/rules/`. Les déclarations des faits et des cibles, et leur test (D-41). Les 25 cas de l'oracle, en faits, contre le moteur. | rien |
| 2. P0 et P1 | Q0.1 à Q1.4 : le mode de transport. | le contrôle bariatrique, flou |
| 3. P2 | Q2.1 à Q2.14 : l'éligibilité, sans page de résultat. | 20 faits à interpréter, le retour différent, la lecture seule |
| 4. R2 | La page de résultat : mode de transport et éligibilité. Impression. | le texte de la fiche, à définir |
| 5. P3 | Q3.1 à Q3.8 : les informations qui complètent le cerfa, sans PDF. | la lecture seule |
| 6. Le premier PDF | Le S3141, ses cibles documentaires, R3. | rien |
| 7. Les autres PDF | PMT et DAP, leurs volets, le texte médical. | rien |

Les capacités du chantier 09 entrent juste avant l'étape qui les demande.

## Ce que l'étape 1 a livré

- Le factice a migré dans `tests/socle/fixtures/modele-factice/` (D-52).
- `front/model/rules/` porte le YAML recopié (`regles.publicodes`) et `VERSION`.
- `publicodes` est figé en 1.10.1. Un plugin de `vite.config.ts` convertit le
  YAML en objet à la compilation. `Main` charge le modèle à la demande, et
  `App` l'attend après le rattachement (D-71). `verifier-bundle` le surveille.
- Les 58 faits et les 44 cibles sont déclarés, et comparés aux règles.
- L'oracle passe en faits : D01 à D25, et les frontières du test de l'éditeur.

Trois choses à savoir :

- **Q0.1 est déjà posée.** Un questionnaire sans page ne se monte pas : le
  modèle ouvre donc sur P0, en choix unique simple. L'explication de chaque
  option attend les cartes radio (chantier 09).
- **Aucune réponse ne donne de fait.** `preconisation.faits` rend tous les
  faits à « non ». R2 dit donc toujours que le questionnaire n'est pas complet.
- **`textFrom` a quitté `front/socle/index.ts`**, faute d'appelant dans le
  modèle. Il y revient avec le mapping, à l'étape 6.

Non fait à l'étape 1 : le script local qui compare nos déclarations au package
(D-70). Il prend son sens avec le dictionnaire des cibles et le mapping.

## Ce que l'étape 2 a livré

- P0 et P1 sont posées : Q0.1 en cartes radio, puis Q1.1 à Q1.4, libellés
  repris du catalogue.
- Leurs réponses donnent les 11 faits directs du mode de transport
  (`front/model/mode-de-transport.ts`), et `fait_p1_complete`, que le socle
  calcule sur les pages de P1 (`areAnswered`).
- Les règles rendent le mode. `tests/model/mode-de-transport.test.ts` le
  vérifie des réponses au mode, pour les cinq modes.
- Trois capacités du chantier 09 sont entrées dans le socle : l'explication
  d'une option, l'option qui dépend des réponses, le libellé qui dépend des
  réponses.

Quatre choses à savoir :

- **L'équipement bariatrique ne bloque rien.** La case de Q1.3 est posée et
  gardée dans les réponses. Elle ne donne aucun fait et ne bloque pas P1 : la
  règle attend l'éditeur.
- **Le transport partagé se propose selon le mode que les règles calculent**,
  TAP ou TPMR, pas selon une condition réécrite dans le questionnaire.
- **La phrase de Q1.4 est la nôtre.** Le catalogue demande que le libellé
  précise « en toute autonomie » ou « avec l'aide d'un proche », sans donner
  la phrase. À faire relire par l'éditeur.
- **Le résultat ne change pas.** P2 n'est pas posée : `fait_p2_complete` reste
  à « non », et R2 dit que le questionnaire n'est pas complet. Le mode se lit
  dans la trace de debug. Le stepper annonce trois parties, jusqu'à P2.

`preconisation.ts` ne porte plus que le passage des réponses aux faits. Le
moteur publicodes est dans le socle (`decision-engine/publicodes.ts`, D-76).
`evaluation-des-regles.ts` lui donne les règles et les cibles du modèle, et le
questionnaire le lit aussi pour connaître le mode.

## Problèmes restants

### En attente d'une réponse de l'éditeur

1. **Vingt faits à interpréter** ([annexe](10-annexe-faits.md)). Ticket
   ouvert.
2. **Le texte de la fiche R2**, prévu côté éditeur, sans ticket. Le catalogue écrit : « Le contenu éditorial
   final de la fiche reste à définir. » Le moteur rend neuf issues et
   quatorze codes de raison, sans aucune phrase à afficher.
3. **Le retour différent de l'aller.** Deux segments à qualifier et à
   comparer, sans notion de segment dans le YAML ni dans le socle.
4. **La lecture seule** et **l'équipement bariatrique**, voir le chantier 09.

### Conséquences sur ce qui était décidé

5. **Une seed par cas d'oracle (D-57) attend l'oracle en réponses**, que l'éditeur
   prépare. Une
   seed est faite de réponses. Les 25 cas de l'oracle s'appuient tous sur au
   moins un fait à interpréter : les quatre drapeaux de preuve pour 23 cas,
   `fait_evenement_sans_soin` et `fait_dap_maternite` pour les deux autres. La
   étape 1 n'est pas touchée : elle rejoue l'oracle en faits.
6. **Deux capacités manquaient à l'inventaire du chantier 09** : des options
   qui dépendent des réponses, et un libellé qui dépend des réponses. Elles y
   sont ajoutées.

### À arrêter entre nous

7. ~~Le découpage~~ : tranché, sept étapes (D-69).
8. ~~Où vit le livrable~~ : tranché (D-70). Le YAML et `VERSION` dans
   `front/model/rules/`, tout le reste retranscrit dans `front/model/`, les
   gabarits dans `front/model/cerfa/`, un script local de comparaison.
9. ~~La dépendance `publicodes`~~ : tranché (D-71). Version figée 1.10.1,
   YAML converti à la compilation, modèle chargé à la demande pendant
   l'écran-porte.
10. ~~Le mapping vers les champs des gabarits~~ : découle de D-70. Le mapping
    est du code du modèle. Un test du dépôt exige que chaque champ d'un
    gabarit soit rempli par une règle ou laissé à quelqu'un, avec sa raison
    (`leftTo`). Le script local vérifie l'autre sens : chaque ligne du mapping
    de l'éditeur a son pendant.
11. ~~La référence du mapping~~ : tranché (D-72). Le package fait foi.
12. ~~Les résultats positifs~~ : tranché (D-73). Staging seulement, sans
    mécanisme, puis la production d'un bloc.
13. **Les six skills du dépôt** décrivent la v9. À réécrire en fin de
    chantier.

## Critères d'acceptation

- [x] Le factice a migré dans `tests/socle/fixtures/` (D-52), et la garde
      « seuls les tests du modèle importent le modèle » est écrite.
- [ ] Les 25 cas de l'oracle passent, et chacun a sa seed (D-57). Les cas
      passent en faits ; les seeds attendent l'oracle en réponses.
- [ ] Aucun fichier de `front/socle/` n'a été modifié pour un besoin propre à
      la v10 hors des capacités du chantier 09.
