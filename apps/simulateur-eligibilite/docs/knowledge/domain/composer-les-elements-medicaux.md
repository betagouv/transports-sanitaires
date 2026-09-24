# Composer les éléments d'ordre médical du PMT et de la DAP

> **Statut** : implémentée le 2026-09-15, sur `staging` (ex-spec 0005).
> Commits `310005c` (feat) et `c40437f` (docs) — cf. « Ce qui a été implémenté »
> en fin de document. Q1 et Q6 tranchées avec l'utilisateur avant
> l'implémentation (cf. « Décisions prises avec l'utilisateur » ci-dessous). Q2
> à Q5 restent ouvertes : elles ne bloquaient pas le code.
> **Périmètre** : dossiers `front/outils-produit/beta/cerfa/` et
> `front/simulateur/secretariat/`.
>
> **Dépend de l'intégration du modèle v9.7.1**, faite le 2026-09-15 (spec
> 0010). S'appuie sur les specs 0007 (PMT) et 0008 (DAP). Le S3141 n'est pas
> concerné.

## v9.7.3 : le contrat EM-2 remplace EM-1 (TS973-12)

EM-2 garde les douze blocs, leurs libellés et leurs dates. Deux choses
changent :

- les blocs sont joints par « ; », sans saut de ligne ;
- le texte reste entier dans la rubrique, **sans annexe ni renvoi**.

Les décisions 6 et 7 ci-dessous sont donc révoquées. Elles restent écrites,
barrées, pour l'histoire.

| Sujet | Décision |
|---|---|
| Où va le texte | Dans le champ du volet 1, en entier. Aucune page n'est ajoutée au PDF. |
| Mesure | Toujours avec la police et la géométrie réelles (`mesure-de-la-zone.ts`). |
| Taille | Le cadre est petit : 535 × 20 pt sur la PMT, multiligne, et 522 × 15 pt sur la DAP, une seule ligne même à 6 pt. La police descend de 10 au plancher de lisibilité de 6 pt, celui des adresses (TS973-14). En EM-2 strict à 10 pt, 24 des 33 documents tirés des seeds débordaient. |
| Débordement | Au-delà du plancher, `remplirCerfa` lève `DebordementDuTexteMedical`, qui porte le texte entier. Aucun PDF n'est produit. |
| Révision | `BoutonCerfa` montre le texte entier dans une zone de saisie (`ReviserLeTexteMedical.tsx`). Le prescripteur le reformule, puis le texte révisé est remesuré avant la génération. |
| Revalidation | La révision garde le texte composé qu'elle révisait. Si les réponses changent, le texte composé change aussi : la révision ne vaut plus. |
| Réponses | La révision ne touche que le document, jamais les réponses de la simulation. |
| Résultat | Un débordement n'empêche que le Cerfa. Le résultat reste affiché et imprimable. |

Sept seeds débordent encore, dont `secretariat-prescription` (cinq besoins de
transport) et `secretariat-permission-longue-distance`. Sur la DAP, à une
seule ligne de cadre, le texte déborde dès deux besoins de transport.

`annexe.ts` et `plan-d-impression.ts`, cités plus bas, n'existent plus. La
mesure vit dans `mesure-de-la-zone.ts`, le débordement dans
`debordement-du-texte-medical.ts`.

## Décisions prises avec l'utilisateur

| # | Sujet | Décision |
|---|---|---|
| Q1 | Horaires de permission sans décalage (`datetime-local`) | **Ajouter le décalage à la saisie**, pas l'appliquer à la lettre. `dates.ts` lit la saisie locale comme une heure de Paris, lui calcule et ajoute le décalage (`+01:00` ou `+02:00`) qui s'applique à cet instant, puis confie le résultat à la fonction stricte d'EM-1 réencodée. Aucune DAP avec permission n'échoue à la génération. |
| Q6 | Coutures de test | **Confirmées telles que décrites** : `saisiesDepuisSituation` (moteur réel) pour la composition, `remplirCerfa`/`relire` sur les deux gabarits réels pour le plan et l'annexe. |

## Le problème

Le PMT et la DAP sortent aujourd'hui avec leur zone « éléments d'ordre médical » vide.

| Formulaire | Champ AcroForm | Page | Rubrique |
|---|---|---|---|
| PMT S3138g | `comm évent` | 3, volet 1 | ⑤ |
| DAP S3139h | `elmedic` | 2, volet 1 | ③ |

