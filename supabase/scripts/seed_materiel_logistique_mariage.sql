-- ============================================================
-- Seed : Pôle "Matériel & logistique" — portail mariage
-- Remplace intégralement le pôle existant (delete + insert).
-- Lancer dans l'éditeur SQL Supabase (rôle service_role).
-- ============================================================

-- Supprime le pôle (et tout ce qu'il contient par cascade).
delete from _20270628_poles where name = 'Matériel & logistique';

with

-- ──────────────────────────── Pôle ────────────────────────────
pole as materialized (
  insert into _20270628_poles (id, name, sort_order)
  values (gen_random_uuid(), 'Matériel & logistique', 10)
  returning id
),

-- ──────────────────────────── Domaines ────────────────────────────
-- Phase unique → mappée ; phases mixtes → null
d_inv as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Inventaire & besoins matériels', 'inventaire-besoins-materiels', 1, 'avant'
  from pole returning id
),
d_rep as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Répartition & responsabilités', 'repartition-responsabilites', 2, 'avant'
  from pole returning id
),
d_sto as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Stockage & conditionnement', 'stockage-conditionnement', 3, 'avant'
  from pole returning id
),
d_tra as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Transport & acheminement', 'transport-acheminement', 4, null
  from pole returning id
),
d_rec as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Réception des livraisons', 'reception-livraisons', 5, null
  from pole returning id
),
d_ins as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Installation & contrôle', 'installation-controle', 6, 'installation'
  from pole returning id
),
d_log as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Logistique pendant les événements', 'logistique-pendant-evenements', 7, 'jour_j'
  from pole returning id
),
d_dem as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Démontage, récupération & restitution', 'demontage-recuperation-restitution', 8, null
  from pole returning id
),

-- ──────────────────────────── Missions ────────────────────────────
-- Inventaire & besoins matériels
m1  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_inv.id, 'Recenser les besoins matériels du mariage',        'todo', 1 from d_inv returning id),
m2  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_inv.id, 'Tenir l''inventaire général du matériel',           'todo', 2 from d_inv returning id),
m3  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_inv.id, 'Contrôler les besoins matériels avant le mariage',  'todo', 3 from d_inv returning id),
-- Répartition & responsabilités
m4  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_rep.id, 'Répartir le matériel entre les apporteurs',         'todo', 1 from d_rep returning id),
m5  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_rep.id, 'Attribuer les responsabilités logistiques',          'todo', 2 from d_rep returning id),
-- Stockage & conditionnement
m6  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_sto.id, 'Organiser le stockage du matériel',                 'todo', 1 from d_sto returning id),
m7  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_sto.id, 'Préparer le matériel par séquence',                 'todo', 2 from d_sto returning id),
-- Transport & acheminement
m8  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_tra.id, 'Planifier les mouvements de matériel entre les séquences', 'todo', 1 from d_tra returning id),
m9  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_tra.id, 'Organiser l''acheminement du matériel vers les lieux',     'todo', 2 from d_tra returning id),
m10 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_tra.id, 'Organiser l''évacuation du matériel après les séquences',  'todo', 3 from d_tra returning id),
-- Réception des livraisons
m11 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_rec.id, 'Préparer la réception des livraisons',                         'todo', 1 from d_rec returning id),
m12 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_rec.id, 'Réceptionner et contrôler les livraisons',                     'todo', 2 from d_rec returning id),
m13 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_rec.id, 'Préparer le déploiement logistique au Domaine Ostara',         'todo', 3 from d_rec returning id),
m14 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_rec.id, 'Coordonner les livraisons et retraits au Domaine Ostara',      'todo', 4 from d_rec returning id),
-- Installation & contrôle
m15 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_ins.id, 'Installer le matériel nécessaire aux séquences',          'todo', 1 from d_ins returning id),
m16 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_ins.id, 'Effectuer le contrôle logistique avant ouverture',         'todo', 2 from d_ins returning id),
m17 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_ins.id, 'Préparer le matériel de secours et les consommables',      'todo', 3 from d_ins returning id),
-- Logistique pendant les événements
m18 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_log.id, 'Assurer la permanence logistique pendant l''événement',         'todo', 1 from d_log returning id),
m19 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_log.id, 'Surveiller les zones et le matériel en cours d''utilisation',   'todo', 2 from d_log returning id),
-- Démontage, récupération & restitution
m20 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_dem.id, 'Organiser le démontage et la récupération du matériel', 'todo', 1 from d_dem returning id),
m21 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_dem.id, 'Contrôler le matériel récupéré',                        'todo', 2 from d_dem returning id),
m22 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_dem.id, 'Restituer le matériel loué ou emprunté',                'todo', 3 from d_dem returning id),
m23 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_dem.id, 'Ranger et clôturer la logistique du mariage',           'todo', 4 from d_dem returning id),

