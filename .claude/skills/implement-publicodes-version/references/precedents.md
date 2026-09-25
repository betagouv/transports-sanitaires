# Précédents d'intégration

Ce que les intégrations passées ont appris, tenu hors du mode d'emploi parce que
c'est daté. À relire au besoin, pas à suivre à la lettre.

## Les commits

| Version | Commits |
|---|---|
| v9.4.1 | `128bbfa`, un seul commit |
| v9.5.0 | `afc1052`, `1914314`, `1de1038`, `7bc16d7` |
| v9.6.0 | `18f42c9`, `7cef1ba`, `317e221`, `11624f4` |
| v9.7 | `a79c187`, `618b07d`, `8ce19db` |
| v9.7.1 | `68d422c` (refactor préalable), `360bd77`, `b2679f5`, `ffbaed1`, `2197661`, `cfec025`, `9b8db05` |

La v9.5.0 a demandé quatre intentions : le portage du modèle, la recette portée,
les contenus rendus, le README mis à l'heure — un gabarit que les versions
suivantes reprennent sans y être tenues. La v9.7.1 en a demandé sept : un
huitième cas final (orientation vers la caisse) et une mécanique de
requalification du trajet ont chacun mérité leur commit, en plus des
quatre habituels ; un refactor préalable (`68d422c`) a fait la place sous
300 lignes avant que le modèle recopié n'y ajoute un verdict.

## Le seul correctif local

Un correctif local du modèle a existé une fois, en v9.1. Il a été retiré dès que
l'éditeur a corrigé (`f4da5b7`). C'est le seul précédent, et il ne fait pas
jurisprudence.

## Ce que la v9.5.0 a déplacé dans le contrat

- `p1_m0_smur` supprimée du modèle ;
- `p2_accompagnement_tiers` et `p2_convocation_ou_avis` devenues calculées ;
- `cible_nombre_transports_prevus` et `cible_ald_reconnue_liee_aux_soins`
  nouvellement consommées.

## Ce que la v9.7.1 a ajouté au contrat

- `p2_convocation_plus_150km`, `p2_convocation_avion_bateau`,
  `p2_convocation_aucune` entrent dans `QUESTIONS` (mosaïque CONV-AP) ;
- `p2_convocation_caracteristiques_complet` entre dans `REGLES_LUES`, à côté
  des dix règles de complétude déjà présentes ;
- `p2_convocation` y entre aussi, mais pour une autre raison : pas pour
  décider du parcours (`etapes.ts` s'en tient à la règle de complétude
  ci-dessus), mais pour adapter deux libellés à l'écran (`label_when` du
  contrat d'interface, `ChampsDePage.tsx`) ;
- `cible_convocation_type` et `cible_orientation_caisse` existent dans le
  modèle mais n'ont pas rejoint `CIBLES` : rien dans le code ne les lit
  encore. Un rappel que la règle du § 4 va dans les deux sens — retirer une
  clé du contrat n'est pas qu'un geste de suppression, c'est aussi ne pas en
  ajouter une que le code n'emploie pas.

## L'anomalie convocation-lieu, corrigée sans le dire

`tmp/9.7/anomalie-v9-7-convocation-lieu.md` remontait qu'une convocation
réclamait encore le nom d'un lieu de départ qu'elle ne collecte pas — parce
que `cible_regime_financement` dépendait de variables de prescription
(`p2_transport_charge_etablissement`, `p2_permission_charge_patient`,
`p2_document_prescription_determine`) plutôt que de `cible_cas_final`
directement. La v9.7.1 la corrige, sans que le `CHANGELOG` ne le nomme : la
seule façon de le savoir a été de rejouer la seed `secretariat-convocation`
sans son contournement (`p2_depart_nom_lieu` factice) et de constater qu'elle
passait. **Une anomalie remontée reste à vérifier à chaque version
suivante**, même absente du changelog.

## Deux regex qui ont échoué loin de leur cause

En v9.5.0, `/^le patient/i` ne matchait plus « Concernant son déplacement, le
patient : ». Et `/entrée ou sortie d'hospitalisation/i` ne matchait plus « … d'une
hospitalisation ». D'où une réponse manquée, un parcours qui bifurque, et un test
qui échoue trois écrans plus loin.