Le mapping documentaire attribue cette zone à l'application (`application.elements_medicaux`).
En v9.7.0, rien ne disait comment la composer :

- aucune cible ne l'assemblait ;
- aucun format, aucun ordre, aucune longueur ;
- le mapping interdisait par ailleurs d'inventer une transformation.

La ligne est donc déclarée d'origine `application` sans source, et `depuisLeMapping` la
laisse au prescripteur. La première version de cette spec prévoyait d'en faire une anomalie
pour l'éditeur. Ce document n'a jamais été écrit.

C'est bloquant pour deux raisons.

- **Le motif médical est obligatoire** sur la prescription (article R.322-10-2 du code de la
  sécurité sociale). Le prescripteur doit le recopier à la main, alors que le questionnaire
  l'a déjà recueilli.
- **La DAP perd sa justification.** La justification du trajet de plus de 150 km, la
  mention SAMSAH et le détail d'une permission n'ont pas de case dédiée. Ils n'ont de place
  que dans cette zone, que le médecin-conseil lit pour accorder ou refuser.

## Ce que livre l'éditeur en v9.7.1

Le contrat EM-1 répond à la question. Il tient en quatre pièces du paquet :

| Pièce | Ce qu'elle porte |
|---|---|
| `docs/CONTRAT-ELEMENTS-MEDICAUX.md` | le contrat : responsabilités, ordre, formulations, débordement |
| `src/medical-text.mjs` | l'implémentation de référence, JavaScript pur, sans publicodes ni PDF |
| `transports-sanitaires.documents.v9-7-1.yaml` | les deux lignes `elements_medicaux` gagnent `render: text`, `composition_contract: EM-1`, `implementation` et `guide` |
| `tests/elements-medicaux.mjs`, `tests/convocation.mjs` | 39 contrôles `EM-*` et `CONV971-DAP-REFERENCE-CONVOCATION-ET-CONFIDENTIALITE` |

### Qui fait quoi

| Responsable | Travail |
|---|---|
| Publicodes | calcule le motif, les situations et les valeurs documentaires. Aucune cible nouvelle, aucune question nouvelle. |
| Application | assemble exclusivement les réponses et les valeurs calculées, selon EM-1 |
| Moteur PDF de l'application | mesure le texte dans la zone réelle, produit l'annexe si besoin, respecte les volets |
| Prescripteur | vérifie, complète, signe. Aucune signature n'est fabriquée. |

### Les treize blocs, dans l'ordre

Un bloc absent n'est pas écrit. Les blocs sont séparés par un retour à la ligne.

| Ordre | Bloc | Déclencheur | Rendu |
|---|---|---|---|
| 1 | Transfert | `p2_transfert_en_cours` ou raison commençant par « Transfert », et `p2_nature_transfert` renseignée | « Transfert provisoire » ou « Transfert définitif » |
| 2 | Motif | `cible_motif_medical_deplacement` | la valeur exacte |
| 3 | Convocation | `cible_convocation_type` non vide | « Déplacement lié à la convocation : » et le type |
| 4 | Hospitalisation | raison « Entrée en hospitalisation » ou « Sortie d'hospitalisation » | `p2_type_hospitalisation` |
| 5 | Séances | `p1_m0_seance_chimiotherapie`, `_radiotherapie`, `_dialyse_centre` | trois libellés fixes |
| 6 | Besoins de transport | les onze `p1_critere_*` cochés | onze libellés fixes, jamais « Aucun » |
| 7 | Centre de référence maladies rares | `cible_situation_centre_reference_maladies_rares` | orientation, et le nom du lieu s'il est connu |
| 8 | SAMSAH | `cible_dap_motif_samsah` | « Transport vers le SAMSAH », et le nom du lieu |
| 9 | Plus de 150 km | `cible_dap_motif_longue_distance` et justification renseignée | « Justification du trajet de plus de 150 km : » et le texte |
| 10 | Permission | `p2_permission_speciale` | date d'hospitalisation, première permission, fréquence, fin |
| 11 | Pension militaire | `cible_situation_pension_militaire` | une phrase fixe |
| 12 | Engagement maternité | `p2_contexte_engagement_maternite` | niveau, nom et adresse, réutilisant l'adresse du trajet |
| 13 | Hébergement temporaire non médicalisé | `p2_htnm_lieu` renseigné et différent de « Non » | nom et adresse |

