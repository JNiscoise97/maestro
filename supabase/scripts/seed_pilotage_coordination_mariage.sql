-- ============================================================
-- Seed : Pôle "Pilotage & coordination" — portail mariage
-- Remplace intégralement le pôle existant (delete + insert).
-- Lancer dans l'éditeur SQL Supabase (rôle service_role).
-- ============================================================

delete from _20270628_poles where name = 'Pilotage & coordination';

with

-- ──────────────────────────── Pôle ────────────────────────────
pole as materialized (
  insert into _20270628_poles (id, name, sort_order)
  values (gen_random_uuid(), 'Pilotage & coordination', 30)
  returning id
),

-- ──────────────────────────── Domaines ────────────────────────────
d_gouv as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Gouvernance & responsabilités', 'gouvernance-responsabilites', 1, 'avant'
  from pole returning id
),
d_planning as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Planning global & dépendances', 'planning-global-dependances', 2, 'avant'
  from pole returning id
),
d_conducteurs as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Conducteurs des séquences', 'conducteurs-sequences', 3, 'avant'
  from pole returning id
),
d_equipes as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Coordination des équipes', 'coordination-equipes', 4, null
  from pole returning id
),
d_presta as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Coordination prestataires & lieux', 'coordination-prestataires-lieux', 5, null
  from pole returning id
),
d_transi as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Transitions & déplacements', 'transitions-deplacements', 6, null
  from pole returning id
),
d_imprevus as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Imprévus & continuité', 'imprevus-continuite', 7, null
  from pole returning id
),
d_suivi as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Suivi temps réel', 'suivi-temps-reel', 8, 'jour_j'
  from pole returning id
),
d_cloture as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Clôture & passation', 'cloture-passation', 9, null
  from pole returning id
),

-- ──────────────────────────── Missions ────────────────────────────
-- d_gouv
m1  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_gouv.id, 'Définir l''organisation opérationnelle du mariage',  'todo', 1 from d_gouv returning id),
m2  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_gouv.id, 'Désigner les responsables par séquence',              'todo', 2 from d_gouv returning id),
m3  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_gouv.id, 'Définir la chaîne de décision et d''escalade',        'todo', 3 from d_gouv returning id),
-- d_planning
m4  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_planning.id, 'Construire le planning opérationnel des quatre jours',  'todo', 1 from d_planning returning id),
m5  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_planning.id, 'Identifier les dépendances critiques entre les séquences', 'todo', 2 from d_planning returning id),
m6  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_planning.id, 'Définir les marges de sécurité du planning',           'todo', 3 from d_planning returning id),
-- d_conducteurs
m7  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_conducteurs.id, 'Construire le conducteur de chaque séquence',                'todo', 1 from d_conducteurs returning id),
m8  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_conducteurs.id, 'Valider les conducteurs avec les personnes concernées',       'todo', 2 from d_conducteurs returning id),
m9  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_conducteurs.id, 'Préparer les versions opérationnelles des conducteurs',       'todo', 3 from d_conducteurs returning id),
-- d_equipes
m10 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_equipes.id, 'Préparer les briefings des équipes',                   'todo', 1 from d_equipes returning id),
m11 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_equipes.id, 'Effectuer le briefing avant chaque séquence',          'todo', 2 from d_equipes returning id),
m12 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_equipes.id, 'Coordonner les responsables pendant les séquences',   'todo', 3 from d_equipes returning id),
-- d_presta
m13 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_presta.id, 'Centraliser les contacts opérationnels des prestataires et lieux', 'todo', 1 from d_presta returning id),
m14 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_presta.id, 'Confirmer les modalités opérationnelles avec les prestataires',    'todo', 2 from d_presta returning id),
m15 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_presta.id, 'Suivre les prestataires pendant les séquences',                    'todo', 3 from d_presta returning id),
-- d_transi
m16 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_transi.id, 'Préparer les transitions entre les séquences',                    'todo', 1 from d_transi returning id),
m17 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_transi.id, 'Piloter les départs des mariés et personnes clés',               'todo', 2 from d_transi returning id),
m18 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_transi.id, 'Coordonner la transition entre l''église et le Domaine Ostara',  'todo', 3 from d_transi returning id),
-- d_imprevus
m19 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_imprevus.id, 'Préparer le dispositif de gestion des imprévus',  'todo', 1 from d_imprevus returning id),
m20 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_imprevus.id, 'Préparer les plans de repli nécessaires',           'todo', 2 from d_imprevus returning id),
m21 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_imprevus.id, 'Gérer les incidents opérationnels',                 'todo', 3 from d_imprevus returning id),
-- d_suivi
m22 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_suivi.id, 'Suivre l''avancement du conducteur',                              'todo', 1 from d_suivi returning id),
m23 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_suivi.id, 'Donner les tops opérationnels',                                   'todo', 2 from d_suivi returning id),
m24 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_suivi.id, 'Protéger le temps et la disponibilité des mariés',               'todo', 3 from d_suivi returning id),
-- d_cloture
m25 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_cloture.id, 'Clôturer chaque séquence',                           'todo', 1 from d_cloture returning id),
m26 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_cloture.id, 'Faire la passation vers la séquence suivante',       'todo', 2 from d_cloture returning id),
m27 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_cloture.id, 'Réaliser le bilan opérationnel du mariage',          'todo', 3 from d_cloture returning id),

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
cl24 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m24.id, 'TODO' from m24 returning id),
cl25 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m25.id, 'TODO' from m25 returning id),
cl26 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m26.id, 'TODO' from m26 returning id),
cl27 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m27.id, 'TODO' from m27 returning id),