## La réponse par défaut qui a tout cassé

La question A2.1, ajoutée en v9.5.0, offre huit réponses dont la première est une
convocation. La réponse par défaut de `tests/simulateur/parcours.ts` prend cette
première possibilité, ce qui concluait le parcours avant l'heure.

## L'anomalie remontée

`tmp/anomalie-v9-5-0-accompagnement.md` est le précédent dont le § 12 du mode
d'emploi reprend la structure. Le dossier `tmp/` n'est pas versionné : si le
fichier a disparu, le tableau des sections suffit.

## v9.7.3 : trois entrées calculées qui gardent `cible_cas_final` pour tous

Trois clés `owner: application` sont apparues sans qu'aucun changelog ne les
titre : `p2_qualification_declarations_valides` et `p2_exceptions_trajet_valides`
gardent l'`applicable si` de `cible_cas_final` lui-même — sans elles, **aucun**
scénario ne conclut, pas seulement ceux qui touchent à leur sujet.
`p2_nombre_permission_dap_valide` est plus étroite (elle ne garde que
`p2_nombre_permission_dap_complet`, donc seulement les permissions avec DAP).

Reconnaître ce genre de clé : une règle du flat sans `valeur` ni `formule`, avec
`description: Donnée technique calculée par le module de référence ; jamais une
question.` — et un diff `owner: application` entre les deux `*.ui.yaml` (§ 2 du
mode d'emploi le dit maintenant, mais ne l'avait pas encore appris).

Le réencodage suit `src/application.mjs` (le nom de la fonction de référence
donne le nom français à choisir). Deux ont été portées intégralement
(`qualificationDeclarationsValid`, une partie d'`exceptionsRouteValid` — la
partie lieux, `placeType`, a été volontairement laissée à la version qui porte
les lieux déduits) ; la troisième a reçu un défaut permissif (`"oui"`,
comportement d'avant la version) le temps que son propre sujet soit porté. Une
clé qui garde `cible_cas_final` pour tous n'a pas ce choix : elle doit être
correcte dès la recopie, ou rien n'avance.

**Piège qui a coûté 300+ tests rouges pour rien** : `avecEntreesCalculees()`
n'est pas le seul endroit qui fournit ces entrées. `base-neutre.ts` les
duplique en dur (`p1_verrou_medical_valide: "oui"`, etc.) pour les tests qui
construisent une situation à la main sans passer par la fonction — la moitié
des fichiers de recette. Toute nouvelle entrée calculée s'ajoute **aux deux
endroits**, sans quoi ces tests-là citent la clé comme manquante alors que
l'application, elle, tourne très bien.

## v9.7.3 : une question retirée garde son `question:` dans le flat

`p2_type_hospitalisation` et consorts (§ 3 du mode d'emploi) restent
`titre`/`question` dans le YAML plat, seul `applicable si: non` les neutralise
— le contrat d'interface les marque `retired: true`, mais le flat ne le dit
pas. `tests/simulateur/etapes.test.ts` vérifie que toute question du modèle a
son étape en lisant `question !== undefined` dans le flat : ça la fait
compter une règle retirée comme orpheline. Le filtre a dû apprendre
`applicable si !== "non"`.

## v9.7.3 : les lieux déduits traversent déjà le CERFA

`TS973-11` (lieux déduits, pas redemandés) inquiétait par son ampleur estimée
— à tort. Les cibles `cible_lieu_depart_type`/`cible_lieu_arrivee_type`
existaient déjà et valent `p2_lieu_depart_type_effectif`/`..._arrivee_...`, que
le flat calcule tout seul (`si p2_type_depart_deduit alors 'Structure de
soins' sinon p2_trajet_depart`). Le CERFA (`rubriques-trajet.ts`,
`composition.ts`) lisait déjà ces cibles, pas la question brute : la
déduction traverse tout le pipeline sans une ligne de code applicative. Le
travail réel a été ailleurs : les fixtures qui répondaient la question devenue
inapplicable, et les tests de navigation qui attendaient un écran « type de
lieu » qui ne s'affiche plus. Ce que le mode d'emploi reste à porter pour ce
sujet : le récapitulatif distinguant un fait déduit d'une réponse, et
l'invalidation des données incompatibles quand le motif change.

## v9.7.3 : un ticket qui suppose une capacité produit qu'on n'a pas

`TS973-18` (revalider les simulations administratives anciennes) demande de
persister `Session.exportState()` et de revalider le volet administratif à
la reprise sous une révision plus récente (`ADM-v9.7.3`). Le ticket est
écrit depuis l'adaptateur de référence de l'éditeur, qui a lui-même une
session persistable et reprenable entre deux visites — une hypothèse sur
les capacités de l'intégrateur, pas seulement sur le modèle.

Vérifié à l'exécution (grep de `exportState`/`importState`/`localStorage`
dans `front/`) : rien de tel n'existe côté application. Les deux mécanismes
de « reprise » qu'on a sont plus étroits — `passation.ts` (le volet médical
P1, même poste, même enchaînement, « hors périmètre » assumé par son propre
commentaire) et `convocation-revalidation.ts` (revalide dans la même page
chargée, jamais entre deux visites). Sans persistance longue durée, il
n'existe aucun cas où une session « v9.7.2 » serait rechargée sous
« v9.7.3 » : rien à revalider dans ce sens.