Les libellés des blocs 5 et 6 sont **figés dans le module**. Ils ne suivent pas les énoncés
du questionnaire : une évolution clinique impose de les revoir à la main.

### Texte et dates

- Espaces de bord retirés, fins de ligne harmonisées, Unicode normalisé NFC.
- Seuls les blocs **strictement identiques** sont dédoublonnés. Aucun résumé, aucune coupe.
- Une date `AAAA-MM-JJ` s'écrit `JJ/MM/AAAA`.
- Un horaire s'écrit `JJ/MM/AAAA à HHhMM`, heure de Paris. EM-1 exige un décalage horaire
  (`Z` ou `+02:00`) et **lève** sinon.
- Une date invalide lève une erreur technique. Aucune date de remplacement.

### Débordement et annexe

`medicalPrintPlan(texte, { fits })` décide ce qui va dans le champ. `fits` est une mesure
synchrone fournie par le moteur PDF. Aucun seuil en caractères ne la remplace.

1. Le texte tient : il va entier dans le champ, sans annexe.
2. Il ne tient pas : le champ reçoit « Éléments médicaux : voir l'annexe jointe. », et
   l'annexe porte le texte entier.
3. Le renvoi lui-même ne tient pas : erreur technique, pas d'impression trompeuse.

L'annexe est confidentielle, destinée au médecin-conseil, à signer par le prescripteur. Elle
est jointe dans la même opération, paginée sans perte. Le cadre du Cerfa n'est pas agrandi.

### Confidentialité et convocation

| Formulaire | Où le texte va | Où il ne va jamais |
|---|---|---|
| PMT | page 3, volet 1 | page 4, volet 2 |
| DAP | page 2, volet 1 | pages 3 et 4, volets 2 et 3 |
| S3141 | nulle part | aucune rubrique ni annexe créée |

La v9.7.1 ajoute le bloc 3 pour la DAP issue d'une convocation à plus de 150 km. Le texte
cite le type de convocation, puis la justification de distance. Un parcours redevenu sans
convocation ne garde pas la mention, puisque `cible_convocation_type` redevient vide.

## Ce que nos gabarits permettent réellement

Relevé par introspection sur les deux gabarits de l'app, avec `pdf-lib` 1.17.1.

| Champ | Multiligne | Cadre (pt) | Taille déclarée |
|---|---|---|---|
| `comm évent` | oui | 535 × 20 | `/Cour 10 Tf` |
| `elmedic` | **non** | 522 × 15 | `/Cour 10 Tf` |

Deux faits changent la mesure.

- **`pdf-lib` compose l'apparence dans sa police par défaut**, Helvetica, pas dans le
  Courier déclaré. `updateFieldAppearances` la passe à tous les champs modifiés.
- **Un champ monoligne fusionne les lignes** à l'affichage (`mergeLines`). Le `\n` reste dans
  la valeur mais disparaît du rendu.

À 10 pt en Helvetica, une ligne fait 11,1 pt de haut. Chaque zone tient donc **une seule
ligne**, d'environ 120 caractères. Le renvoi en fait 41.

Conséquence : dès que le texte a deux blocs, il déborde. Un motif et un seul critère
suffisent. **L'annexe sera la règle, pas l'exception.** Cf. la question ouverte 2.

## Décisions

### 1. La zone médicale se compose selon EM-1, et l'anomalie n'a plus d'objet

L'éditeur a tranché la question que la première version posait. Le document d'anomalie ne
s'écrit pas. L'application compose le texte, le mesure et joint l'annexe.

Ce qu'on perd : la 0008 et la 0009 comptaient glisser trois écarts dans ce document. Ils
n'ont plus de véhicule, cf. la question ouverte 5.

### 2. EM-1 est réencodé en TypeScript, pas chargé

C'est la règle du dépôt. Seul le modèle publicodes est chargé, le reste du paquet est
réencodé. `medical-text.mjs` est pourtant importable par un navigateur. On le réencode quand
même :

- ses identifiants sont en anglais, et `tests/lisibilite.test.ts` les refuse ;
- ses fonctions dépassent 30 lignes, que `tests/architecture.test.ts` refuse ;
- il nomme des règles en chaînes libres, là où le contrat de règles les type ;
- il vivrait hors de l'app, dans `tmp/`, que git ignore.

