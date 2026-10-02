-- ============================================================
-- Seed : Pôle "Invités & accueil" — portail mariage
-- Remplace intégralement le pôle existant (delete + insert).
-- Lancer dans l'éditeur SQL Supabase (rôle service_role).
-- ============================================================

delete from _20270628_poles where name = 'Invités & accueil';

with

-- ──────────────────────────── Pôle ────────────────────────────
pole as materialized (
  insert into _20270628_poles (id, name, sort_order)
  values (gen_random_uuid(), 'Invités & accueil', 20)
  returning id
),

-- ──────────────────────────── Domaines ────────────────────────────
d_liste as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Liste des invités & présences', 'liste-invites-presences', 1, 'avant'
  from pole returning id
),
d_info as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Informations & communication invités', 'informations-communication-invites', 2, 'avant'
  from pole returning id
),
d_besoins as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Besoins particuliers & accessibilité', 'besoins-particuliers-accessibilite', 3, 'avant'
  from pole returning id
),
d_prep as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Préparation de l''accueil', 'preparation-accueil', 4, 'avant'
  from pole returning id
),
d_accueil as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Accueil & orientation', 'accueil-orientation', 5, 'jour_j'
  from pole returning id
),
d_placement as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Placement & flux', 'placement-flux', 6, null
  from pole returning id
),
d_enfants as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Enfants & familles', 'enfants-familles', 7, null
  from pole returning id
),
d_departs as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Départs & clôture invités', 'departs-cloture-invites', 8, null
  from pole returning id
),

-- ──────────────────────────── Missions ────────────────────────────
-- d_liste
m1  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_liste.id, 'Consolider la liste générale des invités',             'todo', 1 from d_liste returning id),
m2  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_liste.id, 'Affecter les invités aux différentes séquences',        'todo', 2 from d_liste returning id),
m3  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_liste.id, 'Suivre les réponses et présences par séquence',         'todo', 3 from d_liste returning id),
m4  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_liste.id, 'Figer les effectifs opérationnels',                    'todo', 4 from d_liste returning id),
-- d_info
m5  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_info.id, 'Préparer les informations pratiques par séquence',      'todo', 1 from d_info returning id),
m6  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_info.id, 'Envoyer les informations pratiques aux invités',         'todo', 2 from d_info returning id),
m7  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_info.id, 'Préparer une communication de dernière minute',          'todo', 3 from d_info returning id),
-- d_besoins
m8  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_besoins.id, 'Recenser les besoins particuliers des invités',      'todo', 1 from d_besoins returning id),
m9  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_besoins.id, 'Prévoir les solutions d''accueil adaptées',           'todo', 2 from d_besoins returning id),
-- d_prep
m10 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_prep.id, 'Définir le dispositif d''accueil de chaque séquence',   'todo', 1 from d_prep returning id),
m11 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_prep.id, 'Préparer les supports d''accueil',                      'todo', 2 from d_prep returning id),
m12 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_prep.id, 'Briefer les équipes d''accueil',                        'todo', 3 from d_prep returning id),
-- d_accueil
m13 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_accueil.id, 'Accueillir et orienter les invités',                 'todo', 1 from d_accueil returning id),
m14 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_accueil.id, 'Gérer les retardataires et arrivées particulières',  'todo', 2 from d_accueil returning id),
m15 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_accueil.id, 'Accompagner les invités entre les espaces',           'todo', 3 from d_accueil returning id),
-- d_placement
m16 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_placement.id, 'Préparer le placement des invités lorsque nécessaire', 'todo', 1 from d_placement returning id),
m17 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_placement.id, 'Installer les invités pour les cérémonies',            'todo', 2 from d_placement returning id),
m18 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_placement.id, 'Installer les invités pour la réception',              'todo', 3 from d_placement returning id),
-- d_enfants
m19 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_enfants.id, 'Préparer l''accueil des enfants',                    'todo', 1 from d_enfants returning id),
m20 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_enfants.id, 'Faciliter l''accueil des familles avec enfants',     'todo', 2 from d_enfants returning id),
-- d_departs
m21 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_departs.id, 'Organiser les départs des invités',                  'todo', 1 from d_departs returning id),
m22 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_departs.id, 'Gérer les effets et objets oubliés des invités',     'todo', 2 from d_departs returning id),
m23 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_departs.id, 'Mettre à jour les présences réelles après le mariage', 'todo', 3 from d_departs returning id),

