# Page Résultat 1 — décision médicale

Contenu rédactionnel de référence de la Page Résultat 1, conforme au modèle
**v9.1** et à son contrat d'interface 2.0.0. Le code fait foi
(`front/simulateur/prescripteur/ResultatMedical.tsx` et
`front/simulateur/resultat/Vulgarisation.tsx`) ; ce document dit ce qu'il doit
porter.

## Titre affiché

**Décision médicale**

La page ne présente **jamais** de qualification administrative.

## Introduction

> La décision ci-dessous est établie à partir de l’état de santé et des besoins
> du patient pendant le déplacement.

## Verrouillage

La décision **n'est pas figée à l'ouverture de la page**. Elle l'est lorsque
l'utilisateur choisit l'action principale, et la page le dit avant :

> La décision médicale sera figée dès que vous aurez choisi « [action
> principale] » : elle ne pourra plus être modifiée ensuite.

## Actions

| Action | Rôle | Cible |
| --- | --- | --- |
| **Compléter la partie administrative** si `cible_partie_2_requise = 'oui'`, sinon **Voir le résultat final** | principale | Partie 2, ou Page Résultat 2 — et verrouille la décision |
| **Faire une nouvelle simulation** | secondaire | remet à zéro réponses, calculs et verrouillage |
| **Précédent** | secondaire | rouvre le questionnaire sur sa dernière page, réponses intactes |

« Précédent » n'existe que tant que rien n'est verrouillé — et donc jamais sur
un résultat ouvert depuis une seed, qu'aucun parcours ne précède.

---

## Décision standard

Affichée lorsque la Partie 1 n'a pas tranché (`p1_cas_final_direct = 'aucun'`).

### Bloc décision

**Décision médicale établie**

> Le mode de transport retenu est : **[transport]**. C’est le mode le moins
> onéreux compatible avec l’état de santé et le niveau d’autonomie du patient.

### Bloc Information destinée au patient

> Votre médecin vient de confirmer que votre état de santé justifie un transport
> adapté.
>
> Le transport retenu est : **[transport]**.

**Quelques explications**

> Ce choix correspond à votre situation au moment du transport et à l’aide dont
> vous avez besoin pendant le trajet.

**Le ou les critères médicaux retenus sont les suivants** — les options cochées
en Q1.1 (voir le tableau plus bas).

**Le ou les cas particuliers médicaux retenus sont les suivants** — les options
cochées en M0 (voir le tableau plus bas).

**Transport partagé** — seulement si `cible_transport_partage_applicable` :

> Votre état de santé est compatible avec un transport partagé.

ou, si `cible_transport_partage_incompatible` :

> Votre état de santé est incompatible avec un transport partagé.

**Équipement du véhicule** — seulement si `cible_equipement_bariatrique_requis` :

> Le véhicule utilisé doit disposer d’un équipement bariatrique adapté. Cette
> exigence ne modifie pas le mode retenu.

---

## Cas tranchés dès la Partie 1

Trois cas particuliers médicaux closent le parcours ici même. Le bloc
« Information destinée au patient » y prend sa variante « aucun transport
prescriptible » (les deux conditions cumulatives, plus bas), et aucune liste de
critères n'est affichée.

### SMUR

**Transport par une équipe SMUR — Structure Mobile d’Urgence et de Réanimation**

> Le déplacement relève d’un transport par une équipe SMUR. Aucune prescription
> médicale de transport ni demande d’accord préalable ne doit être établie dans
> ce parcours.

### Contrainte bariatrique seule

**Aucun transport prescriptible sur le seul fondement bariatrique**

> La contrainte bariatrique ne constitue pas, à elle seule, un motif médical
> ouvrant droit à une prescription prise en charge par l’Assurance Maladie.

### Permission de sortie sans motif médical

**Permission de sortie sans motif médical**

> Le déplacement correspond à une permission de sortie demandée par le patient,
> sans motif médical : il ne donne pas lieu à une prescription médicale de
> transport.

### Variante patient — aucun transport prescriptible

