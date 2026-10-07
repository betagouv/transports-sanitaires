# Questions à l'éditeur

Les tickets vivent dans Notion, `[BDD] Tasks`. Ce fichier garde la trace de ce
qui est ouvert et de ce qui reste à ouvrir. Les décisions sont dans
[PLAN.md](PLAN.md).

## Tickets ouverts

Tous affectés à l'éditeur et rattachés au Sprint 06.

| Sujet | Ticket | Chantier |
|---|---|---|
| Lecture seule : réafficher une valeur déjà connue, ou seulement la réutiliser. Le livrable et la consigne orale se contredisent. | « v10 : préciser quand une valeur "en lecture seule" doit être réaffichée » | 09 |
| PMT et DAP du livrable : des spécimens sans champs. Non bloquant (D-62). | « v10 : les PDF des cerfa du livrable ne sont pas les bons gabarits », priorité basse | 09, 10 |
| Réponses vers faits : 20 faits sur 58 ne se déduisent pas sans interprétation, et bloquent une partie de l'étape 3. | « v10 : le lien entre les réponses et les faits n'est pas fourni », priorité haute. Le classement des 58 faits est dans le ticket et dans [l'annexe](10-annexe-faits.md). | 10 |
| Retour différent de l'aller : deux segments à qualifier et à comparer, sans notion de segment dans le YAML ni dans le socle. Notre suggestion : ne pas le proposer, et renvoyer vers une seconde simulation. | « v10 : retour différent de l'aller, deux segments à qualifier dans une même simulation », priorité haute | 09, 10 |
| Équipement bariatrique : le catalogue demande de bloquer P1, sans dire quels modes sont incompatibles ni quel message afficher. | « v10 : la règle de blocage pour l'équipement bariatrique n'est pas écrite », priorité moyenne | 09, 10 |
| Adresse hors de France : comment le prescripteur signale l'étranger. Notre suggestion : une case « Adresse hors de France ». | « v10 : comment saisir une adresse hors de France », priorité basse | 09, 10 |

## En cours chez l'éditeur, sans ticket

- **Un oracle écrit en réponses.** Les 25 cas de référence sont en faits. L'éditeur
  prépare des cas « réponses, issue attendue ». Ils débloquent les seeds
  (D-57) et la vérification de bout en bout du passage des réponses aux faits.
- **Le texte de la fiche R2.** Le catalogue le dit « à définir ». L'éditeur l'a
  prévu de son côté. Il bloque l'étape 4 tant qu'il n'est pas livré.

## À ouvrir, pas encore décidé

| Sujet | Le problème | Priorité suggérée | Chantier |
|---|---|---|---|
| Trois demandes qu'un programme ne sait pas tenir | 1. Rejeter un texte libre « contradictoire » en Q3.4 et Q3.5 : on ne détecte pas une contradiction dans du texte libre. 2. Vérifier le « format postal local » d'une adresse hors de France, pays par pays. 3. Bloquer le PDF pour une adresse « clairement incompatible » avec le lieu ou la tranche de distance (Q3.2), sans déduire un seuil routier d'une distance à vol d'oiseau : il faudrait un calcul d'itinéraire. Nous ne les implémentons pas. | moyenne | 09 |
| Texte trop long | Le livrable demande une reformulation à valider puis le blocage du PDF. Nous débordons, sans jamais bloquer (D-61, D-63). | moyenne | 09 |
| Référence du mapping | La page Notion « Mapping documents » dit que le Google Sheet fait foi. Le README du package désigne `mapping_documents.json` et ne cite pas le Sheet. Nous suivons le package (D-72). Le Sheet est-il encore maintenu, et synchronisé avec la v10 ? | basse | 10 |

## Écartés, sauf avis contraire

- Le « contexte fiable ». Tranché par Simon (D-74) : le rattachement n'en est
  pas un, les rubriques d'identité du cerfa restent vides.
- « Issue » ou « éligibilité », « mode » ou « transport préconisé ». Pas
  important.
- La recherche d'acte en Q2.1 (D-65). Ce n'est pas un écart : le livrable
  désigne lui-même `selection_q21.json` comme le dictionnaire des intitulés
  courants et de leurs synonymes. Les index CCAM et NABM ne portent que des
  codes et des libellés officiels, et sont dits « index de recherche, pas une
  liste positive ». L'exemple du catalogue, « IRM du genou », figure dans la
  sélection.
- Le type de lieu sur le cerfa (souligner ou non le libellé préimprimé). Les
  trois gabarits ont un champ par type de lieu : la contradiction ne
  concernait que les spécimens sans champs.
- Le format du catalogue (Markdown de 811 lignes, tableaux HTML) et les
  nomenclatures NGAP et LPP livrées en PDF. Gênants, mais on avance sans.
- La mise hors production des résultats positifs avant la recette N2 à N5 :
  une décision d'équipe, pas une correction du livrable.
- Le vocabulaire divergent : il a son support, la liste publiée pour l'équipe.
