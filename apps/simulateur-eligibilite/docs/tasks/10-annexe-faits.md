# 10, annexe : d'où vient chaque fait

Les 58 faits du YAML v10.0.0, classés selon ce que le livrable permet d'en
dire. Le classement est une lecture du catalogue, de
`PUBLICODE_MODELE_ET_ENTREES.md` et de `CONTRAT_PREUVE_Q21.md`. Il sert à
borner ce qu'on demande à l'éditeur.

| Classe | Nombre | Ce que ça veut dire |
|---|---|---|
| Direct | 31 | Une réponse du catalogue donne le fait, sans jugement. |
| Calculé | 7 | L'application le calcule par une règle écrite dans le livrable. |
| À interpréter | 20 | Le livrable ne dit pas quelle réponse le prouve, ou se lit de plusieurs façons. |

## Direct (31)

| Fait | Réponse qui le met à « oui » |
|---|---|
| `fait_autonomie_professionnel` | Q1.1 = 3 |
| `fait_accompagnant` | Q1.1 = 2 |
| `fait_critere_tap` | Q1.2, l'une des options 1 à 5 |
| `fait_critere_fauteuil` | Q1.2, option 6 |
| `fait_critere_allonge` | Q1.2, option 7 |
| `fait_critere_brancard` | Q1.2, option 8 |
| `fait_critere_surveillance` | Q1.2, option 9 |
| `fait_critere_oxygene` | Q1.2, option 10 |
| `fait_critere_asepsie` | Q1.2, option 11 |
| `fait_partage_incompatible` | Q1.3, option 6 |
| `fait_prefere_transport_commun` | Q1.4 = 2 |
| `fait_atmp_lie` | Q2.2.1, option 1 |
| `fait_motif_samsah` | Q2.2.1, option 7 |
| `fait_motif_pension` | Q2.2.1, option 9 |
| `fait_permission` | Q2.1 = 11, ou Q2.2.1, option 3 |
| `fait_ald_base_3` | Q2.2.2 = Oui |
| `fait_distance_plus_50` | Q2.3.1 = 2 ou 3 |
| `fait_distance_plus_150` | Q2.3.1 = 3 |
| `fait_avion_bateau_ligne` | Q2.3.2 cochée |
| `fait_meme_type_soins` | Q2.3.3 = Oui |
| `fait_dans_deux_mois` | Q2.3.3 = Oui |
| `fait_urgence_attestee` | Q2.3.4 = Oui |
| `fait_transfert_article80` | Q2.5 = Oui |
| `fait_exception_article80_admission_sans_sejour` | Q2.6, option 2 |
| `fait_centre15_interetablissements` | Q2.6, option 3 |
| `fait_exception_article80_had_intercurrent` | Q2.6, option 5 |
| `fait_exception_article80_radiotherapie` | Q2.6, option 8 |
| `fait_exception_article80_dialyse_domicile` | Q2.6, option 9 |
| `fait_exception_article80_admission_had` | Q2.6, option 10 |
| `fait_convocation` | Q2.10 = 1 à 6 |
| `fait_htnm_hors_maternite` | Q2.14, « Oui hors engagement maternité » |

## Calculé (7)

| Fait | Règle |
|---|---|
| `fait_p1_complete` | Toutes les questions visibles de P1 ont une réponse valide. Le contrôle « bariatrique » qui doit bloquer P1 reste flou (Q1.3). |
| `fait_p2_complete` | Toutes les questions visibles de P2 ont une réponse valide, segments compris. |
| `fait_urgence_repondue` | Q2.3.4 a une réponse. |
| `fait_ald_base_4_mineur` | Q2.2.2 = Non, patient mineur, Q2.2.4 = Oui. Dépend aussi de la « déficience », voir `fait_ald_liee`. |
| `fait_motif_camsp` | Q2.1 = 10 ou Q2.2.1, option 6, et rattachement confirmé en Q2.1.h si demandé. |
| `fait_exception_article80_usld` | Q2.6, option 6, et implantation différente (Q2.13). |
| `fait_exception_article80_ehpad` | Q2.6, option 7, et implantation différente (Q2.13). |

## À interpréter (20)