-- ──────────────────────────── Checklists (une par mission, "TODO") ────────────────────────────
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
-- m1 — Recenser les besoins matériels
i1 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl1.id, v.lbl, 'todo', v.prio, false, v.n
  from cl1 cross join (values
    (0, 'Recenser le matériel nécessaire pour chaque séquence.',                                              'normal'),
    (1, 'Identifier le matériel mutualisé entre plusieurs séquences.',                                        'normal'),
    (2, 'Déterminer les quantités nécessaires.',                                                               'normal'),
    (3, 'Identifier le matériel déjà disponible.',                                                             'normal'),
    (4, 'Identifier le matériel manquant.',                                                                    'normal'),
    (5, 'Préciser pour chaque élément s''il doit être acheté, loué, emprunté ou fourni par un prestataire.', 'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m2 — Tenir l'inventaire général
i2 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl2.id, v.lbl, 'todo', v.prio, false, v.n
  from cl2 cross join (values
    (0, 'Centraliser l''ensemble du matériel dans un inventaire unique.',          'normal'),
    (1, 'Indiquer le propriétaire ou le fournisseur de chaque élément.',           'normal'),
    (2, 'Indiquer les quantités prévues.',                                          'normal'),
    (3, 'Indiquer les séquences d''utilisation.',                                   'normal'),
    (4, 'Indiquer le lieu de stockage avant utilisation.',                          'normal'),
    (5, 'Mettre à jour l''inventaire après chaque décision ou changement.',         'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m3 — Contrôler les besoins avant le mariage
i3 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl3.id, v.lbl, 'todo', v.prio, false, v.n
  from cl3 cross join (values
    (0, 'Comparer l''inventaire aux besoins définitifs de chaque séquence.',                                    'high'),
    (1, 'Vérifier que les quantités sont suffisantes.',                                                          'high'),
    (2, 'Identifier les derniers éléments manquants.',                                                           'high'),
    (3, 'Vérifier que chaque élément a un responsable ou un fournisseur identifié.',                             'high'),
    (4, 'Valider que les éléments critiques disposent d''une solution de secours lorsque nécessaire.',           'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m4 — Répartir le matériel entre les apporteurs
i4 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl4.id, v.lbl, 'todo', v.prio, false, v.n
  from cl4 cross join (values
    (0, 'Identifier qui fournit ou apporte chaque élément.',                             'normal'),
    (1, 'Confirmer la disponibilité du matériel auprès de chaque apporteur.',            'normal'),
    (2, 'Communiquer le lieu et l''horaire de remise ou de livraison.',                  'normal'),
    (3, 'Vérifier que chaque apporteur connaît la destination du matériel.',             'normal'),
    (4, 'Prévoir un relais en cas d''indisponibilité d''un apporteur.',                  'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m5 — Attribuer les responsabilités logistiques
i5 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl5.id, v.lbl, 'todo', v.prio, false, v.n
  from cl5 cross join (values
    (0, 'Désigner un responsable pour chaque flux matériel important.',                              'normal'),
    (1, 'Désigner les personnes chargées des chargements et déchargements.',                         'normal'),
    (2, 'Désigner les personnes chargées de réceptionner les livraisons.',                           'normal'),
    (3, 'Désigner les personnes chargées du contrôle après installation.',                           'normal'),
    (4, 'Désigner les personnes chargées de la récupération et des restitutions.',                   'normal'),
    (5, 'Communiquer clairement les responsabilités aux personnes concernées.',                      'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m6 — Organiser le stockage
i6 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl6.id, v.lbl, 'todo', v.prio, false, v.n
  from cl6 cross join (values
    (0, 'Définir les zones de stockage avant le mariage.',                            'normal'),
    (1, 'Répartir le matériel par destination ou séquence.',                          'normal'),
    (2, 'Sécuriser le matériel fragile ou de valeur.',                                'normal'),
    (3, 'Vérifier l''accessibilité des zones de stockage.',                           'normal'),
    (4, 'Éviter de mélanger le matériel à restituer avec le matériel personnel.',     'normal'),
    (5, 'Identifier clairement les contenants et zones de stockage.',                 'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m7 — Préparer le matériel par séquence
i7 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl7.id, v.lbl, 'todo', v.prio, false, v.n
  from cl7 cross join (values
    (0, 'Regrouper le matériel nécessaire à chaque séquence.',                                                         'normal'),
    (1, 'Identifier clairement la destination de chaque caisse, sac ou contenant.',                                    'normal'),
    (2, 'Vérifier le contenu de chaque ensemble avant fermeture.',                                                     'normal'),
    (3, 'Ajouter les petits consommables et accessoires nécessaires.',                                                  'normal'),
    (4, 'Préparer une liste de contrôle pour les éléments critiques.',                                                  'normal'),
    (5, 'Positionner le matériel dans l''ordre logique de son utilisation ou de son chargement.',                       'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m8 — Planifier les mouvements entre séquences
i8 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl8.id, v.lbl, 'todo', v.prio, false, v.n
  from cl8 cross join (values
    (0, 'Identifier le matériel utilisé dans plusieurs séquences.',                        'high'),
    (1, 'Déterminer la destination du matériel après chaque séquence.',                    'high'),
    (2, 'Identifier le responsable de chaque transfert.',                                   'high'),
    (3, 'Déterminer les véhicules nécessaires.',                                            'high'),
    (4, 'Définir les lieux de stockage intermédiaire.',                                     'high'),
    (5, 'Vérifier les délais disponibles entre deux utilisations.',                         'high'),
    (6, 'Identifier les transferts critiques ne pouvant pas être retardés.',                'high'),
    (7, 'Valider le circuit logistique complet des quatre jours.',                          'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m9 — Organiser l'acheminement
i9 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl9.id, v.lbl, 'todo', v.prio, false, v.n
  from cl9 cross join (values
    (0, 'Confirmer les véhicules et conducteurs nécessaires.',                                     'normal'),
    (1, 'Définir l''ordre de chargement en fonction de l''ordre de déchargement.',                 'normal'),
    (2, 'Contrôler le matériel au moment du chargement.',                                          'normal'),
    (3, 'Vérifier les horaires d''accès aux lieux.',                                               'normal'),
    (4, 'Communiquer les adresses, accès et contacts utiles aux conducteurs.',                     'normal'),
    (5, 'Confirmer l''arrivée du matériel sur le lieu prévu.',                                     'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m10 — Organiser l'évacuation
i10 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl10.id, v.lbl, 'todo', v.prio, false, v.n
  from cl10 cross join (values
    (0, 'Identifier ce qui doit repartir immédiatement.',                                 'normal'),
    (1, 'Identifier ce qui doit être transféré vers une autre séquence.',                 'normal'),
    (2, 'Identifier ce qui peut rester temporairement sur place.',                        'normal'),
    (3, 'Répartir le matériel entre les véhicules prévus.',                               'normal'),
    (4, 'Contrôler les zones avant le départ.',                                           'normal'),
    (5, 'Confirmer l''arrivée du matériel à sa destination suivante.',                    'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m11 — Préparer la réception des livraisons
i11 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl11.id, v.lbl, 'todo', v.prio, false, v.n
  from cl11 cross join (values
    (0, 'Lister les livraisons attendues avec leur fournisseur.',                                  'normal'),
    (1, 'Confirmer les dates et créneaux de livraison.',                                           'normal'),
    (2, 'Identifier le contact chargé de réceptionner chaque livraison.',                          'normal'),
    (3, 'Communiquer les accès et consignes de livraison aux fournisseurs.',                       'normal'),
    (4, 'Prévoir la zone de déchargement et la destination de chaque livraison.',                  'normal'),
    (5, 'Prévoir la procédure à suivre en cas de retard ou d''anomalie.',                          'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m12 — Réceptionner et contrôler les livraisons
i12 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl12.id, v.lbl, 'todo', v.prio, false, v.n
  from cl12 cross join (values
    (0, 'Accueillir le fournisseur ou le transporteur.',                        'high'),
    (1, 'Contrôler les quantités livrées.',                                     'high'),
    (2, 'Contrôler l''état apparent du matériel.',                              'high'),
    (3, 'Comparer la livraison à la commande ou au bon prévu.',                 'high'),
    (4, 'Signaler immédiatement les manques ou dégradations.',                  'high'),
    (5, 'Acheminer le matériel vers la zone prévue.',                           'high'),
    (6, 'Conserver les documents ou preuves de livraison utiles.',              'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m13 — Préparer le déploiement logistique au Domaine Ostara
i13 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl13.id, v.lbl, 'todo', v.prio, false, v.n
  from cl13 cross join (values
    (0,  'Finaliser la liste de tout le matériel devant arriver au Domaine Ostara.',                     'high'),
    (1,  'Identifier ce qui est fourni par le domaine.',                                                  'high'),
    (2,  'Identifier ce qui est fourni par le traiteur.',                                                 'high'),
    (3,  'Identifier ce qui est fourni par les décorateurs.',                                             'high'),
    (4,  'Identifier ce qui est loué séparément.',                                                        'high'),
    (5,  'Identifier ce qui est apporté par les mariés ou leurs proches.',                                'high'),
    (6,  'Définir les horaires d''arrivée des différents véhicules et prestataires.',                     'high'),
    (7,  'Définir les zones de déchargement.',                                                            'high'),
    (8,  'Désigner les personnes chargées de réceptionner chaque livraison.',                             'high'),
    (9,  'Définir l''ordre de déchargement et d''installation.',                                          'high'),
    (10, 'Vérifier que le planning permet une installation complète avant l''arrivée des invités.',       'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m14 — Coordonner les livraisons et retraits au Domaine Ostara
i14 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl14.id, v.lbl, 'todo', v.prio, false, v.n
  from cl14 cross join (values
    (0, 'Suivre l''arrivée des prestataires et des livraisons prévues.',                               'high'),
    (1, 'Orienter chaque livraison vers la bonne zone.',                                               'high'),
    (2, 'Éviter les conflits entre véhicules, prestataires et équipes d''installation.',               'high'),
    (3, 'Contrôler les éléments livrés avant leur installation.',                                      'high'),
    (4, 'Mettre à jour les éventuels retards ou anomalies.',                                           'high'),
    (5, 'Confirmer les modalités et horaires de retrait du matériel loué.',                            'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m15 — Installer le matériel
i15 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl15.id, v.lbl, 'todo', v.prio, false, v.n
  from cl15 cross join (values
    (0, 'Acheminer le matériel vers les zones prévues.',                              'normal'),
    (1, 'Installer le matériel conformément au plan validé.',                         'normal'),
    (2, 'Respecter les consignes des lieux et des prestataires.',                     'normal'),
    (3, 'Vérifier la stabilité et la sécurité des installations.',                   'normal'),
    (4, 'Évacuer les emballages et contenants inutiles des zones visibles.',          'normal'),
    (5, 'Signaler immédiatement tout élément manquant ou inutilisable.',              'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m16 — Contrôle logistique avant ouverture
i16 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl16.id, v.lbl, 'todo', v.prio, false, v.n
  from cl16 cross join (values
    (0, 'Parcourir l''ensemble des espaces utilisés.',                                            'high'),
    (1, 'Vérifier que le matériel prévu est présent et correctement installé.',                   'high'),
    (2, 'Vérifier les accès et circulations.',                                                    'high'),
    (3, 'Contrôler les éléments critiques avant l''arrivée des invités.',                         'high'),
    (4, 'Faire corriger les anomalies identifiées.',                                               'high'),
    (5, 'Confirmer au coordinateur que la partie logistique est prête.',                          'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m17 — Matériel de secours et consommables
i17 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl17.id, v.lbl, 'todo', v.prio, false, v.n
  from cl17 cross join (values
    (0, 'Identifier les consommables susceptibles de manquer pendant l''événement.',                  'normal'),
    (1, 'Prévoir les outils et accessoires utiles aux petites interventions.',                        'normal'),
    (2, 'Prévoir du matériel de remplacement pour les éléments critiques lorsque possible.',          'normal'),
    (3, 'Regrouper le matériel de secours dans un emplacement identifié.',                            'normal'),
    (4, 'Informer les responsables de l''emplacement du matériel de secours.',                        'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m18 — Permanence logistique
i18 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl18.id, v.lbl, 'todo', v.prio, false, v.n
  from cl18 cross join (values
    (0, 'Centraliser les demandes logistiques.',                                        'high'),
    (1, 'Évaluer le niveau d''urgence des demandes.',                                  'high'),
    (2, 'Affecter une personne disponible lorsque nécessaire.',                        'high'),
    (3, 'Fournir, déplacer ou remplacer le matériel nécessaire.',                      'high'),
    (4, 'Corriger les dysfonctionnements simples.',                                    'high'),
    (5, 'Vérifier que le problème a été résolu.',                                      'high'),
    (6, 'Informer le coordinateur en cas de problème important.',                      'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m19 — Surveiller les zones
i19 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl19.id, v.lbl, 'todo', v.prio, false, v.n
  from cl19 cross join (values
    (0, 'Vérifier régulièrement les zones sensibles.',                                  'normal'),
    (1, 'Maintenir les circulations dégagées.',                                         'normal'),
    (2, 'Remettre en place le matériel déplacé lorsque nécessaire.',                   'normal'),
    (3, 'Réapprovisionner les consommables relevant de la logistique.',                 'normal'),
    (4, 'Mettre hors service tout matériel présentant un risque.',                     'normal'),
    (5, 'Signaler les dégradations ou pertes constatées.',                              'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m20 — Organiser le démontage
i20 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl20.id, v.lbl, 'todo', v.prio, false, v.n
  from cl20 cross join (values
    (0, 'Définir ce qui doit être démonté et dans quel ordre.',                                      'high'),
    (1, 'Répartir les tâches entre les personnes disponibles.',                                      'high'),
    (2, 'Séparer le matériel personnel, loué, emprunté et appartenant aux prestataires.',            'high'),
    (3, 'Conditionner correctement le matériel fragile.',                                            'high'),
    (4, 'Contrôler les espaces avant de les quitter.',                                               'high'),
    (5, 'Regrouper le matériel selon sa destination.',                                               'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m21 — Contrôler le matériel récupéré
i21 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl21.id, v.lbl, 'todo', v.prio, false, v.n
  from cl21 cross join (values
    (0, 'Comparer le matériel récupéré à l''inventaire.',               'normal'),
    (1, 'Identifier les éléments manquants.',                            'normal'),
    (2, 'Identifier les éléments endommagés.',                           'normal'),
    (3, 'Photographier les dégradations utiles à documenter.',           'normal'),
    (4, 'Mettre à jour l''inventaire après contrôle.',                   'normal'),
    (5, 'Signaler rapidement les pertes ou dommages concernés.',         'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m22 — Restituer le matériel loué ou emprunté
i22 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl22.id, v.lbl, 'todo', v.prio, false, v.n
  from cl22 cross join (values
    (0, 'Lister les éléments à restituer et leurs échéances.',                    'normal'),
    (1, 'Regrouper les éléments par propriétaire ou fournisseur.',                'normal'),
    (2, 'Vérifier l''état et les quantités avant restitution.',                   'normal'),
    (3, 'Respecter les modalités de conditionnement prévues.',                    'normal'),
    (4, 'Organiser le transport ou le retrait.',                                   'normal'),
    (5, 'Obtenir une confirmation de restitution lorsque nécessaire.',            'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m23 — Ranger et clôturer
i23 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl23.id, v.lbl, 'todo', v.prio, false, v.n
  from cl23 cross join (values
    (0, 'Nettoyer le matériel personnel avant rangement lorsque nécessaire.',            'normal'),
    (1, 'Ranger le matériel conservé dans son emplacement définitif.',                   'normal'),
    (2, 'Archiver les informations utiles concernant le matériel loué ou acheté.',       'normal'),
    (3, 'Clôturer les éventuels incidents, pertes ou dégradations.',                    'normal'),
    (4, 'Identifier ce qui peut être revendu, donné ou réutilisé.',                     'normal'),
    (5, 'Valider la clôture de l''inventaire logistique.',                               'normal')
  ) as v(n, lbl, prio)
  returning id
),

-- ──────────────────────────── Liens mission ↔ séquences ────────────────────────────
-- Les séquences sont référencées par leur nom exact dans _20270628_event_sequences.

-- m7 — toutes les séquences
sq_m7 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m7.id, s.id from m7, _20270628_event_sequences s
  where s.name in ('Mariage civil','Goûter d''honneur','Moment convivial entre amis','Pique-nique partagé','Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
  returning mission_id
),
-- m9 — toutes les séquences
sq_m9 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m9.id, s.id from m9, _20270628_event_sequences s
  where s.name in ('Mariage civil','Goûter d''honneur','Moment convivial entre amis','Pique-nique partagé','Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
  returning mission_id
),
-- m10 — toutes les séquences
sq_m10 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m10.id, s.id from m10, _20270628_event_sequences s
  where s.name in ('Mariage civil','Goûter d''honneur','Moment convivial entre amis','Pique-nique partagé','Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
  returning mission_id
),
-- m11 — Goûter d'honneur | Moment convivial entre amis | Célébration de mariage
sq_m11 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m11.id, s.id from m11, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Célébration de mariage')
  returning mission_id
),
-- m12 — même trois
sq_m12 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m12.id, s.id from m12, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Célébration de mariage')
  returning mission_id
),
-- m13 — Célébration de mariage
sq_m13 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m13.id, s.id from m13, _20270628_event_sequences s
  where s.name = 'Célébration de mariage'
  returning mission_id
),
-- m14 — Célébration de mariage
sq_m14 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m14.id, s.id from m14, _20270628_event_sequences s
  where s.name = 'Célébration de mariage'
  returning mission_id
),
-- m15 — Goûter d'honneur | Moment convivial entre amis | Pique-nique partagé | Célébration de mariage
sq_m15 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m15.id, s.id from m15, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Pique-nique partagé','Célébration de mariage')
  returning mission_id
),
-- m16 — même quatre
sq_m16 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m16.id, s.id from m16, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Pique-nique partagé','Célébration de mariage')
  returning mission_id
),
-- m17 — Goûter d'honneur | Moment convivial entre amis | Célébration de mariage
sq_m17 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m17.id, s.id from m17, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Célébration de mariage')
  returning mission_id
),
-- m18 — Goûter d'honneur | Moment convivial entre amis | Pique-nique partagé | Célébration de mariage
sq_m18 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m18.id, s.id from m18, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Pique-nique partagé','Célébration de mariage')
  returning mission_id
),
-- m19 — même quatre
sq_m19 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m19.id, s.id from m19, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Pique-nique partagé','Célébration de mariage')
  returning mission_id
),
-- m20 — même quatre
sq_m20 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m20.id, s.id from m20, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Pique-nique partagé','Célébration de mariage')
  returning mission_id
)

-- ──────────────────────────── Vérification ────────────────────────────
select
  (select count(*) from _20270628_domaines d join _20270628_poles p on p.id = d.pole_id where p.name = 'Matériel & logistique') as domaines,
  (select count(*) from _20270628_missions  m join _20270628_domaines d on d.id = m.domaine_id join _20270628_poles p on p.id = d.pole_id where p.name = 'Matériel & logistique') as missions,
  (select count(*) from sq_m7) + (select count(*) from sq_m9) + (select count(*) from sq_m10) as seq_liens_spot;
