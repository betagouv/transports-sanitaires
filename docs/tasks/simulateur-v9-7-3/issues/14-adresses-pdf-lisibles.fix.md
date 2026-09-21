# 14: Rendre les adresses PDF lisibles sans modifier leur rôle (TS973-14)

**What to build:** les adresses hors domicile (nom, rue, complément, code
postal, commune) sont imprimées lisiblement sur PMT/DAP/S3141, avec le
gabarit et la police réels — sans changer ce que le modèle transmet.

**Blocked by:** None (can start immediately) — correction de rendu PDF pure,
indépendante de la recopie du modèle.

**Status:** ready-for-agent

- [ ] Les cinq champs d'une adresse hors domicile sont lisibles sans perte
      sur les trois documents
- [ ] « Domicile » reste correctement coché quand c'est le cas, sans imprimer
      d'adresse à la place
- [ ] Aucune copie automatique de l'adresse de trajet dans l'adresse du
      bénéficiaire (`beneficiaire_adresse` reste issue de l'identité externe
      ou d'une saisie manuelle)
- [ ] L'absence d'identité externe n'est pas masquée par une adresse de
      trajet
