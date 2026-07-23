# ref/ — référentiels publics figés

Ce dossier ne contient que des référentiels **publics et non identifiants**, versionnés
pour la reproductibilité : mappings manuels relus par le porteur, correspondances stables.

- `plateforme-ght-mapping.csv` *(à venir)* — rattachement manuel des libellés GHT libres de
  la plateforme au niveau GHT (sans finess) vers un GHT du référentiel. Relu par le porteur.

Le référentiel **finess → GHT** ne vit **pas** ici : c'est de l'open data volumineux (bundles
FHIR data.gouv `etablissements-de-sante-par-ght`), déclaré comme source `referentiel-ght` du
pipeline. Il est aspiré par `npm run fetch-ght` dans `data/ght/` (non versionné) et transformé
par l'étape `extract` en `build/extract/ght.csv` (régénérable). Voir le README de l'app.

L'identité des fournisseurs de données et les nomenclatures propres à chaque format vivent
ailleurs : dans `mapping.json` (non versionné) et dans les adaptateurs (`src/01-extract/adapteurs/`).
