-- ============================================================
-- Seed : Pôle "Décoration & ambiance" — portail mariage
-- Remplace intégralement le pôle existant (delete + insert).
-- Lancer dans l'éditeur SQL Supabase (rôle service_role).
-- ============================================================

delete from _20270628_poles where name = 'Décoration & ambiance';

with

-- ──────────────────────────── Pôle ────────────────────────────
pole as materialized (
  insert into _20270628_poles (id, name, sort_order)
  values (gen_random_uuid(), 'Décoration & ambiance', 50)
  returning id
),

-- ──────────────────────────── Domaines ────────────────────────────
d_direction as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Direction artistique', 'direction-artistique', 1, 'avant'
  from pole returning id
),
d_conception as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Conception des espaces', 'conception-espaces', 2, 'avant'
  from pole returning id
),
d_fleurs as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Fleurs & végétal', 'fleurs-vegetal', 3, 'avant'
  from pole returning id
),
d_mobilier as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Mobilier & art de la table', 'mobilier-art-table', 4, 'avant'
  from pole returning id
),
d_signa as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Signalétique & supports visuels', 'signaletique-supports-visuels', 5, 'avant'
  from pole returning id
),
d_achats as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Achats, locations & fabrication', 'achats-locations-fabrication', 6, 'avant'
  from pole returning id
),
d_prep as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Préparation & conditionnement', 'preparation-conditionnement', 7, 'avant'
  from pole returning id
),
d_instal as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Installation & contrôle esthétique', 'installation-controle-esthetique', 8, 'installation'
  from pole returning id
),
d_ambiance as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Ambiance lumineuse & visuelle', 'ambiance-lumineuse-visuelle', 9, null
  from pole returning id
),
d_demontage as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Démontage & réemploi', 'demontage-reemploi', 10, null
  from pole returning id
),

-- ──────────────────────────── Missions ────────────────────────────
-- d_direction
m1  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_direction.id, 'Définir la direction artistique générale du mariage',      'todo', 1 from d_direction returning id),
m2  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_direction.id, 'Définir la cohérence visuelle entre les quatre jours',     'todo', 2 from d_direction returning id),
m3  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_direction.id, 'Créer le dossier de références décoratives',               'todo', 3 from d_direction returning id),
-- d_conception
m4  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_conception.id,'Définir les espaces à scénographier',                     'todo', 1 from d_conception returning id),
m5  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_conception.id,'Concevoir la scénographie du Domaine Ostara',             'todo', 2 from d_conception returning id),
m6  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_conception.id,'Définir la décoration des autres séquences',               'todo', 3 from d_conception returning id),
-- d_fleurs
m7  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_fleurs.id,    'Définir la stratégie florale et végétale',                 'todo', 1 from d_fleurs    returning id),
m8  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_fleurs.id,    'Concevoir les compositions florales du Domaine Ostara',   'todo', 2 from d_fleurs    returning id),
m9  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_fleurs.id,    'Organiser la conservation et la manipulation des fleurs', 'todo', 3 from d_fleurs    returning id),
-- d_mobilier
m10 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_mobilier.id,  'Définir les besoins décoratifs liés au mobilier',         'todo', 1 from d_mobilier  returning id),
m11 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_mobilier.id,  'Concevoir l''habillage des tables du Domaine Ostara',    'todo', 2 from d_mobilier  returning id),
m12 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_mobilier.id,  'Valider une table témoin',                               'todo', 3 from d_mobilier  returning id),
-- d_signa
m13 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_signa.id,     'Définir le système de signalétique du mariage',           'todo', 1 from d_signa     returning id),
m14 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_signa.id,     'Créer les supports de signalétique nécessaires',          'todo', 2 from d_signa     returning id),
m15 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_signa.id,     'Contrôler les impressions et fabrications',               'todo', 3 from d_signa     returning id),
-- d_achats
m16 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_achats.id,    'Établir l''inventaire décoratif',                        'todo', 1 from d_achats    returning id),
m17 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_achats.id,    'Planifier les achats et locations de décoration',         'todo', 2 from d_achats    returning id),
m18 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_achats.id,    'Planifier les éléments décoratifs à fabriquer',           'todo', 3 from d_achats    returning id),
-- d_prep
m19 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_prep.id,      'Préparer la décoration par séquence et par zone',         'todo', 1 from d_prep      returning id),
m20 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_prep.id,      'Préparer les kits d''installation',                      'todo', 2 from d_prep      returning id),
-- d_instal
m21 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_instal.id,    'Installer la décoration de chaque séquence',              'todo', 1 from d_instal    returning id),
m22 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_instal.id,    'Piloter l''installation décorative du Domaine Ostara',   'todo', 2 from d_instal    returning id),
m23 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_instal.id,    'Effectuer le contrôle esthétique final',                  'todo', 3 from d_instal    returning id),
-- d_ambiance
m24 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_ambiance.id,  'Définir l''ambiance lumineuse décorative',               'todo', 1 from d_ambiance  returning id),
m25 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_ambiance.id,  'Tester l''ambiance lumineuse avant ouverture',           'todo', 2 from d_ambiance  returning id),
-- d_demontage
m26 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_demontage.id, 'Maintenir la décoration pendant les événements',          'todo', 1 from d_demontage returning id),
m27 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_demontage.id, 'Organiser le démontage de la décoration',                 'todo', 2 from d_demontage returning id),
m28 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_demontage.id, 'Gérer le devenir de la décoration après le mariage',      'todo', 3 from d_demontage returning id),

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
cl28 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m28.id, 'TODO' from m28 returning id),