Ce qu'on perd : le guide développeur dit « appeler le module ». On s'écarte de sa lettre, et
chaque livraison qui touche EM-1 se reporte à la main. C'est assumé, parce que la recette
porte les 40 identifiants de l'éditeur : l'équivalence reste vérifiable, et un désaccord lui
remonte sous son nom.

### 3. Les réponses se lisent par le moteur, pas dans la situation brute

EM-1 reçoit `answers`, les réponses validées d'une session qui purge ce qui n'est plus
applicable. Rien ne garantit que la situation de l'app soit purgée de la même façon.

Le moteur, lui, rend une question non applicable comme absente. C'est déjà ainsi que
`adresseSurLaLigne` lit les composants d'adresse. La composition lit donc tout par
`Reponses` : les questions comme les cibles.

Ce qu'on perd : l'encodage n'est plus celui d'EM-1 (booléen `true` au lieu de `oui`, texte
sans quotes). Le réencodage l'absorbe, et les contrôles `EM-CRITERE-NON-POSITIF-*` le
vérifient.

### 4. La ligne du mapping déclare la composition, les tableaux ne changent pas

La v9.7.1 porte `composition_contract: EM-1` sur la ligne `elements_medicaux`. Notre
transcription le recopie : la case gagne `composition: "EM-1"`. `depuisLeMapping` reconnaît
cette forme et rend le texte composé.

Les tableaux gardent `"comm évent": mapping("elements_medicaux")` et
`elmedic: mapping("elements_medicaux")`. Un champ se lit toujours par l'id de sa ligne.

Ce qu'on perd : la date de prescription, autre ligne `application`, reste écrite
directement dans les tableaux. Les deux lignes ne suivent pas la même forme, et c'est
assumé : la date n'a pas de contrat à déclarer.

### 5. Le texte médical est un type de valeur à part, jusqu'à l'écriture

Un tableau ne voit pas le PDF, et la mesure en a besoin. Le texte traverse donc le
remplissage sous une forme propre, `{ texteMédical }`, à côté de `{ texte }` et `{ coché }`.
C'est `remplirCerfa` qui mesure, applique le plan et joint l'annexe.

Une liste de noms de champs, comme `MULTILIGNES_ROGNÉS`, aurait suffi. Le type dit mieux
qu'un texte médical ne s'écrit jamais comme un texte ordinaire, et TypeScript force chaque
étape à le traiter.

### ~~6. La mesure se fait dans la police et à la taille qui composent l'apparence~~

> Révoquée en v9.7.3 (EM-2) : la police descend jusqu'à 6 pt avant de
> déclarer un débordement, faute d'annexe. Voir la section EM-2 en tête.

EM-1 demande de mesurer avec la police, la taille et la géométrie réelles. Pour nous, c'est
Helvetica à 10 pt, dans le cadre du widget moins les marges de `pdf-lib`. Sur `elmedic`, un
texte à plusieurs lignes ne tient jamais.

`réduireSiÇaDéborde` ne s'applique pas à cette zone. Réduire la police rendrait illisible un
texte que le médecin-conseil doit lire, et l'annexe existe pour ce cas.

Ce qu'on perd : une page de plus à signer sur presque chaque document, cf. la section
précédente.

### ~~7. L'annexe s'insère dans le même PDF, juste après la page du volet 1~~

> Révoquée en v9.7.3 (EM-2) : il n'y a plus d'annexe.

Un seul téléchargement, conformément à « dans la même opération ». Placée juste après la
page 3 du PMT ou la page 2 de la DAP, elle se lit avec le volet qu'elle complète.

Elle porte, au minimum :

- le titre d'EM-1, « Éléments d'ordre médical - complément à la prescription » ;
- la mention « Confidentiel. Réservé au médecin-conseil. À joindre au volet 1. » ;
- le texte entier, paginé sans perte ;
- des zones vierges pour l'identité du patient, celle du prescripteur, la date et la
  signature.

Ce qu'on perd : les volets suivants changent de numéro de page dans le PDF produit. Le
texte de l'annexe, dessiné, n'est pas modifiable dans un lecteur PDF.

### 8. Le texte ne quitte jamais le PDF

C'est une donnée de santé nominative une fois le document complété. Il ne va ni au
backend, ni à Matomo, ni dans la console.