-- ──────────────────────────── Checklists ────────────────────────────
cl1  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m1.id,  'TODO' from m1  returning id),
cl2  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m2.id,  'TODO' from m2  returning id),
cl3  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m3.id,  'TODO' from m3  returning id),
cl4  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m4.id,  'TODO' from m4  returning id),
cl5  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m5.id,  'TODO' from m5  returning id),
cl6  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m6.id,  'TODO' from m6  returning id),
cl7  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m7.id,  'TODO' from m7  returning id),
cl8  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m8.id,  'TODO' from m8  returning id),
cl9  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m9.id,  'TODO' from m9  returning id),
cl10 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m10.id, 'TODO' from m10 returning id),
cl11 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m11.id, 'TODO' from m11 returning id),
cl12 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m12.id, 'TODO' from m12 returning id),
cl13 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m13.id, 'TODO' from m13 returning id),
cl14 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m14.id, 'TODO' from m14 returning id),
cl15 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m15.id, 'TODO' from m15 returning id),
cl16 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m16.id, 'TODO' from m16 returning id),
cl17 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m17.id, 'TODO' from m17 returning id),
cl18 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m18.id, 'TODO' from m18 returning id),
cl19 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m19.id, 'TODO' from m19 returning id),
cl20 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m20.id, 'TODO' from m20 returning id),
cl21 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m21.id, 'TODO' from m21 returning id),
cl22 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m22.id, 'TODO' from m22 returning id),
cl23 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m23.id, 'TODO' from m23 returning id),

