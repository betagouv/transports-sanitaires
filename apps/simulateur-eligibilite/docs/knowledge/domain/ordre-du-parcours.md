# L'ordre du parcours administratif

L'ordre des questions est déclaré dans `etapes.ts`, recopie des étapes du
contrat d'interface. Le moteur, lui, dit **quelles** questions manquent. Quand
plusieurs manquent en même temps, c'est cet ordre qui choisit laquelle poser
d'abord.

La v9.7.3 réordonne la Partie 2 pour qualifier tôt ce qui décide du
financement. Une issue connue se conclut alors sans questions inutiles.

## Le transfert d'abord (TS973-16)

| Avant | Depuis la v9.7.3 |
|---|---|
| raison, contextes, transfert, nature, permissions, exceptions | raison, transfert, nature, permissions, exceptions, contextes |

Exemple : un transfert définitif sans exception est à la charge de
l'établissement. Il se conclut sans contextes, urgence, nombre ni adresse.
Une exception Assurance Maladie cohérente (EHPAD, USLD…) poursuit la collecte.

Un transfert se qualifie par la question posée (`p2_transfert_en_cours`,
`p2_nature_transfert`), jamais par les types de lieu : deux structures de soins
aux deux bouts ne font pas un transfert.

## Changer une réponse

Toute modification réelle d'une réponse efface les réponses de toutes les
étapes suivantes, qui se reposent (`aval-invalide.ts`). C'est la règle du
contrat d'interface (`state.on_change:
clear_all_downstream_question_values_then_recompute_technical_values`) et du
guide de l'éditeur (§ 6).

Exemples :

- une exception EHPAD cochée pour un transfert provisoire, puis la nature
  passe à « Définitif » : les exceptions se reposent, sans la case cochée ;
- le type de lieu de départ change : l'adresse, l'arrivée, la distance et
  les précisions documentaires se reposent.

Sans cet effacement, une réponse d'une autre branche restait dans la
situation. Le modèle l'ignorait, mais les gardes calculées par l'application
la lisaient et pouvaient bloquer une issue légitime.

Revenir sur une page sans rien changer, ou répondre pour la première fois,
n'efface rien.

## Les précisions médicales à la fin (TS973-15)

Voir [`precisions-medicales.md`](precisions-medicales.md).