`BoutonCerfa` journalise la cause d'un échec par `console.error`. Les erreurs du plan et des
dates ne citent donc jamais le texte, contrairement à celle de `écrire` sur un champ trop
long.

### 9. Une erreur de composition empêche le document, jamais le résultat

Une date invalide ou un renvoi qui ne tient pas lèvent. `BoutonCerfa` affiche déjà son
message d'échec et laisse la page de résultat intacte. EM-1 demande exactement cela : un
échec technique identifiable, qui ne change pas le droit du patient.

## Ce qu'il faut implémenter

| Fichier | Nature | Travail |
|---|---|---|
| `front/outils-produit/beta/cerfa/elements-medicaux/composition.ts` | créé | `composerElementsMedicaux(réponses: Reponses): string`. Une fonction par bloc, dans l'ordre EM-1. Normalisation, dédoublonnage exact, jointure par `\n`. |
| `front/outils-produit/beta/cerfa/elements-medicaux/libelles.ts` | créé | `CRITERES_MEDICAUX` (onze), `SEANCES` (trois), `RENVOI_A_L_ANNEXE`, `TITRE_DE_L_ANNEXE`. Mot pour mot, apostrophes typographiques comprises. |
| `front/outils-produit/beta/cerfa/elements-medicaux/dates.ts` | créé | `dateMedicale` et `dateEtHeureMedicales`. Même refus qu'EM-1, sous réserve de la question ouverte 1. |
| `front/outils-produit/beta/cerfa/elements-medicaux/plan-d-impression.ts` | créé | `planDImpression(texte, tient): Plan`, avec `Plan = { texteDuChamp, annexe: { titre, texte } \| null }`. Lève si le renvoi ne tient pas. |
| `front/outils-produit/beta/cerfa/elements-medicaux/annexe.ts` | créé | `tientDansLaZone(champ, police)`, `paginer(texte, police, cadre): string[][]`, `insererAnnexe(document, aprèsLaPage, annexe)`. Seul fichier du dossier qui importe `pdf-lib`. |
| `front/outils-produit/beta/cerfa/remplir-cerfa.ts` | modifié | `Saisie` accepte `{ texteMédical }`. `écrire` passe par le plan, sans `réduireSiÇaDéborde`, puis insère l'annexe. Commentaire de `remplirCerfa` sur `comm évent` à revoir. |
| `front/outils-produit/beta/cerfa/remplissage.ts` | modifié | `Valeur` accepte `{ texteMédical }`, `saisieDe` le transmet. |
| `front/outils-produit/beta/cerfa/mapping.ts` | modifié | `depuisLeMapping` : une case `composition: "EM-1"` rend `{ texteMédical }`, ou `undefined` si le texte est vide. Commentaire de `laisséÀ` à revoir. |
| `front/simulateur/secretariat/case-de-formulaire.ts` | modifié | `CaseDeFormulaire` gagne `composition?: "EM-1"`. Commentaire de `Origine` à revoir. |
| `front/simulateur/secretariat/rubriques-situation-medicale.ts` | modifié | `{ id: "elements_medicaux", origine: "application", rendu: "texte", composition: "EM-1" }`. Sans libellé : la checklist du Bloc 3 continue de l'ignorer. |
| `front/outils-produit/beta/cerfa/reponses.ts` | modifié | `VALEURS_COMPAREES` gagne les littéraux qu'EM-1 compare : raisons d'hospitalisation et de transfert, natures du transfert, `Structure de soins` et `USLD`, les lieux de maternité et d'hébergement. |
| `front/outils-produit/beta/cerfa/pmt/document.ts`, `dap/document.ts` | modifié | Les éléments d'ordre médical passent de `ceQuiResteASaisir` à `ceQuiEstRempli`, « à relire ». L'annexe éventuelle à signer entre dans `ceQuiResteASaisir`. |
| `front/simulateur/contrat-regles-publicodes.ts` | modifié | `cible_motif_medical_deplacement`, `cible_justification_longue_distance`, `cible_convocation_type` dans `CIBLES`, `p2_permission_speciale` dans `REGLES_LUES` — vérifié après coup, l'intégration v9.7.1 (0010) n'en a ajouté aucune : les quatre clés restent à faire ici. |
| `front/outils-produit/seeds/catalogue.ts` | modifié | Les seeds qui manquent aux parcours de la recette, cf. ci-dessous et le skill `situation-de-reference`. |