| Fait | Ce que le livrable ne dit pas |
|---|---|
| `fait_source_officielle_active` | Aucune question ne donne la date du soin, alors que la source doit être « active à la date ». |
| `fait_correspondance_univoque` | Quelles réponses de Q2.1.a à k rendent la correspondance univoque, profil par profil. |
| `fait_conditions_soin_verifiees` | Les conditions de chaque profil sont en phrases dans `selection_q21.json`. Rien ne les relie à une réponse. |
| `fait_regime_verifie` | Lequel des trois choix du sous-champ de Q2.1 (droit commun, AME, autre) vaut « vérifié ». |
| `fait_exclusion_soin_prouvee` | Quelle réponse prouve une exclusion. « Démarche seulement administrative » en Q2.1.a en est-elle une ? |
| `fait_evenement_sans_soin` | « Fondement prouvé en entier » pour permission, convocation ou maternité : par quelles réponses. |
| `fait_hospitalisation` | Les séances de Q1.3 suffisent-elles ? Q2.1 = 8 demande de « vérifier le séjour de soins réel », sans question pour le faire. |
| `fait_ald_liee` | Le titre dit « lien avec ALD et déficience ». Q1.3 donne le lien. Aucune réponse n'est désignée comme établissant la déficience. |
| `fait_nombre_transports` | Un nombre est attendu. Q2.3.3 répond par Oui ou Non. Quelle valeur transmettre. |
| `fait_dap_camsp` | Aucune question. Est-il vrai dès que `fait_motif_camsp` l'est ? |
| `fait_dap_maternite` | Q2.14 établit le dispositif. La DAP en découle-t-elle toujours ? |
| `fait_centre_reference_destination` | Q2.13 dit « destination déduite seulement si le trajet va réellement à ce centre », sans dire si c'est demandé. |
| `fait_appel_centre15` | Le tableau des groupes cite Q2.3.4 et Q2.6. Aucune des deux ne demande s'il y a eu un appel au Centre 15. |
| `fait_exception_article80_air_mer` | Q2.3.2 cochée (ligne régulière) vaut-elle l'exception, ou seulement un transport hors ligne régulière ? |
| `fait_htnm_segment_verifie` | Aucune question. « Reste faux sur le sous-cas non tranché » : est-il toujours faux ? |
| `fait_permission_mineur_admissible` | Les contrôles de dates sont écrits. L'effet du cadre (soins, organisation, convenance) ne l'est pas. |
| `fait_permission_charge_patient` | Q2.7 = 4 le donne. Q2.7 = 3 (adulte, permission liée aux soins) ne correspond à aucun fait. |
| `fait_seconde_branche_incompatible` | « Segment déclaré incompatible » : par qui, et avec quelle question. |
| `fait_preuve_ald_inconnue_decisive` | « Décisive » suppose de savoir qu'aucun autre motif ne suffit. L'application devrait donc évaluer le droit avant d'appeler le moteur. |
| `fait_couverture_inconnue_decisive` | Même difficulté. Et le moteur oriente déjà vers la caisse quand le soin est « indéterminé ». |

## Réponses qui ne donnent aucun fait

| Réponse | Constat |
|---|---|
| Q0.1 | Le catalogue cite `fait_intention_entree`, absent du YAML. |
| Q1.3, option 1 (équipement bariatrique) | Aucun fait. |
| Q2.2.1, option 10 (retour pénitentiaire) | Aucun fait. |
| Q2.6, item 1 (transfert définitif ou provisoire) | Aucun fait. |
| Q2.7 = 3 | Aucun fait, voir `fait_permission_charge_patient`. |

## Une question transversale

`PUBLICODE_MODELE_ET_ENTREES.md` écrit qu'un fait est « une preuve vérifiée,
jamais une déclaration client fiable par défaut ». Le simulateur n'a pas
d'autre source que les réponses du prescripteur. Les 31 faits « directs »
supposent donc qu'une réponse vaut preuve.

## Par étape du chantier 10

| Étape | Faits concernés | État |
|---|---|---|
| 2. P0 et P1 | 11 directs, 1 calculé | faisable, sauf le contrôle bariatrique |
| 3. P2 | 20 directs, 6 calculés, 20 à interpréter | faisable en partie : tout ce qui touche Q2.1, l'ALD, les permissions et les incertitudes attend l'éditeur |
| 5 à 7. P3, R3, cerfa | aucun : P3 ne modifie pas les faits | non bloquées par ce sujet |
