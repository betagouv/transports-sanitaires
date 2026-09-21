# 08: Respecter les faits médicaux verrouillés pour la radiothérapie (TS973-08)

**What to build:** l'exception radiothérapie ne peut plus contredire une
déclaration médicale disant qu'aucune séance n'est concernée ; si la séance a
été omise, le prescripteur est renvoyé vers une reprise médicale plutôt que
vers une case cochée à sa place.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `ROUTE-RADIO-MEDICAL-CONFLICT` ne finalise plus le parcours
- [ ] La séance réellement déclarée, avec un transfert compatible (ticket
      06), continue de passer
- [ ] Aucune séance n'est cochée automatiquement par l'app
- [ ] La reprise médicale invalide les anciennes réponses administratives qui
      en dépendaient