### Le test

Deux coutures, qui existent déjà.

**`saisiesDepuisSituation`, moteur réel, pour la composition.** Les tests lisent la saisie
`texteMédical` de `comm évent` ou `elmedic`. Nouveau fichier
`tests/cerfa/elements-medicaux.test.ts`, à scinder par sujet s'il dépasse 300 lignes
(`-parcours` et `-regles`).

**`remplirCerfa` et `relire`, sur les deux gabarits réels, pour le plan et l'annexe.**
Nouveau fichier `tests/cerfa/annexe-medicale.test.ts`. `planDImpression`, `paginer` et les
deux fonctions de date s'y testent aussi directement : ce sont des fonctions pures, et
l'annexe dessinée ne se relit pas par `relire`.

Les seeds candidates, à réutiliser si elles mènent bien au cas après l'intégration v9.7.1, à
ajouter sinon :

| Parcours EM | Seed candidate ou à créer |
|---|---|
| `PMT-CONSULTATION`, `PMT-TEXTE-LIBRE` | `secretariat-prescription`, variantes à créer |
| `PMT-RADIO`, `PMT-AMBULANCE`, `PMT-RARE` | à créer |
| `DAP-DISTANCE` | `secretariat-accord-prealable-distance` |
| `DAP-SAMSAH` | `secretariat-samsah` |
| `DAP-MATERNITE` | `secretariat-maternite-eloignee` |
| `DAP-PERMISSION`, `DAP-PENSION` | à créer |
| `CONV971-DAP-REFERENCE-CONVOCATION-ET-CONFIDENTIALITE` | convocation à plus de 150 km, à créer si l'intégration ne l'a pas fait |

Les tests existants qui changent :

| Fichier | Changement |
|---|---|
| `tests/cerfa/mapping.test.ts` | `elements_medicaux` quitte `APPLICATION_SANS_SOURCE`. L'assertion devient « porte une source ou une composition ». Ajout du portage `EM-MAPPING-ET-CONTRAT-ALIGNES`. |
| `tests/cerfa/depuis-simulateur-mapping.test.ts` | `comm évent` sort de la liste « aucune saisie ». L'assertion se retourne. |
| `tests/cerfa/remplissage.test.ts` | le test « volet 1 seulement » du PMT gagne son jumeau DAP : `elmedic` n'a de widget que sur la page 2. |
| `tests/cerfa/depuis-simulateur-s3141.test.ts` | le test « aucun champ d'éléments médicaux » porte l'identifiant `EM-S3141-SANS-RUBRIQUE`. |

### Le README

| Fichier | Travail |
|---|---|
| `apps/simulateur-eligibilite/AGENTS.md`, § « Le CERFA » | Une phrase : la zone médicale est composée selon EM-1, mesurée, et renvoie à une annexe insérée après le volet 1. |
| `apps/simulateur-eligibilite/README.md`, arborescence | La ligne `elements-medicaux/` sous `cerfa/`. |
| `apps/simulateur-eligibilite/CHANGELOG.md` | À la livraison, pas dans ce lot. |

## Recette

### Les identifiants portés

Chaque identifiant de l'éditeur figure dans nos tests, sous son nom : porté, ou cité avec la
raison qui le rend sans objet.