**Décision retenue : documenter l'écart plutôt que construire le
mécanisme.** Construire une persistance et une révision qu'aucune
fonctionnalité actuelle n'exploite est le genre d'abstraction spéculative
que le dépôt évite ailleurs — mieux vaut l'anomalie remontée
(`tmp/anomalie-v9-7-3-revalidation-administrative-hors-perimetre.md`, non
versionné) que du code mort. Si une reprise longue durée du volet
administratif devient un besoin produit réel, `administrative_revision`
(et son pendant clinique déjà présent, `clinical_criteria_revision`) sera
le point de départ naturel. **À revérifier à chaque intégration** tant que
l'éditeur écrit ses tickets depuis son propre adaptateur : la même
hypothèse peut revenir sous un autre nom.

## v9.7.3 : une fixture qui répond à une question que le parcours ne pose pas

En portant la campagne de l'éditeur, huit cas `ROUTE-*` passaient sans rien
vérifier. Notre adaptateur du livrable remplit toutes les réponses, y compris
le type d'un lieu **déduit**, dont la question n'est jamais posée. Nos gardes
calculées lisent la situation brute, et prennent cette réponse pour une
réponse restée en arrière-plan. Le résultat était bloqué, et le helper de
test sortait avant toute assertion.

**Règle retenue** : une fixture rejouée au moteur retire les réponses que le
parcours ne poserait pas (lieu déduit, date d'un contexte non déclaré,
précision d'une autre raison). Côté application, une garde ne contrôle
qu'une réponse que la situation demande. Et un helper de test n'a jamais de
branche de sortie sans assertion : il vérifie le cas attendu, ou un refus
« par une garde » (aucune variable manquante).

## v9.7.3 : les anomalies remontées

Dans `tmp/`, non versionnées, écrites au ticket 21 :

| Fichier | Sujet | Question |
|---|---|---|
| `anomalie-v9-7-3-revalidation-administrative-hors-perimetre.md` | TS973-18 suppose une session persistable | oui |
| `anomalie-v9-7-3-completude-des-precisions-medicales.md` | la complétude compare des chaînes exactes, l'adaptateur replie | oui |
| `anomalie-v9-7-3-suggestions-de-seances-du-transfert.md` | `session_suggestions` que `suggestionsFor()` ignore | oui |
| `anomalie-v9-7-3-texte-medical-et-taille-des-champs.md` | EM-2 sans annexe face à des champs d'une ligne | oui |
| `anomalie-v9-7-3-ecarts-d-integration-assumes.md` | reprise médicale, total DAP, fuseau, effacement en aval | à confirmer, écart par écart |

Pour reproduire dans l'adaptateur de l'éditeur, copier le paquet hors de
`tmp/` et lui monter un `node_modules` minimal (`publicodes`, `yaml`) par
liens vers le magasin pnpm du dépôt. Le paquet livré ne les installe pas.
