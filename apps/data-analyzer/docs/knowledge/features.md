# Features de data-analyzer

> Ce que l'app sait faire, vu par celui qui s'en sert. `tsp features data`
> affiche ce tableau. Le métier est dans [`spec/`](../../spec/), l'exécution
> dans le [README](../../README.md).

| Feature | Ce qu'elle fait |
|---|---|
| Extraction par format | Chaque fichier source passe par l'adaptateur de son format et sort en lignes normalisées. |
| Réconciliation | Les finess sont alignés sur le référentiel national, qui fait autorité, puis rattachés à leur GHT. |
| Marts | Sept fichiers CSV : la part des trajets réalisés via les plateformes, par établissement ou GHT, année, type de transport et enveloppe. |
| Alerte de qualité | Une cellule dont le numérateur dépasse le dénominateur est signalée, jamais corrigée. |
| Publication Grist | Les marts sont publiés dans un document Grist privé, pour l'exploration et la dataviz. |
| Référentiel des GHT | `fetch-ght` rafraîchit l'open data des GHT, versionné : l'ETL tourne sans réseau. |
