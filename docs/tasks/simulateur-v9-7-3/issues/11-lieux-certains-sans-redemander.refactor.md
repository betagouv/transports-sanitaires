# 11: Afficher les lieux certains sans les redemander (TS973-11)

**What to build:** quand le lieu découle déjà du trajet qualifié (départ
d'une sortie physique, arrivée d'une entrée physique, arrivée aux urgences),
le prescripteur ne le voit plus redemandé — il le retrouve déduit dans le
récapitulatif, avec l'adresse utile encore à saisir si besoin.

**Blocked by:** 01

**Status:** ready-for-agent

Le ticket 01 a déjà porté le mécanisme de déduction lui-même (`p2_type_depart_deduit`/
`p2_type_arrivee_deduit`, pures règles du modèle) : `cible_lieu_depart_type`/
`cible_lieu_arrivee_type` le traversent déjà jusqu'au CERFA
(`rubriques-trajet.ts`, `composition.ts` les lisaient déjà), et le
questionnaire saute déjà l'écran devenu inapplicable — vérifié à l'engine
(`tests/simulateur/adresses-obligatoires.test.ts`) et au contrat
(`tests/simulateur/etapes.test.ts`). Voir `references/precedents.md` du skill
`implement-publicodes-version` pour le détail. Reste deux critères, tous deux
front :

- [ ] Le fait effectif (famille de lieu déduite) est visible au
      récapitulatif, avec son origine — pas présenté comme une saisie du
      prescripteur
- [ ] Modifier le motif du trajet recalcule le lieu déduit et invalide les
      données devenues incompatibles (adresse déjà saisie pour un autre
      lieu, notamment)
- [x] Aucun état médical, lieu de vie ou nombre de trajets n'est supposé par
      cette déduction — déjà garanti par construction : `p2_type_depart_deduit`/
      `p2_type_arrivee_deduit` (regles.publicodes) ne lisent que
      `p2_exception_admission_had`, `p2_retour_penitentiaire_effectif` et
      `p2_raison_principale`

Les deux premiers critères restent rouges dans `tests/simulateur/precedent-depuis-un-resultat.test.tsx`
(un écran « type de lieu d'arrivée » encore attendu par un test de navigation
arrière) — à vérifier si ce test relève de ce ticket ou d'un réordonnancement
(16/17).