-- ──────────────────────────── Items ────────────────────────────
-- m1 — Définir la direction artistique générale
i1 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl1.id, v.lbl, 'todo', v.prio, false, v.n
  from cl1 cross join (values
    (0, 'Formaliser l''univers visuel général du mariage.',                                     'high'),
    (1, 'Définir la déclinaison du style tropical élégant.',                                   'high'),
    (2, 'Définir la palette de couleurs principale et les couleurs d''accent.',               'high'),
    (3, 'Définir les matières, textures et motifs autorisés.',                                 'high'),
    (4, 'Définir le niveau de végétalisation et de fleurissement recherché.',                  'high'),
    (5, 'Définir les éléments visuels à éviter.',                                              'high'),
    (6, 'Créer un moodboard de référence.',                                                    'high'),
    (7, 'Valider une direction suffisamment précise pour guider les prestataires.',            'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m2 — Cohérence visuelle entre les quatre jours
i2 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl2.id, v.lbl, 'todo', v.prio, false, v.n
  from cl2 cross join (values
    (0, 'Identifier les éléments visuels pouvant servir de fil conducteur.',              'normal'),
    (1, 'Déterminer les séquences nécessitant une décoration complète ou légère.',        'normal'),
    (2, 'Déterminer les éléments pouvant être réutilisés entre plusieurs séquences.',     'normal'),
    (3, 'Adapter le niveau de décoration au caractère de chaque événement.',              'normal'),
    (4, 'Préserver une cohérence sans rendre les quatre jours identiques.',               'normal'),
    (5, 'Documenter les déclinaisons retenues par séquence.',                             'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m3 — Dossier de références décoratives
i3 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl3.id, v.lbl, 'todo', v.prio, false, v.n
  from cl3 cross join (values
    (0, 'Centraliser les inspirations validées.',                                                                    'normal'),
    (1, 'Classer les références par espace ou usage.',                                                              'normal'),
    (2, 'Associer les références aux couleurs et matières retenues.',                                               'normal'),
    (3, 'Ajouter les dimensions ou contraintes connues lorsque nécessaire.',                                        'normal'),
    (4, 'Identifier clairement ce qui constitue une inspiration et ce qui est à reproduire.',                      'normal'),
    (5, 'Partager le dossier aux prestataires décoratifs concernés.',                                               'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m4 — Définir les espaces à scénographier
i4 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl4.id, v.lbl, 'todo', v.prio, false, v.n
  from cl4 cross join (values
    (0, 'Lister les espaces visibles ou utilisés par les invités.',                        'high'),
    (1, 'Identifier les espaces nécessitant un traitement décoratif prioritaire.',         'high'),
    (2, 'Identifier les espaces pouvant rester sobres.',                                   'high'),
    (3, 'Définir la fonction et l''ambiance recherchée pour chaque zone.',                'high'),
    (4, 'Associer chaque zone à la séquence concernée.',                                  'high'),
    (5, 'Vérifier la compatibilité avec les contraintes des lieux.',                       'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m5 — Scénographie du Domaine Ostara
i5 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl5.id, v.lbl, 'todo', v.prio, false, v.n
  from cl5 cross join (values
    (0, 'Définir la scénographie de l''entrée et de l''accueil.',                            'high'),
    (1, 'Définir l''ambiance générale de la salle de réception.',                           'high'),
    (2, 'Définir le traitement décoratif des tables invités.',                               'high'),
    (3, 'Définir le traitement de la table ou de l''espace des mariés.',                    'high'),
    (4, 'Définir la scénographie du buffet.',                                                'high'),
    (5, 'Définir la scénographie de l''espace glacier.',                                    'high'),
    (6, 'Définir l''espace dédié au spectacle et aux temps forts.',                        'high'),
    (7, 'Définir l''ambiance de la zone de danse et de soirée.',                           'high'),
    (8, 'Définir les éventuels espaces photo ou décoratifs secondaires.',                   'high'),
    (9, 'Vérifier que la décoration ne gêne pas les circulations ni les prestations.',     'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m6 — Décoration des autres séquences
i6 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl6.id, v.lbl, 'todo', v.prio, false, v.n
  from cl6 cross join (values
    (0, 'Définir le niveau de décoration souhaité pour le mariage civil.',                          'normal'),
    (1, 'Définir le niveau de décoration souhaité pour le goûter d''honneur.',                     'normal'),
    (2, 'Définir le niveau de décoration souhaité pour le moment convivial du samedi.',             'normal'),
    (3, 'Définir le niveau de décoration souhaité pour le rendez-vous du dimanche midi.',           'normal'),
    (4, 'Définir les éléments appropriés pour la bénédiction au khane.',                            'normal'),
    (5, 'Définir les éléments appropriés pour la bénédiction à l''église.',                        'normal'),
    (6, 'Respecter les contraintes et usages propres aux lieux religieux.',                         'normal'),
    (7, 'Identifier les éléments réutilisables d''une séquence à l''autre.',                       'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m7 — Stratégie florale et végétale
i7 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl7.id, v.lbl, 'todo', v.prio, false, v.n
  from cl7 cross join (values
    (0, 'Déterminer les zones nécessitant des fleurs naturelles.',                                 'high'),
    (1, 'Déterminer les zones pouvant utiliser des fleurs artificielles.',                         'high'),
    (2, 'Définir les végétaux cohérents avec le style tropical élégant.',                          'high'),
    (3, 'Définir les volumes et densités recherchés.',                                             'high'),
    (4, 'Identifier les compositions devant résister plusieurs heures.',                           'high'),
    (5, 'Identifier les éléments pouvant être réutilisés.',                                       'high'),
    (6, 'Vérifier la cohérence avec le budget décoration global.',                                 'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m8 — Compositions florales du Domaine Ostara
i8 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl8.id, v.lbl, 'todo', v.prio, false, v.n
  from cl8 cross join (values
    (0, 'Définir les compositions des tables invités.',                                            'high'),
    (1, 'Définir la composition de l''espace des mariés.',                                        'high'),
    (2, 'Définir les compositions de l''entrée.',                                                 'high'),
    (3, 'Définir les éléments floraux du buffet.',                                                'high'),
    (4, 'Définir les éléments floraux de l''espace glacier.',                                    'high'),
    (5, 'Définir les éventuels grands arrangements ou installations.',                             'high'),
    (6, 'Vérifier les hauteurs afin de préserver la visibilité entre invités.',                   'high'),
    (7, 'Définir les contenants et supports nécessaires.',                                         'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m9 — Conservation et manipulation des fleurs
i9 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl9.id, v.lbl, 'todo', v.prio, false, v.n
  from cl9 cross join (values
    (0, 'Identifier les besoins de stockage avant installation.',                          'normal'),
    (1, 'Prévoir les conditions adaptées aux fleurs naturelles.',                          'normal'),
    (2, 'Définir le moment de préparation des compositions.',                              'normal'),
    (3, 'Prévoir le transport sans détérioration.',                                        'normal'),
    (4, 'Prévoir l''hydratation ou les réserves d''eau nécessaires.',                    'normal'),
    (5, 'Identifier les compositions fragiles à installer en dernier.',                    'normal'),
    (6, 'Prévoir le devenir des fleurs après les événements.',                             'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m10 — Besoins décoratifs liés au mobilier
i10 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl10.id, v.lbl, 'todo', v.prio, false, v.n
  from cl10 cross join (values
    (0, 'Recenser le mobilier déjà fourni par les lieux.',                                 'normal'),
    (1, 'Identifier les meubles ou supports décoratifs manquants.',                        'normal'),
    (2, 'Définir les besoins en tables d''appoint, présentoirs ou supports.',             'normal'),
    (3, 'Vérifier les dimensions disponibles.',                                            'normal'),
    (4, 'Identifier ce qui doit être loué, acheté ou fabriqué.',                          'normal'),
    (5, 'Vérifier la cohérence esthétique de l''ensemble.',                               'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m11 — Habillage des tables du Domaine Ostara
i11 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl11.id, v.lbl, 'todo', v.prio, false, v.n
  from cl11 cross join (values
    (0, 'Définir le type et la couleur du nappage.',                                               'high'),
    (1, 'Définir les serviettes et leur présentation.',                                            'high'),
    (2, 'Définir la vaisselle et la verrerie visibles sur table.',                                 'high'),
    (3, 'Définir les centres de table.',                                                           'high'),
    (4, 'Définir les éventuels chemins de table ou éléments textiles.',                            'high'),
    (5, 'Définir les numéros ou noms de table.',                                                   'high'),
    (6, 'Définir les menus ou éléments imprimés présents sur table.',                              'high'),
    (7, 'Réaliser un prototype ou une table test avant validation finale.',                        'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m12 — Valider une table témoin
i12 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl12.id, v.lbl, 'todo', v.prio, false, v.n
  from cl12 cross join (values
    (0, 'Réunir un exemplaire des principaux éléments de table.',                                          'high'),
    (1, 'Tester l''association nappage, vaisselle, verrerie et décoration.',                              'high'),
    (2, 'Tester le volume du centre de table.',                                                            'high'),
    (3, 'Vérifier la visibilité entre convives.',                                                         'high'),
    (4, 'Vérifier l''espace restant pour le service et les effets personnels.',                           'high'),
    (5, 'Photographier la version validée.',                                                              'high'),
    (6, 'Utiliser la table témoin comme référence d''installation.',                                      'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m13 — Système de signalétique
i13 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl13.id, v.lbl, 'todo', v.prio, false, v.n
  from cl13 cross join (values
    (0, 'Lister les informations devant être signalées aux invités.',                          'normal'),
    (1, 'Définir une identité graphique cohérente avec la décoration.',                        'normal'),
    (2, 'Déterminer les formats nécessaires.',                                                 'normal'),
    (3, 'Identifier les supports réutilisables.',                                              'normal'),
    (4, 'Vérifier la lisibilité à distance.',                                                  'normal'),
    (5, 'Vérifier la stabilité et la résistance des supports.',                                'normal'),
    (6, 'Prévoir les systèmes de fixation ou de pose.',                                        'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m14 — Créer les supports de signalétique
i14 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl14.id, v.lbl, 'todo', v.prio, false, v.n
  from cl14 cross join (values
    (0, 'Préparer les panneaux d''accueil lorsque nécessaires.',                             'high'),
    (1, 'Préparer les indications directionnelles utiles.',                                  'high'),
    (2, 'Préparer le plan de table ou support de placement.',                                'high'),
    (3, 'Préparer les numéros ou noms de table.',                                            'high'),
    (4, 'Préparer les panneaux liés au buffet ou aux espaces spécifiques.',                  'high'),
    (5, 'Préparer la signalétique de l''espace glacier.',                                   'high'),
    (6, 'Préparer les supports nécessaires aux animations.',                                 'high'),
    (7, 'Relire tous les textes avant impression ou fabrication.',                           'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m15 — Contrôler les impressions et fabrications
i15 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl15.id, v.lbl, 'todo', v.prio, false, v.n
  from cl15 cross join (values
    (0, 'Vérifier les dimensions avant lancement.',                               'normal'),
    (1, 'Vérifier les couleurs et finitions.',                                    'normal'),
    (2, 'Vérifier l''orthographe des noms et textes.',                           'normal'),
    (3, 'Contrôler les quantités reçues.',                                        'normal'),
    (4, 'Contrôler l''état des supports.',                                        'normal'),
    (5, 'Préparer les éléments nécessaires à leur installation.',                 'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m16 — Établir l'inventaire décoratif
i16 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl16.id, v.lbl, 'todo', v.prio, false, v.n
  from cl16 cross join (values
    (0, 'Lister tous les éléments nécessaires par espace.',                                   'high'),
    (1, 'Indiquer pour chaque élément s''il est déjà disponible.',                           'high'),
    (2, 'Identifier les éléments à acheter.',                                                 'high'),
    (3, 'Identifier les éléments à louer.',                                                   'high'),
    (4, 'Identifier les éléments à fabriquer.',                                               'high'),
    (5, 'Identifier les éléments fournis par un prestataire.',                                'high'),
    (6, 'Attribuer une quantité à chaque élément.',                                           'high'),
    (7, 'Suivre l''état d''avancement de chaque besoin.',                                    'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m17 — Planifier les achats et locations
i17 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl17.id, v.lbl, 'todo', v.prio, false, v.n
  from cl17 cross join (values
    (0, 'Identifier les éléments avec délai de commande important.',                        'normal'),
    (1, 'Comparer les options de location et d''achat.',                                   'normal'),
    (2, 'Vérifier les dates de retrait et de restitution des locations.',                   'normal'),
    (3, 'Vérifier les cautions éventuelles.',                                               'normal'),
    (4, 'Vérifier les quantités avant commande.',                                           'normal'),
    (5, 'Conserver les références et preuves de commande.',                                 'normal'),
    (6, 'Suivre les livraisons jusqu''à réception.',                                       'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m18 — Éléments décoratifs à fabriquer
i18 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl18.id, v.lbl, 'todo', v.prio, false, v.n
  from cl18 cross join (values
    (0, 'Lister les éléments DIY ou personnalisés.',                             'normal'),
    (1, 'Définir les dimensions et matériaux.',                                  'normal'),
    (2, 'Préparer un prototype lorsque nécessaire.',                             'normal'),
    (3, 'Estimer le temps de fabrication.',                                      'normal'),
    (4, 'Commander les matières premières suffisamment tôt.',                    'normal'),
    (5, 'Planifier les sessions de fabrication.',                                'normal'),
    (6, 'Contrôler chaque élément terminé avant stockage.',                      'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m19 — Préparer la décoration par séquence
i19 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl19.id, v.lbl, 'todo', v.prio, false, v.n
  from cl19 cross join (values
    (0, 'Regrouper les éléments par séquence.',                                                   'high'),
    (1, 'Sous-diviser les éléments par espace ou zone d''installation.',                         'high'),
    (2, 'Étiqueter clairement les contenants.',                                                   'high'),
    (3, 'Ajouter une liste de contenu à chaque lot important.',                                   'high'),
    (4, 'Associer les éléments de fixation ou outils nécessaires.',                               'high'),
    (5, 'Identifier les éléments fragiles.',                                                      'high'),
    (6, 'Préparer les instructions ou photos de référence nécessaires.',                          'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m20 — Préparer les kits d'installation
i20 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl20.id, v.lbl, 'todo', v.prio, false, v.n
  from cl20 cross join (values
    (0, 'Préparer les adhésifs et systèmes de fixation autorisés.',                'normal'),
    (1, 'Préparer ciseaux, cutters et petit outillage.',                           'normal'),
    (2, 'Préparer attaches, pinces et consommables.',                              'normal'),
    (3, 'Préparer le matériel de nettoyage rapide.',                               'normal'),
    (4, 'Préparer les éléments de réparation de secours.',                         'normal'),
    (5, 'Prévoir un kit spécifique pour les fleurs et végétaux.',                  'normal'),
    (6, 'Identifier clairement les personnes ayant accès aux kits.',               'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m21 — Installer la décoration de chaque séquence
i21 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl21.id, v.lbl, 'todo', v.prio, false, v.n
  from cl21 cross join (values
    (0, 'Installer les éléments selon le plan ou les références validées.',                      'high'),
    (1, 'Respecter l''ordre d''installation défini.',                                           'high'),
    (2, 'Installer en priorité les éléments conditionnant d''autres interventions.',            'high'),
    (3, 'Protéger les éléments fragiles pendant les autres installations.',                      'high'),
    (4, 'Respecter les règles et contraintes du lieu.',                                          'high'),
    (5, 'Maintenir les circulations et issues dégagées.',                                        'high'),
    (6, 'Signaler immédiatement les éléments manquants ou incompatibles.',                       'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m22 — Piloter l'installation décorative du Domaine Ostara
i22 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl22.id, v.lbl, 'todo', v.prio, false, v.n
  from cl22 cross join (values
    (0, 'Répartir les zones entre les personnes chargées de l''installation.',        'high'),
    (1, 'Installer l''entrée et les éléments d''accueil.',                           'high'),
    (2, 'Installer l''habillage des tables.',                                         'high'),
    (3, 'Installer les centres de table et compositions.',                            'high'),
    (4, 'Installer la décoration du buffet.',                                         'high'),
    (5, 'Installer et habiller l''espace glacier.',                                   'high'),
    (6, 'Installer la signalétique et le plan de table.',                             'high'),
    (7, 'Installer les éléments liés au spectacle et à la soirée si nécessaire.',   'high'),
    (8, 'Vérifier la cohérence visuelle globale avant ouverture.',                    'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m23 — Contrôle esthétique final
i23 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl23.id, v.lbl, 'todo', v.prio, false, v.n
  from cl23 cross join (values
    (0, 'Comparer l''installation aux références validées.',                                        'high'),
    (1, 'Vérifier les alignements et symétries lorsque nécessaires.',                              'high'),
    (2, 'Vérifier que les textiles sont propres et correctement positionnés.',                     'high'),
    (3, 'Vérifier l''état des fleurs et végétaux.',                                               'high'),
    (4, 'Retirer emballages, étiquettes et éléments techniques visibles.',                         'high'),
    (5, 'Vérifier la lisibilité de toute la signalétique.',                                        'high'),
    (6, 'Vérifier le rendu depuis les principaux points de vue des invités.',                      'high'),
    (7, 'Corriger les défauts visibles avant l''arrivée des invités.',                            'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m24 — Définir l'ambiance lumineuse décorative
i24 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl24.id, v.lbl, 'todo', v.prio, false, v.n
  from cl24 cross join (values
    (0, 'Identifier les espaces nécessitant un éclairage d''ambiance.',                       'normal'),
    (1, 'Définir la température et l''intensité recherchées.',                                'normal'),
    (2, 'Identifier les éléments décoratifs à mettre en valeur.',                             'normal'),
    (3, 'Distinguer éclairage fonctionnel et éclairage décoratif.',                           'normal'),
    (4, 'Vérifier les possibilités techniques des lieux.',                                    'normal'),
    (5, 'Vérifier la compatibilité avec les besoins photo et vidéo.',                         'normal'),
    (6, 'Prévoir l''évolution de l''ambiance entre réception et soirée.',                    'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m25 — Tester l'ambiance lumineuse
i25 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl25.id, v.lbl, 'todo', v.prio, false, v.n
  from cl25 cross join (values
    (0, 'Tester les éclairages décoratifs installés.',                                  'high'),
    (1, 'Vérifier que les zones importantes restent suffisamment visibles.',             'high'),
    (2, 'Vérifier l''éclairage des tables et du buffet.',                               'high'),
    (3, 'Vérifier l''éclairage des zones de circulation.',                              'high'),
    (4, 'Vérifier le rendu de l''espace spectacle et danse.',                          'high'),
    (5, 'Corriger les éclairages gênants ou insuffisants.',                             'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m26 — Maintenir la décoration pendant les événements
i26 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl26.id, v.lbl, 'todo', v.prio, false, v.n
  from cl26 cross join (values
    (0, 'Surveiller les éléments fragiles ou instables.',                                   'normal'),
    (1, 'Remettre en place les éléments déplacés lorsque nécessaire.',                     'normal'),
    (2, 'Retirer ou remplacer les éléments détériorés.',                                   'normal'),
    (3, 'Entretenir les fleurs ou végétaux lorsque nécessaire.',                           'normal'),
    (4, 'Maintenir propres les zones décoratives importantes.',                             'normal'),
    (5, 'Préserver la signalétique utile jusqu''à la fin de son usage.',                  'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m27 — Organiser le démontage
i27 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl27.id, v.lbl, 'todo', v.prio, false, v.n
  from cl27 cross join (values
    (0, 'Identifier les éléments à récupérer immédiatement.',                             'high'),
    (1, 'Identifier les éléments pouvant être démontés plus tard.',                       'high'),
    (2, 'Séparer les éléments loués, achetés, empruntés et jetables.',                    'high'),
    (3, 'Conditionner les éléments fragiles.',                                             'high'),
    (4, 'Regrouper les éléments par destination.',                                         'high'),
    (5, 'Vérifier qu''aucun élément décoratif n''est oublié sur le lieu.',               'high'),
    (6, 'Respecter les horaires de libération des espaces.',                               'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m28 — Devenir de la décoration après le mariage
i28 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl28.id, v.lbl, 'todo', v.prio, false, v.n
  from cl28 cross join (values
    (0, 'Restituer les éléments loués.',                                               'normal'),
    (1, 'Restituer les éléments empruntés.',                                           'normal'),
    (2, 'Identifier les éléments à conserver.',                                        'normal'),
    (3, 'Identifier les éléments pouvant être revendus.',                              'normal'),
    (4, 'Identifier les éléments pouvant être donnés.',                                'normal'),
    (5, 'Organiser le devenir des fleurs et végétaux.',                                'normal'),
    (6, 'Mettre à jour l''inventaire après restitution et rangement.',                 'normal')
  ) as v(n, lbl, prio)
  returning id
),

-- ──────────────────────────── Liens mission ↔ séquences ────────────────────────────
-- Toutes les 7 séquences
sq_all_7 as materialized (
  select id, name from _20270628_event_sequences
  where name in ('Mariage civil','Goûter d''honneur','Moment convivial entre amis','Pique-nique partagé','Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
),

-- m2, m4, m13, m16, m17, m19 : toutes les 7
sq_m2  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m2.id,  sq_all_7.id from m2,  sq_all_7 returning mission_id),
sq_m4  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m4.id,  sq_all_7.id from m4,  sq_all_7 returning mission_id),
sq_m13 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m13.id, sq_all_7.id from m13, sq_all_7 returning mission_id),
sq_m16 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m16.id, sq_all_7.id from m16, sq_all_7 returning mission_id),
sq_m17 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m17.id, sq_all_7.id from m17, sq_all_7 returning mission_id),
sq_m19 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m19.id, sq_all_7.id from m19, sq_all_7 returning mission_id),

-- m5, m8, m11, m12, m22 — Célébration de mariage uniquement
sq_m5 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m5.id, s.id from m5, _20270628_event_sequences s where s.name = 'Célébration de mariage' returning mission_id
),
sq_m8 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m8.id, s.id from m8, _20270628_event_sequences s where s.name = 'Célébration de mariage' returning mission_id
),
sq_m11 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m11.id, s.id from m11, _20270628_event_sequences s where s.name = 'Célébration de mariage' returning mission_id
),
sq_m12 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m12.id, s.id from m12, _20270628_event_sequences s where s.name = 'Célébration de mariage' returning mission_id
),
sq_m22 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m22.id, s.id from m22, _20270628_event_sequences s where s.name = 'Célébration de mariage' returning mission_id
),

-- m6 — 6 séquences (sans Célébration de mariage)
sq_m6 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m6.id, s.id from m6, _20270628_event_sequences s
  where s.name in ('Mariage civil','Goûter d''honneur','Moment convivial entre amis','Pique-nique partagé','Bénédiction au khane','Bénédiction à l''église')
  returning mission_id
),

-- m7, m9 — Goûter d'honneur | Bénédiction au khane | Bénédiction à l'église | Célébration de mariage
sq_m7 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m7.id, s.id from m7, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
  returning mission_id
),
sq_m9 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m9.id, s.id from m9, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
  returning mission_id
),

-- m10, m14, m26 — Goûter d'honneur | Moment convivial entre amis | Célébration de mariage
sq_m10 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m10.id, s.id from m10, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Célébration de mariage')
  returning mission_id
),
sq_m14 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m14.id, s.id from m14, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Célébration de mariage')
  returning mission_id
),
sq_m26 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m26.id, s.id from m26, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Célébration de mariage')
  returning mission_id
),

-- m20, m21, m23, m27 — Goûter d'honneur | Moment convivial | Bénédiction au khane | Bénédiction à l'église | Célébration de mariage
sq_m20 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m20.id, s.id from m20, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
  returning mission_id
),
sq_m21 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m21.id, s.id from m21, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
  returning mission_id
),
sq_m23 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m23.id, s.id from m23, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
  returning mission_id
),
sq_m27 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m27.id, s.id from m27, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
  returning mission_id
),

-- m24, m25 — Moment convivial entre amis | Célébration de mariage
sq_m24 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m24.id, s.id from m24, _20270628_event_sequences s
  where s.name in ('Moment convivial entre amis','Célébration de mariage')
  returning mission_id
),
sq_m25 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m25.id, s.id from m25, _20270628_event_sequences s
  where s.name in ('Moment convivial entre amis','Célébration de mariage')
  returning mission_id
)

-- ──────────────────────────── Vérification ────────────────────────────
select
  (select count(*) from _20270628_domaines d join _20270628_poles p on p.id = d.pole_id where p.name = 'Décoration & ambiance') as domaines,
  (select count(*) from _20270628_missions m join _20270628_domaines d on d.id = m.domaine_id join _20270628_poles p on p.id = d.pole_id where p.name = 'Décoration & ambiance') as missions,
  (select count(*) from sq_m2) + (select count(*) from sq_m5) + (select count(*) from sq_m6) + (select count(*) from sq_m24) as seq_liens_spot;
