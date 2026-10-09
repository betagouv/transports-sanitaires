# Features du simulateur

> Ce que l'app sait faire, vu par celui qui s'en sert. `tsp features simulateur`
> affiche ce tableau. Le détail est dans le [README](../../README.md).

| Feature | Ce qu'elle fait |
|---|---|
| Rattachement | Écran-porte obligatoire : l'utilisateur déclare son établissement et son service, sans s'identifier. Le référentiel vient de Grist. |
| Rattachement dégradé | Si le référentiel ne répond pas, l'utilisateur entre quand même, rattaché à « Autre / Autre ». |
| Outil prescripteur | Partie 1 du questionnaire, puis le résultat médical : le transport est-il pris en charge, et quel mode est justifié. |
| Outil secrétariat | Partie 2, puis le cas final : quel document établir, les étapes à suivre, ce qui reste à la charge de l'établissement. |
| Passation | La situation saisie par le prescripteur passe au secrétariat, qui ne la ressaisit pas. |
| Information du patient | Une explication vulgarisée du résultat, à donner au patient. |
| CERFA pré-remplis | PMT, DAP et permission de sortie des moins de 20 ans, remplis dans le navigateur depuis les réponses. Réservé au service produit. |
| Labo | Le produit teste lui-même un fichier de règles. Réservé au service produit. |
| Galerie de seeds | Le catalogue des situations de référence, ouvertes depuis une galerie. Réservé au service produit. |
| Analytics | Les événements du parcours partent vers Matomo, rangés par service. L'utilisateur peut s'y opposer depuis le site. |
| Intégration au site | Le simulateur s'affiche dans une page Sites Conformes, qui lui transmet le choix de l'utilisateur sur la mesure d'audience. |
