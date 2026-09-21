# 12: Mettre le texte médical intégral dans le Cerfa, sans annexe (TS973-12)

**What to build:** le prescripteur retrouve tout le texte médical dans la
rubrique du Cerfa (PMT ⑤ ou DAP ③), sans annexe séparée ; si le texte dépasse
ce que la mise en page peut porter, l'app le lui dit et lui demande de
reformuler avant de générer le document.

**Blocked by:** 01, 10 (le texte ne doit plus référencer l'ancien type
d'hospitalisation retiré au ticket 10)

**Status:** ready-for-agent

- [ ] Les blocs médicaux sont séparés par « ; » et le texte reste intégral
      dans la rubrique (ex. « Sortie d'hospitalisation ; Nécessite un
      brancardage ou un portage… »)
- [ ] Aucun texte tronqué, résumé automatiquement, mis en annexe ou renvoyé
      « voir annexe »
- [ ] L'ancien type d'hospitalisation n'apparaît plus dans ce texte
- [ ] Le S3141 ne reçoit aucune rubrique médicale ajoutée
- [ ] En dépassement réel de la mise en page, une révision explicite est
      demandée au prescripteur puis le texte est remesuré avant génération
- [ ] L'impression du résultat (hors Cerfa) reste accessible dans tous les
      cas
- [ ] Aucun texte médical n'apparaît sur un volet public du document