-- ──────────────────────────── Items ────────────────────────────
-- m1 — Consolider la liste générale des invités
i1 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl1.id, v.lbl, 'todo', v.prio, false, v.n
  from cl1 cross join (values
    (0, 'Vérifier que chaque invité ou foyer figure dans la base invités.',                          'normal'),
    (1, 'Vérifier les noms, prénoms et informations de contact disponibles.',                        'normal'),
    (2, 'Identifier les couples, familles et accompagnants.',                                        'normal'),
    (3, 'Identifier les enfants et leur âge lorsque cette information est utile.',                   'normal'),
    (4, 'Identifier les doublons ou fiches incomplètes.',                                            'normal'),
    (5, 'Mettre à jour les informations après chaque changement.',                                   'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m2 — Affecter les invités aux différentes séquences
i2 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl2.id, v.lbl, 'todo', v.prio, false, v.n
  from cl2 cross join (values
    (0, 'Déterminer les séquences auxquelles chaque invité est convié.',                                       'high'),
    (1, 'Vérifier la cohérence des invitations au sein des couples et familles.',                              'high'),
    (2, 'Identifier les invités concernés uniquement par certaines journées.',                                  'high'),
    (3, 'Vérifier les effectifs prévisionnels de chaque séquence.',                                            'high'),
    (4, 'Mettre à jour les affectations après chaque changement d''invitation.',                               'high'),
    (5, 'Contrôler qu''aucun invité ne reste sans affectation lorsqu''une invitation est prévue.',             'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m3 — Suivre les réponses et présences par séquence
i3 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl3.id, v.lbl, 'todo', v.prio, false, v.n
  from cl3 cross join (values
    (0, 'Suivre les réponses des invités pour chaque séquence concernée.',                           'high'),
    (1, 'Relancer les invités n''ayant pas répondu dans les délais prévus.',                         'high'),
    (2, 'Enregistrer les refus et présences confirmées.',                                            'high'),
    (3, 'Enregistrer les changements de dernière minute.',                                           'high'),
    (4, 'Calculer les effectifs confirmés par séquence.',                                            'high'),
    (5, 'Communiquer les effectifs utiles aux pôles et prestataires concernés.',                     'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m4 — Figer les effectifs opérationnels
i4 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl4.id, v.lbl, 'todo', v.prio, false, v.n
  from cl4 cross join (values
    (0, 'Définir une date de clôture des réponses pour chaque besoin prestataire.',          'high'),
    (1, 'Produire les effectifs adultes et enfants nécessaires.',                            'high'),
    (2, 'Identifier les invités dont la présence reste incertaine.',                         'high'),
    (3, 'Transmettre les effectifs définitifs aux personnes concernées.',                    'high'),
    (4, 'Tracer les changements intervenant après la date de clôture.',                      'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m5 — Préparer les informations pratiques par séquence
i5 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl5.id, v.lbl, 'todo', v.prio, false, v.n
  from cl5 cross join (values
    (0, 'Définir les informations à communiquer pour chaque séquence.',                                          'normal'),
    (1, 'Vérifier les adresses et points d''accès.',                                                             'normal'),
    (2, 'Préciser les horaires utiles et heures d''arrivée recommandées.',                                       'normal'),
    (3, 'Préciser les éventuelles consignes de tenue.',                                                          'normal'),
    (4, 'Préciser les contraintes de stationnement ou de transport connues.',                                    'normal'),
    (5, 'Préciser les informations particulières utiles aux familles avec enfants.',                             'normal'),
    (6, 'Vérifier que les informations communiquées sont cohérentes entre tous les supports.',                   'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m6 — Envoyer les informations pratiques aux invités
i6 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl6.id, v.lbl, 'todo', v.prio, false, v.n
  from cl6 cross join (values
    (0, 'Identifier les destinataires de chaque communication selon leurs séquences.',                                           'normal'),
    (1, 'Envoyer les informations suffisamment en amont.',                                                                       'normal'),
    (2, 'Éviter d''envoyer aux invités des informations concernant une séquence à laquelle ils ne sont pas conviés.',           'normal'),
    (3, 'Prévoir un rappel à l''approche de l''événement lorsque nécessaire.',                                                  'normal'),
    (4, 'Centraliser les questions reçues après l''envoi.',                                                                     'normal'),
    (5, 'Mettre à jour les invités en cas de changement important.',                                                            'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m7 — Préparer une communication de dernière minute
i7 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl7.id, v.lbl, 'todo', v.prio, false, v.n
  from cl7 cross join (values
    (0, 'Définir le canal utilisé pour les informations urgentes.',                                                                            'high'),
    (1, 'Préparer la liste des contacts concernés par chaque séquence.',                                                                       'high'),
    (2, 'Identifier les personnes autorisées à envoyer une information collective.',                                                           'high'),
    (3, 'Prévoir les messages types pour changement d''horaire, accès ou consigne.',                                                           'high'),
    (4, 'Vérifier que Sarah et Jordan n''ont pas à gérer directement les demandes courantes le jour de l''événement.',                        'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m8 — Recenser les besoins particuliers des invités
i8 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl8.id, v.lbl, 'todo', v.prio, false, v.n
  from cl8 cross join (values
    (0, 'Identifier les personnes à mobilité réduite ou ayant des difficultés de déplacement connues.',          'normal'),
    (1, 'Identifier les personnes âgées nécessitant une attention particulière.',                                'normal'),
    (2, 'Identifier les besoins pratiques signalés par les familles avec jeunes enfants.',                       'normal'),
    (3, 'Recenser les contraintes alimentaires communiquées lorsqu''elles doivent être transmises.',             'normal'),
    (4, 'Identifier les situations nécessitant une place, un accès ou un accompagnement particulier.',           'normal'),
    (5, 'Limiter la diffusion de ces informations aux personnes qui en ont réellement besoin.',                  'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m9 — Prévoir les solutions d'accueil adaptées
i9 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl9.id, v.lbl, 'todo', v.prio, false, v.n
  from cl9 cross join (values
    (0, 'Vérifier les accès pour les personnes ayant des difficultés de déplacement.',                  'normal'),
    (1, 'Prévoir les places ou zones adaptées lorsque nécessaire.',                                     'normal'),
    (2, 'Identifier une personne pouvant accompagner un invité ayant besoin d''aide.',                  'normal'),
    (3, 'Vérifier les possibilités d''assise pendant les attentes importantes.',                        'normal'),
    (4, 'Transmettre aux responsables d''accueil uniquement les consignes nécessaires.',                'normal'),
    (5, 'Vérifier les solutions prévues avant chaque séquence concernée.',                              'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m10 — Définir le dispositif d'accueil
i10 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl10.id, v.lbl, 'todo', v.prio, false, v.n
  from cl10 cross join (values
    (0, 'Déterminer si un accueil formel est nécessaire pour la séquence.',                               'high'),
    (1, 'Définir le nombre de personnes nécessaires à l''accueil.',                                       'high'),
    (2, 'Désigner les responsables et équipiers d''accueil.',                                             'high'),
    (3, 'Définir leur emplacement et leur horaire de prise de poste.',                                    'high'),
    (4, 'Définir les informations qu''ils doivent connaître.',                                            'high'),
    (5, 'Prévoir la procédure pour les situations inhabituelles ou les questions non résolues.',          'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m11 — Préparer les supports d'accueil
i11 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl11.id, v.lbl, 'todo', v.prio, false, v.n
  from cl11 cross join (values
    (0, 'Préparer les listes d''invités nécessaires aux équipes d''accueil.',            'normal'),
    (1, 'Préparer les éventuels plans ou listes de placement.',                          'normal'),
    (2, 'Préparer les informations pratiques utiles aux équipes.',                       'normal'),
    (3, 'Préparer la signalétique relevant de l''accueil.',                              'normal'),
    (4, 'Prévoir les éléments remis aux invités à leur arrivée lorsque nécessaire.',     'normal'),
    (5, 'Vérifier que les supports sont à jour avant impression ou diffusion.',          'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m12 — Briefer les équipes d'accueil
i12 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl12.id, v.lbl, 'todo', v.prio, false, v.n
  from cl12 cross join (values
    (0, 'Présenter le déroulement de la séquence.',                                                             'high'),
    (1, 'Présenter les différents accès et espaces utiles.',                                                    'high'),
    (2, 'Expliquer la manière d''orienter les invités.',                                                        'high'),
    (3, 'Signaler les personnes nécessitant une prise en charge particulière lorsque nécessaire.',              'high'),
    (4, 'Expliquer la procédure pour les retardataires.',                                                       'high'),
    (5, 'Expliquer à qui remonter une question ou un problème.',                                                'high'),
    (6, 'Partager les coordonnées des responsables utiles.',                                                    'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m13 — Accueillir et orienter les invités
i13 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl13.id, v.lbl, 'todo', v.prio, false, v.n
  from cl13 cross join (values
    (0, 'Être en position avant l''arrivée prévue des premiers invités.',                         'high'),
    (1, 'Accueillir les invités et répondre aux premières questions.',                            'high'),
    (2, 'Orienter les invités vers le bon espace.',                                               'high'),
    (3, 'Indiquer les sanitaires, vestiaires ou services utiles lorsque nécessaire.',             'high'),
    (4, 'Fluidifier les arrivées afin d''éviter les regroupements gênants.',                      'high'),
    (5, 'Signaler au responsable les difficultés rencontrées.',                                   'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m14 — Gérer les retardataires
i14 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl14.id, v.lbl, 'todo', v.prio, false, v.n
  from cl14 cross join (values
    (0, 'Identifier le point d''accueil des retardataires.',                                                          'normal'),
    (1, 'Éviter de perturber une cérémonie ou un moment en cours.',                                                   'normal'),
    (2, 'Orienter discrètement les personnes arrivant après le début.',                                               'normal'),
    (3, 'Prévenir le responsable concerné lorsqu''une arrivée nécessite une action particulière.',                    'normal'),
    (4, 'Mettre à jour l''information de présence si nécessaire.',                                                    'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m15 — Accompagner les invités entre les espaces
i15 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl15.id, v.lbl, 'todo', v.prio, false, v.n
  from cl15 cross join (values
    (0, 'Anticiper les moments où un déplacement collectif est nécessaire.',           'normal'),
    (1, 'Donner des consignes simples et visibles.',                                   'normal'),
    (2, 'Orienter les premiers invités afin d''entraîner le mouvement.',               'normal'),
    (3, 'Prévoir une aide pour les personnes ayant besoin de plus de temps.',          'normal'),
    (4, 'Vérifier que les espaces précédents se vident correctement.',                 'normal'),
    (5, 'Informer le coordinateur lorsque le déplacement est terminé.',                'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m16 — Préparer le placement
i16 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl16.id, v.lbl, 'todo', v.prio, false, v.n
  from cl16 cross join (values
    (0, 'Identifier les séquences nécessitant un placement organisé.',                                    'high'),
    (1, 'Finaliser les groupes, tables ou zones de placement.',                                           'high'),
    (2, 'Vérifier les contraintes particulières de placement.',                                           'high'),
    (3, 'Vérifier la cohérence entre le plan de placement et les effectifs confirmés.',                   'high'),
    (4, 'Préparer les supports nécessaires au placement.',                                                'high'),
    (5, 'Prévoir la gestion des changements de dernière minute.',                                         'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m17 — Installer les invités pour les cérémonies
i17 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl17.id, v.lbl, 'todo', v.prio, false, v.n
  from cl17 cross join (values
    (0, 'Faire entrer les invités suffisamment tôt.',                                                           'high'),
    (1, 'Orienter les invités vers les places ou zones prévues.',                                               'high'),
    (2, 'Préserver les places réservées lorsque nécessaire.',                                                   'high'),
    (3, 'Installer en priorité les personnes nécessitant davantage de temps.',                                  'high'),
    (4, 'Maintenir les circulations nécessaires au cortège et aux intervenants.',                               'high'),
    (5, 'Confirmer que l''installation est suffisante avant le début de la cérémonie.',                        'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m18 — Installer les invités pour la réception
i18 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl18.id, v.lbl, 'todo', v.prio, false, v.n
  from cl18 cross join (values
    (0, 'Informer les invités lorsque le moment est venu de rejoindre leur table ou leur zone.',              'high'),
    (1, 'Orienter les invités vers le dispositif de placement.',                                              'high'),
    (2, 'Aider les personnes ayant des difficultés à trouver leur place.',                                    'high'),
    (3, 'Gérer les erreurs ou changements sans solliciter directement les mariés.',                           'high'),
    (4, 'Identifier rapidement les places restant vacantes ou les invités non placés.',                       'high'),
    (5, 'Informer le responsable lorsque l''installation est suffisamment avancée pour poursuivre le conducteur.', 'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m19 — Préparer l'accueil des enfants
i19 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl19.id, v.lbl, 'todo', v.prio, false, v.n
  from cl19 cross join (values
    (0, 'Consolider le nombre d''enfants attendus par séquence.',                                        'normal'),
    (1, 'Identifier les tranches d''âge utiles à l''organisation.',                                      'normal'),
    (2, 'Vérifier les besoins en chaises, repas ou équipements adaptés lorsque concernés.',              'normal'),
    (3, 'Identifier les espaces accessibles ou déconseillés aux enfants.',                               'normal'),
    (4, 'Préparer les informations nécessaires aux parents.',                                            'normal'),
    (5, 'Coordonner les éventuels prestataires ou personnes chargées des enfants.',                      'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m20 — Faciliter l'accueil des familles
i20 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl20.id, v.lbl, 'todo', v.prio, false, v.n
  from cl20 cross join (values
    (0, 'Orienter les familles vers les équipements ou espaces prévus.',                                            'normal'),
    (1, 'Répondre aux questions pratiques des parents.',                                                            'normal'),
    (2, 'Veiller à ce que les circulations restent adaptées aux poussettes lorsque possible.',                     'normal'),
    (3, 'Signaler rapidement toute difficulté concernant un équipement prévu pour les enfants.',                   'normal'),
    (4, 'Orienter les parents vers le responsable approprié en cas de besoin spécifique.',                         'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m21 — Organiser les départs
i21 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl21.id, v.lbl, 'todo', v.prio, false, v.n
  from cl21 cross join (values
    (0, 'Identifier les séquences nécessitant une gestion particulière des départs.',          'normal'),
    (1, 'Communiquer les informations de transport ou de sortie utiles.',                      'normal'),
    (2, 'Orienter les invités vers les sorties et zones de récupération.',                     'normal'),
    (3, 'Aider les personnes ayant besoin d''assistance pour leur départ.',                    'normal'),
    (4, 'Éviter que les départs perturbent les opérations de démontage.',                     'normal'),
    (5, 'Signaler les situations nécessitant l''intervention d''un responsable.',              'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m22 — Gérer les objets oubliés
i22 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl22.id, v.lbl, 'todo', v.prio, false, v.n
  from cl22 cross join (values
    (0, 'Centraliser les objets retrouvés après chaque séquence.',                                                    'normal'),
    (1, 'Identifier le lieu où les objets trouvés sont conservés.',                                                   'normal'),
    (2, 'Photographier ou décrire les objets lorsque nécessaire pour faciliter leur identification.',                 'normal'),
    (3, 'Identifier les propriétaires lorsque cela est possible.',                                                    'normal'),
    (4, 'Organiser la restitution des objets réclamés.',                                                              'normal'),
    (5, 'Clôturer les objets non réclamés après le délai décidé.',                                                   'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m23 — Mettre à jour les présences réelles
i23 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl23.id, v.lbl, 'todo', v.prio, false, v.n
  from cl23 cross join (values
    (0, 'Enregistrer les absences significatives ou présences non prévues lorsqu''elles sont utiles au bilan.',  'normal'),
    (1, 'Conserver les effectifs réels utiles pour vérifier les prestations facturées.',                         'normal'),
    (2, 'Signaler les écarts importants entre prévisionnel et réel.',                                            'normal'),
    (3, 'Archiver les informations de présence nécessaires au bilan de l''événement.',                           'normal')
  ) as v(n, lbl, prio)
  returning id
),

-- ──────────────────────────── Liens mission ↔ séquences ────────────────────────────
-- Toutes les 7 séquences (utilisé par m2-m14, m19-m20, m22-m23)
sq_all_7 as materialized (
  select id, name from _20270628_event_sequences
  where name in ('Mariage civil','Goûter d''honneur','Moment convivial entre amis','Pique-nique partagé','Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
),

-- m2 à m14 + m19/m20/m22/m23 : toutes les 7
sq_m2 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m2.id, sq_all_7.id from m2, sq_all_7 returning mission_id),
sq_m3 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m3.id, sq_all_7.id from m3, sq_all_7 returning mission_id),
sq_m4 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m4.id, sq_all_7.id from m4, sq_all_7 returning mission_id),
sq_m5 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m5.id, sq_all_7.id from m5, sq_all_7 returning mission_id),
sq_m6 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m6.id, sq_all_7.id from m6, sq_all_7 returning mission_id),
sq_m7 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m7.id, sq_all_7.id from m7, sq_all_7 returning mission_id),
sq_m8 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m8.id, sq_all_7.id from m8, sq_all_7 returning mission_id),
sq_m9 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m9.id, sq_all_7.id from m9, sq_all_7 returning mission_id),
sq_m10 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m10.id, sq_all_7.id from m10, sq_all_7 returning mission_id),
sq_m11 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m11.id, sq_all_7.id from m11, sq_all_7 returning mission_id),
sq_m12 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m12.id, sq_all_7.id from m12, sq_all_7 returning mission_id),
sq_m13 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m13.id, sq_all_7.id from m13, sq_all_7 returning mission_id),
sq_m14 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m14.id, sq_all_7.id from m14, sq_all_7 returning mission_id),
sq_m19 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m19.id, sq_all_7.id from m19, sq_all_7 returning mission_id),
sq_m20 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m20.id, sq_all_7.id from m20, sq_all_7 returning mission_id),
sq_m22 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m22.id, sq_all_7.id from m22, sq_all_7 returning mission_id),
sq_m23 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m23.id, sq_all_7.id from m23, sq_all_7 returning mission_id),

-- m15 — Goûter d'honneur | Moment convivial | Bénédiction au khane | Bénédiction à l'église | Célébration de mariage
sq_m15 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m15.id, s.id from m15, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
  returning mission_id
),
-- m16 — Bénédiction au khane | Bénédiction à l'église | Célébration de mariage
sq_m16 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m16.id, s.id from m16, _20270628_event_sequences s
  where s.name in ('Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
  returning mission_id
),
-- m17 — Mariage civil | Bénédiction au khane | Bénédiction à l'église
sq_m17 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m17.id, s.id from m17, _20270628_event_sequences s
  where s.name in ('Mariage civil','Bénédiction au khane','Bénédiction à l''église')
  returning mission_id
),
-- m18 — Célébration de mariage
sq_m18 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m18.id, s.id from m18, _20270628_event_sequences s
  where s.name = 'Célébration de mariage'
  returning mission_id
),
-- m21 — Goûter d'honneur | Moment convivial | Célébration de mariage
sq_m21 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m21.id, s.id from m21, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Célébration de mariage')
  returning mission_id
)

-- ──────────────────────────── Vérification ────────────────────────────
select
  (select count(*) from _20270628_domaines d join _20270628_poles p on p.id = d.pole_id where p.name = 'Invités & accueil') as domaines,
  (select count(*) from _20270628_missions m join _20270628_domaines d on d.id = m.domaine_id join _20270628_poles p on p.id = d.pole_id where p.name = 'Invités & accueil') as missions,
  (select count(*) from sq_m2) + (select count(*) from sq_m3) as seq_liens_spot;
