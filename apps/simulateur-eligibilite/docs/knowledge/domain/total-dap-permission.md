# Le total de trajets d'une DAP de permission

Une permission de sortie qui exige une DAP (plus de 150 km, avion ou bateau)
demande combien de trajets la DAP couvre. Ce total est une réponse du
prescripteur. Depuis la v9.7.3 (TS973-09), il se confronte à ce que la
permission rend possible.

## La capacité

La capacité est le plus grand total compatible avec :

- la période prescrite, de la première permission à sa date de fin ;
- le plafond mensuel d'allers-retours, de 1 à 5 ;
- une permission au plus par semaine, du lundi au dimanche ;
- les sens couverts.

La première permission réserve sa semaine et une occurrence de son mois. Une
semaine à cheval sur deux mois peut compter pour l'un ou l'autre. Le calcul
choisit l'affectation qui place le plus de permissions.

| Organisation | Ce que compte une permission |
|---|---|
| aller-retour identique | 2 trajets, et le total doit être pair |
| trajets simples ou aller-retour différent | 1 trajet |

Exemple : une seule permission du 4 au 6 septembre, période close le 6, un
aller-retour par mois. La capacité est de 2 trajets en aller-retour identique.
Le total 2 passe, 4 et 999 sont refusés.

Une permission de plus de 48 heures, ou une période qui dépasse six mois après
l'hospitalisation, n'offre aucune capacité.

Les dates-heures se lisent à l'heure de Paris. Le formulaire les rend sans
fuseau : c'est l'heure de l'établissement. Les 48 heures sont des heures
réelles : du samedi 24 octobre 2026 à 10 h au lundi 26 à 10 h, il y en a 49,
à cause du passage à l'heure d'hiver.

## Ce que la capacité n'est pas

- **Un calendrier.** Elle ne fixe ni le jour ni la durée des permissions
  futures.
- **Une valeur imposée.** Un total inférieur est toujours admis. Le document
  porte le total saisi, jamais la capacité, ni le plafond mensuel multiplié.

## À l'écran

Un total incompatible s'affiche en erreur sous la saisie. La saisie reste
telle qu'elle a été tapée, et le champ reste modifiable. « Suivant » reste
grisé tant que le modèle ne dit pas l'étape complète
(`p2_nombre_permission_dap_complet`).

Le message dit ce qui cloche. Il ne remplace jamais la saisie.

| Cause | Message |
|---|---|
| pas un entier d'au moins 1 | « Indiquez un nombre entier de trajets, au moins 1. » |
| au-delà de la capacité | « … permettent au plus 2 trajets. » |
| impair en aller-retour identique | « Des allers-retours identiques comptent un nombre pair de trajets… » |

Un total pas encore répondu n'est pas refusé. La garde dirait sinon « non »
avant même la question, et le modèle ne la poserait plus : sa règle de
complétude s'arrête au premier faux.

## Pour une seed ou le labo

La garde `p2_nombre_permission_dap_valide` est recalculée à chaque tour. Une
seed ou le labo qui pose un total incompatible n'obtient aucune DAP : le
résultat reste « informations insuffisantes ».
