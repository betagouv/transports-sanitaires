# 18: Revalider les simulations administratives anciennes (TS973-18)

**What to build:** à trancher au démarrage du ticket — soit un vrai mécanisme
de révision administrative (marqueur de version, purge des réponses P2
obsolètes à la reprise), soit la constatation documentée que notre app n'a
aujourd'hui aucune persistance longue durée à revalider, avec remontée de
l'écart au ticket 21.

Contexte de la décision : le ticket éditeur suppose `Session.exportState()` —
une session complète, persistable et reprenable, potentiellement sous une
version différente du modèle. Chez nous, `passation.ts` ne transporte que le
volet P1 (médical), au même poste, dans le même enchaînement (« hors périmètre »
assumé par son propre commentaire) ; `convocation-revalidation.ts` ne revalide
que dans la même page chargée. Aucune reprise inter-visite n'existe
aujourd'hui côté app — à vérifier de nouveau avant de trancher, au cas où
autre chose serait apparu entre-temps.

**Blocked by:** 01, 10

**Status:** ready-for-agent

- [ ] Décision prise et documentée dans ce ticket : construire le mécanisme,
      ou consigner l'écart de portée
- [ ] Si construit : une session v9.7.2 restaurée force la revalidation de
      son volet P2, sans inventer de réponse
- [ ] Si construit : une session déjà en v9.7.3 reprend sans effacement indu
- [ ] Si construit : une ancienne asepsie positive reste revalidée séparément
      (son propre mécanisme n'est pas modifié)
- [ ] Si documenté comme écart : une anomalie est écrite pour le ticket 21
      plutôt que le ticket fermé sans trace