| Identifiant | Portage |
|---|---|
| `EM-PARCOURS-PMT-AMBULANCE`, `-PMT-CONSULTATION`, `-PMT-TEXTE-LIBRE`, `-PMT-RADIO`, `-PMT-RARE` | porté, couture `saisiesDepuisSituation` |
| `EM-PARCOURS-DAP-DISTANCE`, `-DAP-SAMSAH`, `-DAP-PERMISSION`, `-DAP-MATERNITE`, `-DAP-PENSION` | porté, même couture |
| `CONV971-DAP-REFERENCE-CONVOCATION-ET-CONFIDENTIALITE` | porté pour le texte et le volet. Le message « joignez-la » de la page de résultat relève de l'intégration v9.7.1. |
| `EM-S3141-SANS-RUBRIQUE` | porté, test S3141 existant |
| `EM-CONTRAT-CIBLES-EXISTANTES` | gardé par le type `CleDeRegle` et `tests/regles-front.test.ts`, cité |
| `EM-CONTRAT-CRITERES-EXHAUSTIFS` | porté : les clés de `CRITERES_MEDICAUX` sont les options de la mosaïque des critères, hors `p1_critere_aucun` |
| `EM-INDEPENDANT-DES-QUESTIONS` | porté : un moteur dont l'énoncé d'un critère est modifié rend le même texte |
| `EM-ORDRE-INDEPENDANT-DE-LA-SERIALISATION` | porté : situation aux clés inversées, même texte |
| `EM-CRITERE-NON-POSITIF-undefined`, `-null`, `-false`, `-non` | porté sur « non » et sur l'absence, les deux formes que rend le moteur. Les deux autres sont citées. |
| `EM-INCONNU-IGNORE` | sans objet : une clé inconnue est refusée par le type et par publicodes. Cité. |
| `EM-ASEPSIE-LIBELLE-VALIDE`, `EM-RADIO-PAS-DE-DOUBLON`, `EM-MOTIF-LIBRE-SANS-REECRITURE` | porté |
| `EM-VALEURS-ABSENTES-PAS-DE-UNDEFINED`, `EM-HTNM-NON-RENSEIGNE-IGNORE` | porté |
| `EM-DISTANCE-INAPPLICABLE-SOURCE-ANCIENNE-IGNOREE`, `EM-RETOUR-DISTANCE-EFFACEMENT` | porté sur la composition. L'effacement à l'écran relève du questionnaire. |
| `EM-DATE-FRANCAISE`, `EM-DATE-INVALIDE-REFUSEE`, `EM-DATE-HEURE-ETE`, `EM-DATE-HEURE-HIVER` | porté, fonctions pures |
| `EM-DATE-HEURE-INCOMPLETE-REFUSEE` | selon la question ouverte 1 |
| `EM-LONG-TEXTE-ANNEXE-INTEGRALE`, `EM-TEXTE-COURT-SANS-ANNEXE`, `EM-RENVOI-TROP-LONG-ERREUR-EXPLICITE` | porté, plan pur puis PDF réel |
| `EM-MESURE-OBLIGATOIRE`, `EM-MESURE-ASYNC-REFUSEE`, `EM-MESURE-INCONNUE-REFUSEE` | gardé par la signature de `planDImpression`, qui exige `(texte: string) => boolean`. Cité. |
| `EM-MAPPING-ET-CONTRAT-ALIGNES` | porté : les lignes `elements_medicaux` du PMT et de la DAP portent `composition: "EM-1"` et `rendu: "texte"` |

### Les vérifications

1. `cd apps/simulateur-eligibilite && pnpm verifier` est vert.
2. Les 40 identifiants sont présents :
   `grep -rhoE "EM-[A-Z][A-Za-z0-9-]+|CONV971-DAP-REFERENCE-CONVOCATION-ET-CONFIDENTIALITE" tests | sort -u`
   rend les 40 noms du rapport `tmp/9.7.1/rapports/tests-all.json`.
3. `pnpm apercu-cerfa` sur une seed de DAP à plusieurs blocs : le PDF a 5 pages, `elmedic`
   porte le renvoi, l'annexe est la page 3.
4. Sur une seed de PMT dont le texte tient en une ligne : 4 pages, `comm évent` porte le
   texte entier.
5. `pdftotext -f 4 -l 5` sur le PDF de la vérification 3 ne contient ni le motif ni aucun
   libellé de critère : rien n'a fui vers les volets 2 et 3.
6. Impression à taille réelle des deux documents : le texte du champ est lisible et non
   rogné, l'annexe est lisible et porte ses zones de signature.
7. `grep -rn "texteMédical\|composerElementsMedicaux" front/analytics server shared` ne
   rend rien.
8. Parcours complet dans le navigateur jusqu'à une DAP : le PDF téléchargé s'ouvre avec la
   zone remplie et l'annexe jointe.

## Hors périmètre

- **L'intégration du modèle v9.7.1.** Chantier à part : recopie, contrat de règles, seeds,
  écrans de convocation, message « joignez-la ». Cette spec la suppose faite.
- **Le S3141.** EM-1 lui interdit toute zone ou annexe médicale, et la 0009 le respecte.
- **La convention SAMSAH.** Le bloc 8 est écrit comme EM-1 le prescrit. Sa confirmation
  reste en attente côté CNAM, et EM-1 dit ne pas la valoir.