-- ──────────────────────────── Items ────────────────────────────
-- m1 — Définir l'organisation opérationnelle
i1 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl1.id, v.lbl, 'todo', v.prio, false, v.n
  from cl1 cross join (values
    (0, 'Définir les rôles de coordination nécessaires pour les quatre jours.',                                       'high'),
    (1, 'Identifier les personnes pouvant prendre des décisions opérationnelles en l''absence des mariés.',           'high'),
    (2, 'Définir les responsabilités principales de chaque coordinateur ou référent.',                                'high'),
    (3, 'Éviter les chevauchements ou zones sans responsable.',                                                       'high'),
    (4, 'Définir les sujets qui nécessitent obligatoirement l''accord de Sarah ou Jordan.',                          'high'),
    (5, 'Définir les sujets pouvant être arbitrés sans solliciter les mariés.',                                       'high'),
    (6, 'Formaliser et partager l''organisation retenue.',                                                            'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m2 — Désigner les responsables par séquence
i2 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl2.id, v.lbl, 'todo', v.prio, false, v.n
  from cl2 cross join (values
    (0, 'Désigner un référent principal pour chaque séquence.',                                                         'high'),
    (1, 'Identifier un relais lorsque le référent principal est indisponible.',                                         'high'),
    (2, 'Vérifier que les responsables connaissent suffisamment la séquence concernée.',                                'high'),
    (3, 'Communiquer les coordonnées utiles aux responsables.',                                                         'high'),
    (4, 'Vérifier que Sarah et Jordan ne sont pas les seuls détenteurs d''informations critiques.',                    'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m3 — Définir la chaîne de décision
i3 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl3.id, v.lbl, 'todo', v.prio, false, v.n
  from cl3 cross join (values
    (0, 'Définir qui tranche les problèmes logistiques courants.',                                   'high'),
    (1, 'Définir qui tranche les questions concernant les invités.',                                 'high'),
    (2, 'Définir qui contacte les prestataires en cas de problème.',                                 'high'),
    (3, 'Définir dans quels cas Sarah ou Jordan doivent être sollicités.',                           'high'),
    (4, 'Définir la personne à contacter si le coordinateur principal est indisponible.',            'high'),
    (5, 'Partager cette chaîne de décision aux responsables concernés.',                             'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m4 — Construire le planning opérationnel
i4 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl4.id, v.lbl, 'todo', v.prio, false, v.n
  from cl4 cross join (values
    (0, 'Centraliser les horaires connus de toutes les séquences.',                               'high'),
    (1, 'Ajouter les horaires d''installation et de préparation nécessaires.',                    'high'),
    (2, 'Ajouter les horaires de départ et de déplacement des mariés.',                           'high'),
    (3, 'Ajouter les horaires d''arrivée des prestataires importants.',                           'high'),
    (4, 'Identifier les temps incompressibles entre deux engagements.',                           'high'),
    (5, 'Vérifier la cohérence du planning global du vendredi au lundi.',                         'high'),
    (6, 'Mettre à jour le planning à chaque modification importante.',                            'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m5 — Identifier les dépendances critiques
i5 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl5.id, v.lbl, 'todo', v.prio, false, v.n
  from cl5 cross join (values
    (0, 'Identifier les tâches devant être terminées avant le début d''une autre activité.',  'high'),
    (1, 'Identifier les personnes nécessaires à plusieurs endroits ou séquences.',             'high'),
    (2, 'Identifier le matériel utilisé successivement dans plusieurs séquences.',             'high'),
    (3, 'Identifier les déplacements présentant peu de marge.',                                'high'),
    (4, 'Identifier les prestations dépendant d''un horaire précédent.',                      'high'),
    (5, 'Prévoir une solution pour chaque dépendance critique identifiée.',                    'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m6 — Définir les marges de sécurité
i6 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl6.id, v.lbl, 'todo', v.prio, false, v.n
  from cl6 cross join (values
    (0, 'Identifier les moments où un retard aurait un impact important.',                               'high'),
    (1, 'Ajouter des marges réalistes pour les déplacements.',                                          'high'),
    (2, 'Prévoir une marge pour les préparatifs des mariés.',                                            'high'),
    (3, 'Prévoir une marge pour les installations critiques.',                                           'high'),
    (4, 'Prévoir une marge avant les cérémonies.',                                                       'high'),
    (5, 'Déterminer les étapes pouvant être raccourcies ou décalées en cas de retard.',                  'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m7 — Construire le conducteur de chaque séquence
i7 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl7.id, v.lbl, 'todo', v.prio, false, v.n
  from cl7 cross join (values
    (0, 'Lister les étapes constituant chaque séquence.',                             'high'),
    (1, 'Définir l''ordre exact des étapes.',                                         'high'),
    (2, 'Définir les heures de début prévues lorsque nécessaire.',                    'high'),
    (3, 'Définir les durées ou heures de fin lorsque nécessaire.',                    'high'),
    (4, 'Identifier le responsable de chaque étape importante.',                      'high'),
    (5, 'Identifier les intervenants et prestataires concernés.',                     'high'),
    (6, 'Vérifier les transitions entre les différentes étapes.',                     'high'),
    (7, 'Enregistrer les étapes validées dans le conducteur.',                        'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m8 — Valider les conducteurs
i8 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl8.id, v.lbl, 'todo', v.prio, false, v.n
  from cl8 cross join (values
    (0, 'Faire relire chaque conducteur par le référent de la séquence.',                                  'high'),
    (1, 'Valider les horaires impliquant un prestataire avec celui-ci.',                                   'high'),
    (2, 'Vérifier la compatibilité avec les contraintes des lieux.',                                       'high'),
    (3, 'Vérifier la compatibilité avec les déplacements des mariés et du cortège.',                       'high'),
    (4, 'Corriger les incohérences identifiées.',                                                          'high'),
    (5, 'Figer une version opérationnelle avant le mariage.',                                              'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m9 — Préparer les versions opérationnelles (priorité Normale)
i9 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl9.id, v.lbl, 'todo', v.prio, false, v.n
  from cl9 cross join (values
    (0, 'Produire une version claire du conducteur pour chaque séquence.',                                                                   'normal'),
    (1, 'Limiter chaque version aux informations utiles à ses destinataires.',                                                               'normal'),
    (2, 'Mettre en évidence les horaires critiques.',                                                                                        'normal'),
    (3, 'Faire apparaître les responsables et contacts utiles.',                                                                             'normal'),
    (4, 'Prévoir une version accessible sur téléphone.',                                                                                     'normal'),
    (5, 'Prévoir une solution de consultation hors connexion ou imprimée pour les responsables principaux.',                                 'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m10 — Préparer les briefings des équipes
i10 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl10.id, v.lbl, 'todo', v.prio, false, v.n
  from cl10 cross join (values
    (0, 'Identifier les personnes à briefer pour chaque séquence.',                                  'high'),
    (1, 'Préparer les informations utiles à leur rôle.',                                             'high'),
    (2, 'Présenter les horaires de présence attendus.',                                              'high'),
    (3, 'Présenter les responsabilités de chacun.',                                                  'high'),
    (4, 'Présenter les contacts et la chaîne d''escalade.',                                         'high'),
    (5, 'Présenter les principaux risques ou points de vigilance.',                                  'high'),
    (6, 'Prévoir un moyen de confirmer que chacun a reçu les informations.',                         'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m11 — Effectuer le briefing avant chaque séquence
i11 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl11.id, v.lbl, 'todo', v.prio, false, v.n
  from cl11 cross join (values
    (0, 'Vérifier la présence des responsables attendus.',                              'high'),
    (1, 'Rappeler le déroulement et les horaires clés.',                                'high'),
    (2, 'Rappeler les responsabilités individuelles.',                                  'high'),
    (3, 'Signaler les modifications de dernière minute.',                               'high'),
    (4, 'Rappeler la chaîne de décision en cas de problème.',                           'high'),
    (5, 'Répondre aux dernières questions opérationnelles.',                            'high'),
    (6, 'Confirmer que les postes critiques sont couverts.',                            'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m12 — Coordonner les responsables pendant les séquences
i12 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl12.id, v.lbl, 'todo', v.prio, false, v.n
  from cl12 cross join (values
    (0, 'Maintenir le contact avec les référents de pôles nécessaires.',                                          'high'),
    (1, 'Centraliser les informations ayant un impact sur le déroulement.',                                       'high'),
    (2, 'Réaffecter des ressources lorsqu''un besoin prioritaire apparaît.',                                     'high'),
    (3, 'Éviter que plusieurs personnes donnent des consignes contradictoires.',                                  'high'),
    (4, 'S''assurer que les décisions importantes sont transmises aux personnes concernées.',                    'high'),
    (5, 'Limiter les sollicitations directes de Sarah et Jordan.',                                                'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m13 — Centraliser les contacts opérationnels (priorité Normale)
i13 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl13.id, v.lbl, 'todo', v.prio, false, v.n
  from cl13 cross join (values
    (0, 'Identifier le contact opérationnel de chaque prestataire.',                              'normal'),
    (1, 'Identifier le contact opérationnel de chaque lieu.',                                    'normal'),
    (2, 'Vérifier les numéros de téléphone utiles.',                                             'normal'),
    (3, 'Associer chaque prestataire aux séquences concernées.',                                  'normal'),
    (4, 'Identifier le membre de l''équipe chargé de chaque relation prestataire.',              'normal'),
    (5, 'Rendre cette liste accessible aux coordinateurs concernés.',                             'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m14 — Confirmer les modalités opérationnelles
i14 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl14.id, v.lbl, 'todo', v.prio, false, v.n
  from cl14 cross join (values
    (0, 'Confirmer les dates et horaires d''intervention.',                                          'high'),
    (1, 'Confirmer les horaires d''arrivée et d''installation.',                                    'high'),
    (2, 'Confirmer les besoins d''accès, stationnement ou déchargement.',                           'high'),
    (3, 'Confirmer les besoins techniques importants.',                                             'high'),
    (4, 'Confirmer les horaires de départ ou de retrait lorsque nécessaire.',                       'high'),
    (5, 'Vérifier que chaque prestataire dispose du bon contact le jour concerné.',                 'high'),
    (6, 'Consigner les dernières modifications convenues.',                                         'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m15 — Suivre les prestataires pendant les séquences
i15 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl15.id, v.lbl, 'todo', v.prio, false, v.n
  from cl15 cross join (values
    (0, 'Vérifier l''arrivée des prestataires critiques.',                                           'high'),
    (1, 'Identifier rapidement les retards ou absences.',                                            'high'),
    (2, 'Orienter les prestataires vers leur interlocuteur ou zone d''intervention.',               'high'),
    (3, 'S''assurer que les modifications importantes sont comprises.',                             'high'),
    (4, 'Arbitrer ou escalader les problèmes ayant un impact sur le conducteur.',                    'high'),
    (5, 'Confirmer la fin des interventions nécessitant un suivi.',                                  'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m16 — Préparer les transitions
i16 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl16.id, v.lbl, 'todo', v.prio, false, v.n
  from cl16 cross join (values
    (0, 'Lister les transitions nécessitant un déplacement ou une réorganisation.',              'high'),
    (1, 'Définir l''heure cible de départ pour chaque transition.',                             'high'),
    (2, 'Identifier les personnes devant partir en priorité.',                                   'high'),
    (3, 'Identifier le matériel ou les effets devant accompagner le déplacement.',               'high'),
    (4, 'Prévoir les véhicules ou moyens de transport nécessaires.',                             'high'),
    (5, 'Définir qui confirme que le groupe peut partir.',                                        'high'),
    (6, 'Prévoir une solution en cas de retard.',                                                 'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m17 — Piloter les départs des mariés
i17 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl17.id, v.lbl, 'todo', v.prio, false, v.n
  from cl17 cross join (values
    (0, 'Prévenir Sarah et Jordan suffisamment tôt avant un départ.',                       'high'),
    (1, 'Vérifier que les effets nécessaires sont prêts.',                                   'high'),
    (2, 'Vérifier que les personnes devant les accompagner sont présentes.',                 'high'),
    (3, 'Confirmer la disponibilité du véhicule ou chauffeur prévu.',                        'high'),
    (4, 'Donner le signal de départ au moment approprié.',                                   'high'),
    (5, 'Informer la séquence suivante du départ ou du retard éventuel.',                    'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m18 — Coordonner la transition église → Domaine Ostara
i18 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl18.id, v.lbl, 'todo', v.prio, false, v.n
  from cl18 cross join (values
    (0, 'Suivre l''heure réelle de fin de la bénédiction à l''église.',                                              'high'),
    (1, 'Coordonner la sortie, les éventuelles photos et le départ des mariés.',                                     'high'),
    (2, 'Vérifier que le chauffeur est prêt au moment prévu.',                                                       'high'),
    (3, 'Informer le référent du Domaine Ostara de l''heure réelle de départ.',                                     'high'),
    (4, 'Adapter si nécessaire l''accueil ou le conducteur de la réception.',                                       'high'),
    (5, 'Éviter que Sarah et Jordan aient à gérer les ajustements de planning pendant le trajet.',                   'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m19 — Préparer le dispositif de gestion des imprévus
i19 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl19.id, v.lbl, 'todo', v.prio, false, v.n
  from cl19 cross join (values
    (0, 'Identifier les principaux risques opérationnels de chaque journée.',                         'high'),
    (1, 'Définir une réponse simple pour les risques les plus probables.',                            'high'),
    (2, 'Identifier les solutions de repli nécessaires.',                                             'high'),
    (3, 'Préparer les contacts d''urgence utiles.',                                                  'high'),
    (4, 'Identifier les personnes habilitées à engager une dépense imprévue si nécessaire.',         'high'),
    (5, 'Définir comment tracer une décision ayant un impact important.',                             'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m20 — Préparer les plans de repli
i20 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl20.id, v.lbl, 'todo', v.prio, false, v.n
  from cl20 cross join (values
    (0, 'Identifier les activités dépendantes de la météo.',                                                         'high'),
    (1, 'Identifier les solutions de repli liées aux espaces ou équipements.',                                       'high'),
    (2, 'Prévoir une solution en cas de retard important d''un prestataire critique.',                               'high'),
    (3, 'Prévoir une solution en cas d''absence d''un responsable clé.',                                            'high'),
    (4, 'Prévoir une solution en cas de problème de transport.',                                                     'high'),
    (5, 'Communiquer les plans de repli uniquement aux personnes qui doivent les connaître.',                        'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m21 — Gérer les incidents opérationnels
i21 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl21.id, v.lbl, 'todo', v.prio, false, v.n
  from cl21 cross join (values
    (0, 'Recueillir les faits avant de décider.',                                                                                 'high'),
    (1, 'Évaluer l''impact sur les invités, les mariés et le conducteur.',                                                       'high'),
    (2, 'Mobiliser le responsable du domaine concerné.',                                                                         'high'),
    (3, 'Choisir la solution la moins perturbatrice possible.',                                                                   'high'),
    (4, 'Informer uniquement les personnes qui doivent agir ou s''adapter.',                                                     'high'),
    (5, 'Escalader vers Sarah ou Jordan uniquement lorsque leur décision est réellement nécessaire.',                            'high'),
    (6, 'Vérifier que l''incident est résolu ou stabilisé.',                                                                     'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m22 — Suivre l'avancement du conducteur
i22 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl22.id, v.lbl, 'todo', v.prio, false, v.n
  from cl22 cross join (values
    (0, 'Comparer régulièrement l''heure réelle à l''heure prévue.',                     'high'),
    (1, 'Identifier rapidement les avances ou retards significatifs.',                   'high'),
    (2, 'Prévenir les responsables des étapes suivantes.',                               'high'),
    (3, 'Décider des ajustements autorisés lorsque nécessaire.',                         'high'),
    (4, 'Mettre à jour les personnes impactées par un changement.',                      'high'),
    (5, 'Préserver en priorité les étapes considérées comme essentielles.',              'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m23 — Donner les tops opérationnels
i23 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl23.id, v.lbl, 'todo', v.prio, false, v.n
  from cl23 cross join (values
    (0, 'Vérifier que les personnes nécessaires sont prêtes.',                                                    'high'),
    (1, 'Vérifier que l''espace ou le matériel nécessaire est prêt.',                                            'high'),
    (2, 'Confirmer avec les responsables concernés avant de lancer une étape critique.',                          'high'),
    (3, 'Donner un signal clair au moment convenu.',                                                              'high'),
    (4, 'Vérifier que l''étape a effectivement démarré.',                                                        'high'),
    (5, 'Préparer immédiatement l''étape suivante.',                                                             'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m24 — Protéger le temps et la disponibilité des mariés
i24 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl24.id, v.lbl, 'todo', v.prio, false, v.n
  from cl24 cross join (values
    (0, 'Filtrer les questions opérationnelles adressées à Sarah et Jordan.',                                                              'high'),
    (1, 'Regrouper les sujets non urgents pour éviter les sollicitations répétées.',                                                       'high'),
    (2, 'Faire traiter les problèmes par les responsables désignés lorsque possible.',                                                     'high'),
    (3, 'Prévenir les mariés suffisamment tôt avant leurs interventions ou déplacements.',                                                 'high'),
    (4, 'Préserver leurs temps de préparation, de pause et de repas.',                                                                    'high'),
    (5, 'Ne les solliciter immédiatement que lorsqu''une décision ne peut réellement pas être déléguée.',                                 'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m25 — Clôturer chaque séquence
i25 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl25.id, v.lbl, 'todo', v.prio, false, v.n
  from cl25 cross join (values
    (0, 'Confirmer que les principales opérations de fin sont prises en charge.',                         'high'),
    (1, 'Vérifier que les invités ont reçu les informations nécessaires pour la suite.',                  'high'),
    (2, 'Vérifier que le matériel critique est sécurisé ou transféré.',                                   'high'),
    (3, 'Vérifier que les prestataires ayant terminé peuvent quitter les lieux.',                         'high'),
    (4, 'Recenser les incidents ou actions restant ouvertes.',                                            'high'),
    (5, 'Transmettre les informations nécessaires à la séquence suivante.',                               'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m26 — Faire la passation vers la séquence suivante
i26 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl26.id, v.lbl, 'todo', v.prio, false, v.n
  from cl26 cross join (values
    (0, 'Partager l''heure réelle de fin de la séquence précédente.',                                            'high'),
    (1, 'Signaler les retards susceptibles d''affecter la suite.',                                               'high'),
    (2, 'Signaler les changements de personnes, matériel ou transport.',                                         'high'),
    (3, 'Confirmer que les éléments indispensables ont bien été transférés.',                                    'high'),
    (4, 'Confirmer que le responsable de la séquence suivante dispose des informations utiles.',                 'high'),
    (5, 'Clôturer les sujets ne nécessitant plus de suivi.',                                                    'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m27 — Réaliser le bilan opérationnel (priorité Normale)
i27 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl27.id, v.lbl, 'todo', v.prio, false, v.n
  from cl27 cross join (values
    (0, 'Recenser les incidents significatifs survenus pendant les quatre jours.',                                       'normal'),
    (1, 'Identifier les écarts importants entre planning prévu et déroulement réel.',                                    'normal'),
    (2, 'Vérifier que les actions restant ouvertes ont un responsable.',                                                 'normal'),
    (3, 'Centraliser les informations utiles aux éventuelles réclamations ou régularisations.',                         'normal'),
    (4, 'Archiver les versions finales des conducteurs et documents opérationnels.',                                     'normal'),
    (5, 'Clôturer le dispositif de coordination une fois les actions restantes terminées.',                              'normal')
  ) as v(n, lbl, prio)
  returning id
),

-- ──────────────────────────── Liens mission ↔ séquences ────────────────────────────
-- Toutes les 7 séquences
sq_all_7 as materialized (
  select id, name from _20270628_event_sequences
  where name in ('Mariage civil','Goûter d''honneur','Moment convivial entre amis','Pique-nique partagé','Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
),

-- Missions avec toutes les 7 séquences
sq_m2  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m2.id,  sq_all_7.id from m2,  sq_all_7 returning mission_id),
sq_m7  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m7.id,  sq_all_7.id from m7,  sq_all_7 returning mission_id),
sq_m8  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m8.id,  sq_all_7.id from m8,  sq_all_7 returning mission_id),
sq_m9  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m9.id,  sq_all_7.id from m9,  sq_all_7 returning mission_id),
sq_m10 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m10.id, sq_all_7.id from m10, sq_all_7 returning mission_id),
sq_m11 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m11.id, sq_all_7.id from m11, sq_all_7 returning mission_id),
sq_m12 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m12.id, sq_all_7.id from m12, sq_all_7 returning mission_id),
sq_m13 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m13.id, sq_all_7.id from m13, sq_all_7 returning mission_id),
sq_m14 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m14.id, sq_all_7.id from m14, sq_all_7 returning mission_id),
sq_m15 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m15.id, sq_all_7.id from m15, sq_all_7 returning mission_id),
sq_m17 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m17.id, sq_all_7.id from m17, sq_all_7 returning mission_id),
sq_m20 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m20.id, sq_all_7.id from m20, sq_all_7 returning mission_id),
sq_m21 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m21.id, sq_all_7.id from m21, sq_all_7 returning mission_id),
sq_m22 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m22.id, sq_all_7.id from m22, sq_all_7 returning mission_id),
sq_m23 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m23.id, sq_all_7.id from m23, sq_all_7 returning mission_id),
sq_m24 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m24.id, sq_all_7.id from m24, sq_all_7 returning mission_id),
sq_m25 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m25.id, sq_all_7.id from m25, sq_all_7 returning mission_id),

-- m18 — Bénédiction à l'église | Célébration de mariage uniquement
sq_m18 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m18.id, s.id from m18, _20270628_event_sequences s
  where s.name in ('Bénédiction à l''église','Célébration de mariage')
  returning mission_id
)

-- ──────────────────────────── Vérification ────────────────────────────
select
  (select count(*) from _20270628_domaines d join _20270628_poles p on p.id = d.pole_id where p.name = 'Pilotage & coordination') as domaines,
  (select count(*) from _20270628_missions m join _20270628_domaines d on d.id = m.domaine_id join _20270628_poles p on p.id = d.pole_id where p.name = 'Pilotage & coordination') as missions,
  (select count(*) from sq_m7) + (select count(*) from sq_m18) as seq_liens_spot;