> Dans votre situation, les informations renseignées ne permettent pas à votre
> médecin de prescrire un transport sanitaire.

**Quelques explications**

> Pour qu’un transport sanitaire puisse être prescrit, deux éléments doivent
> être réunis :
>
> **1. Une situation ouvrant droit à la prise en charge** — par exemple : une
> hospitalisation, certains soins liés à une affection de longue durée, un
> accident du travail, une maladie professionnelle ou une autre situation prévue
> par l’Assurance Maladie.
>
> **2. Un besoin médical de transport adapté** — par exemple : un besoin d’être
> transporté en ambulance, en VSL, en taxi conventionné, dans un véhicule adapté
> au fauteuil roulant, ou avec un niveau d’aide compatible avec votre état de
> santé.
>
> Dans les informations indiquées, au moins l’un de ces deux éléments n’est pas
> suffisamment établi.

---

## Descriptions vulgarisées — critères médicaux (Q1.1)

| Critère affiché | Description patient |
| --- | --- |
| Incapacité à se déplacer de manière autonome | Votre pathologie, votre traitement ou un handicap ne vous permet pas de faire seul un long trajet, de prendre les transports en commun ni de conduire. |
| Aide technique et assistance pour monter dans le véhicule | Vous utilisez un fauteuil roulant, un déambulateur ou des béquilles, et vous avez besoin d’aide pour monter dans le véhicule ou en descendre. |
| Aide d’un professionnel | Aucun proche ne peut vous accompagner, et vous avez besoin d’un professionnel pendant le trajet ou pour les formalités liées au transport. |
| Règles d’hygiène ou désinfection du véhicule | Votre état nécessite des conditions de transport limitant les risques liés à l’hygiène pendant le trajet. |
| Risque d’effets secondaires, de malaise ou de complications | Votre état peut entraîner un malaise, une fatigue importante ou une réaction nécessitant un transport plus encadré. |
| Maintien dans le fauteuil roulant pendant le transport | Le transport doit être adapté à votre fauteuil roulant et permettre le trajet sans transfert vers un siège classique. |
| Position allongée ou semi-allongée | Votre état ne permet pas un transport assis classique pendant le trajet. |
| Brancardage ou portage | Votre état nécessite une aide physique importante pour être installé, déplacé ou transféré, même sur une courte distance. |
| Surveillance constante et matériel de secours | Votre état peut se dégrader pendant le trajet : une personne qualifiée doit vous surveiller, avec du matériel de secours à disposition. |
| Administration d’oxygène | Votre état nécessite la présence ou l’administration d’oxygène pendant le trajet. |
| Isolement, asepsie ou désinfection stricts | Votre état impose des conditions renforcées pour éviter un risque infectieux ou protéger votre santé. |
| Aucune aide ou condition particulière | Les informations renseignées ne montrent pas de besoin médical imposant une ambulance, un VSL, un taxi conventionné ou un véhicule adapté au fauteuil roulant. |

## Descriptions vulgarisées — cas particuliers médicaux (M0)

| Cas affiché | Description patient |
| --- | --- |
| Transport par une équipe SMUR — Structure Mobile d’Urgence et de Réanimation | Votre état nécessite l’intervention d’une équipe médicale d’urgence pendant le transport. |
| Équipement bariatrique adapté requis | Le véhicule utilisé doit disposer d’un équipement adapté à votre morphologie ou à votre poids. |
| Permission de sortie demandée sans motif médical | Le déplacement correspond à une permission de sortie que vous avez demandée, sans motif médical. |
| Soins ou examens liés à une ALD — Affection de Longue Durée — reconnue | Le transport est lié à une maladie reconnue comme affection de longue durée par l’Assurance Maladie. |
| Séance de dialyse, de radiothérapie ou de chimiothérapie | Le transport est lié à une séance de soins répétée ou spécialisée, hémodialyse comprise. |
| Aucun cas médical particulier | Aucune des situations médicales particulières prévues par le simulateur ne s’applique. |