- **Afficher le texte composé à l'écran**, avant téléchargement. Cf. la question ouverte 4.
- **Saisir l'identité ou signer l'annexe dans l'app.** Le simulateur reste anonyme, les
  zones sortent vierges.
- **Les trois écarts qui devaient partir avec l'anomalie de la 0005** : l'organisme absent
  de la DAP (0008), `pério traj` et le nom trompeur d'`etm` sur le S3141 (0009). Cf. la
  question ouverte 5.

## Questions ouvertes

| # | Question | Enjeu |
|---|---|---|
| 1 | ~~Les horaires de permission sont saisis sans décalage...~~ **Tranchée**, cf. « Décisions prises avec l'utilisateur ». | — |
| 2 | Chaque zone tient une ligne d'environ 120 caractères : l'annexe sera quasi systématique. Le produit l'accepte-t-il ? | Sinon, il faudrait aplatir les blocs sur une ligne ou réduire la police. EM-1 ne prévoit ni l'un ni l'autre, et le second nuit à la lecture du médecin-conseil. |
| 3 | Le contenu exact de l'annexe : mentions, zones d'identité (NIR ?), rappel du formulaire et de la date de prescription. | Document remis au médecin-conseil et signé : la formulation relève du porteur, pas de l'intégrateur. |
| 4 | Le prescripteur doit-il voir le texte avant de télécharger, sur la page de résultat ? | EM-1 lui demande de vérifier et de compléter. Dans un champ il peut corriger, dans une annexe dessinée il ne peut qu'ajouter à la main. |
| 5 | Par où partent les trois écarts que la 0008 et la 0009 comptaient joindre à l'anomalie de la 0005 ? | Sans véhicule, ils ne seront jamais remontés. Un document d'anomalie dédié dans `tmp/9.7.1/` n'est pas possible : son manifeste exige un inventaire exact. |
| 6 | ~~Les deux coutures de test proposées conviennent-elles ?~~ **Tranchée**, cf. « Décisions prises avec l'utilisateur ». | — |

## Ce qui a été implémenté

Code écrit le 2026-09-15, `pnpm verifier` intégral vert (lint, typecheck, knip,
`valider-regles`, tests, build, bundle). Deux commits sur `staging` :
`310005c` (feat, le code et les tests) et `c40437f` (docs, AGENTS.md et
README).

**Fichiers créés** : les cinq fichiers de `cerfa/elements-medicaux/`
(composition.ts, libelles.ts, dates.ts, plan-d-impression.ts, annexe.ts) et
trois fichiers de test (`tests/cerfa/elements-medicaux-parcours.test.ts`,
`-regles.test.ts`, `tests/cerfa/annexe-medicale.test.ts` — la coupure
`-parcours`/`-regles` anticipe la limite de 300 lignes du fichier de
composition, comme prévu par le lot « Le test »).

**Fichiers modifiés** : les onze listés dans « Ce qu'il faut implémenter », plus
`scripts/apercu-cerfa.ts`, `tests/cerfa/depuis-simulateur-mapping.test.ts`,
`tests/cerfa/depuis-simulateur-s3141.test.ts`,
`tests/cerfa/depuis-simulateur.test.ts` et `tests/cerfa/mapping.test.ts`
(l'assertion « aucune saisie » / « volet 1 seulement » attendue vit dans
`depuis-simulateur.test.ts`, pas dans `remplissage.test.ts` comme la table du
lot le supposait). AGENTS.md § « Le CERFA » et l'arborescence du README sont à
jour.

**Couverture des identifiants** : les 40 identifiants EM-*/`CONV971-*` sont
présents — 33 portés en tests exécutés, 7 cités sans objet avec leur raison,
conforme à la table de recette ci-dessus.

**Écart constaté à l'implémentation** : `EM-CONTRAT-CRITERES-EXHAUSTIFS` /
`EM-INDEPENDANT-DES-QUESTIONS` est cité « porté par construction » plutôt que
testé en mutant une règle en direct comme le fait le test de référence de
l'éditeur. L'argument : `CRITERES_MEDICAUX` (`libelles.ts`) est une constante
TypeScript statique, jamais un intitulé lu sur le modèle — la propriété tient
structurellement. C'est une lecture du code, pas un test qui échouerait si
quelqu'un cassait cette propriété par erreur. **À trancher** : ajouter un test
qui le vérifie explicitement, ou garder la citation en l'état.
