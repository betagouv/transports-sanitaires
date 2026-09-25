# Les gardes que l'application calcule pour le modèle

Le modèle attend de l'application quatorze entrées `owner: application`, dont
sept gardes. Elles ne sont jamais posées au prescripteur : l'application les recalcule à
chaque saisie (`entrees-calculees.ts`), et le modèle bloque le résultat quand
l'une vaut « non ».

Depuis la v9.7.3, elles réencodent `technicalSituation` de l'adaptateur de
l'éditeur (`src/application.mjs`). La campagne v9.7.3 les éprouve
(`tests/simulateur/campagne-*-v9-7-3.test.ts`).

| Entrée | Refuse | Où |
|---|---|---|
| `p2_permission_dates_valides` | une hospitalisation future, une permission qui la précède, une durée nulle ou de plus de 48 heures réelles | `dates-de-permission.ts` |
| `p2_permission_calendrier_valide` | une période qui précède la première permission ou dépasse six mois calendaires, une fréquence hors de 1 à 5 | `dates-de-permission.ts` |
| `p2_types_lieux_valides` | un domicile aux deux bouts, une permission qui ne relie pas une structure à un lieu de vie | `entrees-calculees.ts` |
| `p2_qualification_declarations_valides` | une raison et une exception contradictoires | `entrees-calculees.ts` |
| `p2_exceptions_trajet_valides` | une exception EHPAD ou USLD sans lieu de ce type, une arrivée d'urgences hors structure | `exception-sans-lieu.ts` |
| `p2_nombre_permission_dap_valide` | un total de DAP de permission au-delà de ce que la période permet, ou impair en aller-retour identique | `nombre-permission-dap.ts` |
| `p2_validations_documentaires` | un nombre qui n'est pas un entier d'au moins 1, une date d'accident impossible ou future, une précision médicale générique ou trop longue | `validations-documentaires.ts` |

## Les dates

Une date-heure sans fuseau se lit à l'heure de Paris, une date-heure avec
fuseau se lit telle quelle (`heure-de-paris.ts`). Le formulaire les rend sans
fuseau : c'est l'heure de l'établissement. L'éditeur, lui, refuse une
date-heure sans fuseau (`PERM-DATE-SANS-FUSEAU`) : c'est un écart assumé.

Six mois calendaires se ramènent au dernier jour du mois plus court : une
hospitalisation du 31 mars autorise une période jusqu'au 30 septembre, pas
jusqu'au 1er octobre.

## Une permission et son trajet

Une permission part d'une structure (structure de soins, USLD) vers un lieu de
vie (domicile, autre lieu, EHPAD). Elle peut aussi en revenir seule, sauf en
aller-retour identique. Deux structures, ou un établissement pénitentiaire,
ne font pas une permission (`ROUTE-PERMISSION-HOSP-HOSP-REFUSED`).

## Ce qui reste permissif

Une saisie pas encore répondue n'est jamais refusée : c'est la complétude qui
la réclame. Sinon, une garde à « non » avant la question empêcherait le modèle
de la poser.
