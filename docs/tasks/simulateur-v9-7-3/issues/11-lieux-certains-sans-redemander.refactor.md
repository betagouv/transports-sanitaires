# 11: Afficher les lieux certains sans les redemander (TS973-11)

**What to build:** quand le lieu découle déjà du trajet qualifié (départ
d'une sortie physique, arrivée d'une entrée physique, arrivée aux urgences),
le prescripteur ne le voit plus redemandé — il le retrouve déduit dans le
récapitulatif, avec l'adresse utile encore à saisir si besoin.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Pas d'écran redondant pour ces trois cas ; HAD, EHPAD/USLD et transfert
      conservent leurs qualifications spécifiques propres
- [ ] Le fait effectif (famille de lieu déduite) est visible au
      récapitulatif, avec son origine
- [ ] Modifier le motif du trajet recalcule le lieu déduit et invalide les
      données devenues incompatibles
- [ ] Aucun état médical, lieu de vie ou nombre de trajets n'est supposé par
      cette déduction
