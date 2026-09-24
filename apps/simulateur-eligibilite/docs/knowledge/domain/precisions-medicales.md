# Les précisions médicales

Deux questions précisent le motif médical porté par le Cerfa :

| Question | Quand | Énoncé |
|---|---|---|
| `p2_motif_detail` | consultation, examen, soin, ou « Autre examen ou soin » | selon la raison, ex. « Quelle consultation motive ce déplacement ? » |
| `p2_transfert_motif_detail` | transfert provisoire | « Quel examen ou soin motive ce transfert provisoire ? » |

Depuis la v9.7.3 (TS973-15), ce sont des **saisies directes** de 500
caractères au plus. Les anciens choix « Autre - préciser », qui imposaient une
seconde sélection, ont disparu. « Autre examen ou soin » mène droit à sa
précision.

## Quand elles sont posées

Au stade documentaire, en fin de parcours, et seulement quand un document de
prescription les porte (`p2_document_prescription_determine`). Une issue sans
Cerfa n'attend donc aucune précision.

## Les suggestions

Elles aident, elles ne répondent pas : aucune n'est présélectionnée, et le
prescripteur tape ce qu'il veut. Elles viennent du contrat d'interface.

- Consultation : cardiologie, neurologie, oncologie.
- Examen : imagerie médicale.
- Soin : rééducation.
- Transfert : imagerie médicale, rééducation, et les séances que la partie
  médicale déclare.

## Ce qui est refusé

L'étape ne se valide pas tant que le modèle ne la dit pas complète
(`p2_motif_detail_complet`, `p2_transfert_precision_complete`), ni tant
qu'une saisie de la page est en erreur. Un message sous la saisie dit
pourquoi.

| Saisie | Message |
|---|---|
| un libellé qui ne dit que la raison, ex. « Consultation médicale », « Autre » | « Précisez la consultation, l'examen ou le soin… » |
| une séance que la partie médicale ne déclare pas | « Cette séance n'est pas déclarée dans la partie médicale… » |
| plus de 500 caractères | « La précision tient en 500 caractères au plus. » |

Les libellés génériques se comparent repliés : casse, accents et espaces ne
comptent pas. Le modèle, lui, compare des chaînes exactes. L'application
refuse donc aussi ce que le modèle laisserait passer, et verse
`p2_validations_documentaires = non` pour qu'aucun document ne sorte. Une
réponse restée d'une autre raison ne compte pas.

Aucune séance n'est acceptée ni cochée à la place du prescripteur. Un texte
libre valide reste tel quel, même si la raison change ensuite.
