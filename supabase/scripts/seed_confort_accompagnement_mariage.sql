-- seed_confort_accompagnement_mariage.sql
-- Pôle "Confort & accompagnement" – script de seed complet (sort_order = 90)

delete from _20270628_poles where name = 'Confort & accompagnement';

with
-- ─── PÔLE ────────────────────────────────────────────────────────────────────
p as materialized (
  insert into _20270628_poles (id, name, sort_order)
  values (gen_random_uuid(), 'Confort & accompagnement', 90)
  returning id
),

-- ─── DOMAINES ────────────────────────────────────────────────────────────────
d_org as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Organisation de l''accompagnement', 'organisation-accompagnement', 'avant'
  from p returning id
),
d_maries as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Confort des mariés', 'confort-maries', 'avant'
  from p returning id
),
d_hydratation as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Hydratation & chaleur', 'hydratation-chaleur', null
  from p returning id
),
d_repas as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Repas des personnes mobilisées', 'repas-personnes-mobilisees', null
  from p returning id
),
d_espaces as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Espaces de préparation & repos', 'espaces-preparation-repos', 'avant'
  from p returning id
),
d_effets as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Effets personnels', 'effets-personnels', null
  from p returning id
),
d_kits as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Kits pratiques', 'kits-pratiques', 'avant'
  from p returning id
),
d_parents as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Parents & témoins', 'parents-temoins', 'avant'
  from p returning id
),
d_cortege as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Cortège & enfants', 'cortege-enfants', 'avant'
  from p returning id
),
d_deplacements as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Déplacements des personnes clés', 'deplacements-personnes-cles', 'avant'
  from p returning id
),
d_dimanche as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Dimanche & récupération', 'dimanche-recuperation', null
  from p returning id
),
d_lundi as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Journée du lundi', 'journee-lundi', null
  from p returning id
),
d_fin as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Fin de soirée', 'fin-soiree', null
  from p returning id
),
d_apres as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Après-mariage', 'apres-mariage', 'apres'
  from p returning id
),

-- ─── MISSIONS ────────────────────────────────────────────────────────────────
m1 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_org.id,
    'Identifier les personnes nécessitant un accompagnement opérationnel'
  from d_org returning id
),
m2 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_org.id,
    'Désigner les référents de confort et d''assistance'
  from d_org returning id
),
m3 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_org.id,
    'Préparer les besoins essentiels par journée'
  from d_org returning id
),
m4 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_maries.id,
    'Préparer le confort de Sarah pendant les quatre jours'
  from d_maries returning id
),
m5 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_maries.id,
    'Préparer le confort de Jordan pendant les quatre jours'
  from d_maries returning id
),
m6 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_maries.id,
    'Protéger des temps de pause pour les mariés'
  from d_maries returning id
),
m7 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_hydratation.id,
    'Préparer le dispositif d''hydratation des personnes mobilisées'
  from d_hydratation returning id
),
m8 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_hydratation.id,
    'Anticiper la chaleur de fin juin'
  from d_hydratation returning id
),
m9 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_hydratation.id,
    'Surveiller le confort lié à la chaleur'
  from d_hydratation returning id
),
m10 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_repas.id,
    'Prévoir les repas et collations des personnes clés'
  from d_repas returning id
),
m11 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_repas.id,
    'S''assurer que les personnes clés peuvent manger'
  from d_repas returning id
),
m12 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_espaces.id,
    'Définir les espaces de préparation des mariés'
  from d_espaces returning id
),
m13 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_espaces.id,
    'Prévoir un espace de retrait à Ostara'
  from d_espaces returning id
),
m14 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_effets.id,
    'Organiser la gestion des effets personnels des mariés'
  from d_effets returning id
),
m15 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_effets.id,
    'Sécuriser les effets personnels pendant les séquences'
  from d_effets returning id
),
m16 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_kits.id,
    'Préparer un kit de confort général'
  from d_kits returning id
),
m17 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_kits.id,
    'Préparer un kit spécifique pour la réception du lundi'
  from d_kits returning id
),
m18 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_parents.id,
    'Préparer l''accompagnement des parents'
  from d_parents returning id
),
m19 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_parents.id,
    'Préparer l''accompagnement des témoins'
  from d_parents returning id
),
m20 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_cortege.id,
    'Préparer le confort du cortège'
  from d_cortege returning id
),
m21 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_cortege.id,
    'Organiser l''accompagnement des enfants du cortège'
  from d_cortege returning id
),
m22 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_deplacements.id,
    'Sécuriser les déplacements des mariés'
  from d_deplacements returning id
),
m23 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_deplacements.id,
    'Préparer les déplacements des parents, témoins et cortège'
  from d_deplacements returning id
),
m24 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_dimanche.id,
    'Préserver le rythme du dimanche avant le khane'
  from d_dimanche returning id
),
m25 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_dimanche.id,
    'Organiser la récupération avant la journée du lundi'
  from d_dimanche returning id
),
m26 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_lundi.id,
    'Préparer le confort sur la longue journée du lundi'
  from d_lundi returning id
),
m27 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_lundi.id,
    'Accompagner les mariés pendant la réception'
  from d_lundi returning id
),
m28 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_fin.id,
    'Préparer la fin de soirée des mariés'
  from d_fin returning id
),
m29 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_fin.id,
    'Accompagner le départ des mariés'
  from d_fin returning id
),
m30 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_apres.id,
    'Récupérer les effets personnels et éléments de confort'
  from d_apres returning id
),
m31 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_apres.id,
    'Clôturer l''accompagnement des personnes mobilisées'
  from d_apres returning id
),

-- ─── CHECKLISTS ──────────────────────────────────────────────────────────────
cl1 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m1.id,
    'Identifier les personnes nécessitant un accompagnement opérationnel'
  from m1 returning id
),
cl2 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m2.id,
    'Désigner les référents de confort et d''assistance'
  from m2 returning id
),
cl3 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m3.id,
    'Préparer les besoins essentiels par journée'
  from m3 returning id
),
cl4 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m4.id,
    'Préparer le confort de Sarah pendant les quatre jours'
  from m4 returning id
),
cl5 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m5.id,
    'Préparer le confort de Jordan pendant les quatre jours'
  from m5 returning id
),
cl6 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m6.id,
    'Protéger des temps de pause pour les mariés'
  from m6 returning id
),
cl7 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m7.id,
    'Préparer le dispositif d''hydratation des personnes mobilisées'
  from m7 returning id
),
cl8 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m8.id,
    'Anticiper la chaleur de fin juin'
  from m8 returning id
),
cl9 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m9.id,
    'Surveiller le confort lié à la chaleur'
  from m9 returning id
),
cl10 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m10.id,
    'Prévoir les repas et collations des personnes clés'
  from m10 returning id
),
cl11 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m11.id,
    'S''assurer que les personnes clés peuvent manger'
  from m11 returning id
),
cl12 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m12.id,
    'Définir les espaces de préparation des mariés'
  from m12 returning id
),
cl13 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m13.id,
    'Prévoir un espace de retrait à Ostara'
  from m13 returning id
),
cl14 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m14.id,
    'Organiser la gestion des effets personnels des mariés'
  from m14 returning id
),
cl15 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m15.id,
    'Sécuriser les effets personnels pendant les séquences'
  from m15 returning id
),
cl16 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m16.id,
    'Préparer un kit de confort général'
  from m16 returning id
),
cl17 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m17.id,
    'Préparer un kit spécifique pour la réception du lundi'
  from m17 returning id
),
cl18 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m18.id,
    'Préparer l''accompagnement des parents'
  from m18 returning id
),
cl19 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m19.id,
    'Préparer l''accompagnement des témoins'
  from m19 returning id
),
cl20 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m20.id,
    'Préparer le confort du cortège'
  from m20 returning id
),
cl21 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m21.id,
    'Organiser l''accompagnement des enfants du cortège'
  from m21 returning id
),
cl22 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m22.id,
    'Sécuriser les déplacements des mariés'
  from m22 returning id
),
cl23 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m23.id,
    'Préparer les déplacements des parents, témoins et cortège'
  from m23 returning id
),
cl24 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m24.id,
    'Préserver le rythme du dimanche avant le khane'
  from m24 returning id
),
cl25 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m25.id,
    'Organiser la récupération avant la journée du lundi'
  from m25 returning id
),
cl26 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m26.id,
    'Préparer le confort sur la longue journée du lundi'
  from m26 returning id
),
cl27 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m27.id,
    'Accompagner les mariés pendant la réception'
  from m27 returning id
),
cl28 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m28.id,
    'Préparer la fin de soirée des mariés'
  from m28 returning id
),
cl29 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m29.id,
    'Accompagner le départ des mariés'
  from m29 returning id
),
cl30 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m30.id,
    'Récupérer les effets personnels et éléments de confort'
  from m30 returning id
),
cl31 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m31.id,
    'Clôturer l''accompagnement des personnes mobilisées'
  from m31 returning id
),

-- ─── CHECKLIST ITEMS ─────────────────────────────────────────────────────────
_cl1_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl1.id, v.label, 'todo', false
  from cl1 cross join (values
    ('Lister Sarah et Jordan comme personnes prioritaires à accompagner.'),
    ('Identifier les parents mobilisés sur plusieurs temps du mariage.'),
    ('Identifier les témoins ayant des responsabilités opérationnelles.'),
    ('Identifier les membres du cortège ayant des contraintes particulières.'),
    ('Identifier les enfants du cortège nécessitant un adulte référent.'),
    ('Identifier les personnes fortement mobilisées pendant plusieurs journées.'),
    ('Distinguer les besoins d''accompagnement des besoins généraux des invités.')
  ) as v(label) returning id
),
_cl2_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl2.id, v.label, 'todo', false
  from cl2 cross join (values
    ('Désigner une personne pouvant assister Sarah sans la solliciter inutilement.'),
    ('Désigner une personne pouvant assister Jordan.'),
    ('Identifier un référent pour les parents si nécessaire.'),
    ('Identifier un référent pour le cortège.'),
    ('Identifier un adulte référent pour les enfants du cortège.'),
    ('Éviter de confier trop de rôles simultanés à la même personne.'),
    ('Partager les coordonnées utiles entre les référents.')
  ) as v(label) returning id
),
_cl3_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl3.id, v.label, 'todo', false
  from cl3 cross join (values
    ('Lister les besoins de confort spécifiques au vendredi.'),
    ('Lister les besoins de confort spécifiques au samedi.'),
    ('Lister les besoins de confort spécifiques au dimanche.'),
    ('Lister les besoins de confort spécifiques au lundi.'),
    ('Identifier les éléments pouvant rester communs aux quatre jours.'),
    ('Identifier les éléments devant être déplacés d''un lieu à l''autre.'),
    ('Attribuer la responsabilité de préparation et de transport.')
  ) as v(label) returning id
),
_cl4_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl4.id, v.label, 'todo', false
  from cl4 cross join (values
    ('Prévoir de l''eau facilement accessible.'),
    ('Prévoir une collation simple lors des longues périodes de préparation.'),
    ('Prévoir une solution pour s''asseoir et se reposer lorsque possible.'),
    ('Prévoir les produits de retouche personnels utiles.'),
    ('Prévoir un accès facile aux chaussures de secours si nécessaire.'),
    ('Prévoir un contenant pour les effets personnels essentiels.'),
    ('Identifier la personne pouvant gérer les demandes pratiques à sa place.')
  ) as v(label) returning id
),
_cl5_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl5.id, v.label, 'todo', false
  from cl5 cross join (values
    ('Prévoir de l''eau facilement accessible.'),
    ('Prévoir une collation simple lors des longues périodes de préparation.'),
    ('Prévoir une solution pour se reposer lorsque possible.'),
    ('Prévoir les produits de retouche personnels utiles.'),
    ('Prévoir une chemise ou solution de rechange pour les longues journées si nécessaire.'),
    ('Prévoir un contenant pour les effets personnels essentiels.'),
    ('Identifier la personne pouvant gérer les demandes pratiques à sa place.')
  ) as v(label) returning id
),
_cl6_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl6.id, v.label, 'todo', false
  from cl6 cross join (values
    ('Identifier les moments où Sarah et Jordan pourront souffler quelques minutes.'),
    ('Prévoir une pause avant les grandes cérémonies lorsque le planning le permet.'),
    ('Prévoir un temps de récupération entre l''église et la réception si possible.'),
    ('Éviter d''occuper chaque minute disponible par des photos ou sollicitations.'),
    ('Prévoir un moment permettant aux mariés de manger réellement.'),
    ('Informer la coordination des temps de pause à protéger.'),
    ('Adapter les pauses en fonction du déroulement réel.')
  ) as v(label) returning id
),
_cl7_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl7.id, v.label, 'todo', false
  from cl7 cross join (values
    ('Identifier les personnes devant disposer d''eau en permanence.'),
    ('Prévoir des bouteilles ou contenants facilement transportables.'),
    ('Prévoir de l''eau sur les lieux de préparation.'),
    ('Prévoir de l''eau pendant les déplacements importants.'),
    ('Prévoir de l''eau à proximité des espaces d''attente.'),
    ('Vérifier le réassort pendant les journées longues.'),
    ('Éviter que les personnes mobilisées attendent le service invité pour pouvoir boire.')
  ) as v(label) returning id
),
_cl8_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl8.id, v.label, 'todo', false
  from cl8 cross join (values
    ('Identifier les séquences comportant des temps en extérieur.'),
    ('Identifier les espaces ombragés ou frais disponibles.'),
    ('Prévoir des éventails ou accessoires de confort si utiles.'),
    ('Prévoir de quoi se rafraîchir discrètement.'),
    ('Limiter les attentes prolongées au soleil.'),
    ('Prévoir des adaptations pour les tenues chaudes ou formelles.'),
    ('Informer la coordination des points de vigilance liés à la chaleur.')
  ) as v(label) returning id
),
_cl9_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl9.id, v.label, 'todo', false
  from cl9 cross join (values
    ('Vérifier régulièrement que les mariés boivent.'),
    ('Vérifier que les parents et témoins mobilisés ont accès à de l''eau.'),
    ('Faire déplacer une attente vers une zone plus fraîche lorsque possible.'),
    ('Éviter les longues stations debout inutiles.'),
    ('Adapter les temps d''attente si les conditions deviennent inconfortables.'),
    ('Alerter la coordination en cas de besoin d''ajustement.')
  ) as v(label) returning id
),
_cl10_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl10.id, v.label, 'todo', false
  from cl10 cross join (values
    ('Identifier les personnes présentes très tôt lors des préparatifs.'),
    ('Identifier les personnes qui ne pourront pas suivre le rythme normal du repas.'),
    ('Prévoir une collation pour les préparatifs du vendredi.'),
    ('Prévoir une collation ou repas adapté avant les temps importants du lundi.'),
    ('Prévoir de quoi manger pour les personnes mobilisées pendant l''installation.'),
    ('Prévoir une solution pour les personnes mobilisées pendant le spectacle ou les animations.'),
    ('Vérifier que les repas prestataires sont gérés dans le pôle restauration lorsqu''ils sont contractuels.')
  ) as v(label) returning id
),
_cl11_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl11.id, v.label, 'todo', false
  from cl11 cross join (values
    ('Vérifier que Sarah et Jordan disposent d''un moment pour manger.'),
    ('Vérifier que les parents mobilisés peuvent prendre leur repas.'),
    ('Vérifier que les témoins ayant des responsabilités peuvent manger.'),
    ('Relayer temporairement une responsabilité si elle empêche une personne de se restaurer.'),
    ('Mettre de côté une portion lorsque le déroulement empêche de manger au moment prévu.'),
    ('Éviter que les personnes clés terminent une longue journée sans repas.')
  ) as v(label) returning id
),
_cl12_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl12.id, v.label, 'todo', false
  from cl12 cross join (values
    ('Identifier l''espace de préparation de Sarah pour les journées concernées.'),
    ('Identifier l''espace de préparation de Jordan pour les journées concernées.'),
    ('Vérifier la présence de sièges.'),
    ('Vérifier l''accès à un miroir.'),
    ('Vérifier l''accès à des prises électriques.'),
    ('Vérifier l''accès à des sanitaires.'),
    ('Prévoir suffisamment d''espace pour les tenues et accessoires.'),
    ('Limiter les passages inutiles dans les espaces de préparation.')
  ) as v(label) returning id
),
_cl13_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl13.id, v.label, 'todo', false
  from cl13 cross join (values
    ('Identifier un espace calme accessible aux mariés.'),
    ('Vérifier qu''il permet de déposer quelques effets personnels.'),
    ('Vérifier qu''il peut servir aux changements de tenue si nécessaire.'),
    ('Prévoir de l''eau dans cet espace.'),
    ('Prévoir quelques éléments de retouche.'),
    ('Limiter son accès aux personnes utiles.'),
    ('Informer les référents de son emplacement.')
  ) as v(label) returning id
),
_cl14_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl14.id, v.label, 'todo', false
  from cl14 cross join (values
    ('Lister les objets devant rester accessibles à Sarah.'),
    ('Lister les objets devant rester accessibles à Jordan.'),
    ('Prévoir un sac ou contenant identifié pour chacun.'),
    ('Définir qui garde les téléphones lorsqu''ils ne sont pas utilisés.'),
    ('Définir qui garde les clés et moyens de paiement si nécessaire.'),
    ('Prévoir les chargeurs et batteries externes.'),
    ('Éviter les transferts répétés d''effets personnels entre plusieurs personnes.')
  ) as v(label) returning id
),
_cl15_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl15.id, v.label, 'todo', false
  from cl15 cross join (values
    ('Vérifier que les sacs personnels suivent les bons déplacements.'),
    ('Ne pas laisser les objets de valeur dans un espace ouvert.'),
    ('Rendre rapidement un objet demandé par les mariés.'),
    ('Vérifier les effets avant de quitter chaque lieu.'),
    ('Transférer les affaires vers le lieu suivant lorsque nécessaire.'),
    ('Regrouper les objets en fin de journée.')
  ) as v(label) returning id
),
_cl16_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl16.id, v.label, 'todo', false
  from cl16 cross join (values
    ('Prévoir des mouchoirs.'),
    ('Prévoir des lingettes.'),
    ('Prévoir des pansements classiques.'),
    ('Prévoir des pansements pour frottements de chaussures.'),
    ('Prévoir du gel hydroalcoolique.'),
    ('Prévoir quelques protections hygiéniques.'),
    ('Prévoir un petit nécessaire de couture en coordination avec le pôle tenues.'),
    ('Prévoir un rouleau anti-peluches.'),
    ('Prévoir des accessoires simples pour cheveux si utiles.'),
    ('Conditionner le kit dans un contenant facilement identifiable.')
  ) as v(label) returning id
),
_cl17_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl17.id, v.label, 'todo', false
  from cl17 cross join (values
    ('Prévoir les produits de retouche nécessaires aux mariés.'),
    ('Prévoir les chaussures de secours prévues.'),
    ('Prévoir une chemise ou élément de rechange si retenu.'),
    ('Prévoir de quoi rafraîchir les mariés.'),
    ('Prévoir une petite collation facilement consommable.'),
    ('Prévoir des chargeurs ou batteries externes.'),
    ('Prévoir les éléments nécessaires aux changements de tenue.'),
    ('Déposer le kit dans l''espace de retrait prévu à Ostara.')
  ) as v(label) returning id
),
_cl18_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl18.id, v.label, 'todo', false
  from cl18 cross join (values
    ('Identifier les horaires auxquels les parents doivent être présents.'),
    ('Vérifier qu''ils connaissent leurs déplacements entre les lieux.'),
    ('Identifier les moments où leur présence est indispensable.'),
    ('Éviter de leur attribuer des tâches logistiques pendant les moments familiaux importants.'),
    ('Prévoir de l''eau et des temps de pause.'),
    ('Identifier une personne pouvant répondre à leurs questions opérationnelles.'),
    ('Prévoir leur départ anticipé le dimanche lorsque nécessaire pour le khane.')
  ) as v(label) returning id
),
_cl19_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl19.id, v.label, 'todo', false
  from cl19 cross join (values
    ('Clarifier leurs responsabilités réelles sur chaque journée.'),
    ('Distinguer leur rôle symbolique de leurs éventuelles missions opérationnelles.'),
    ('Éviter de surcharger les témoins de tâches.'),
    ('Prévoir leurs horaires de rendez-vous.'),
    ('Prévoir leurs temps de pause et de repas.'),
    ('S''assurer qu''ils disposent des informations nécessaires sans recevoir tout le dossier d''organisation.'),
    ('Prévoir une personne de relais si un témoin doit participer à une cérémonie ou une animation.')
  ) as v(label) returning id
),
_cl20_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl20.id, v.label, 'todo', false
  from cl20 cross join (values
    ('Communiquer les horaires de présence nécessaires.'),
    ('Prévoir un point de rassemblement clair.'),
    ('Prévoir de l''eau pendant les temps d''attente.'),
    ('Limiter le temps passé en tenue formelle avant les cérémonies.'),
    ('Prévoir une zone où déposer les effets personnels.'),
    ('Prévoir les retouches simples avant les entrées.'),
    ('Informer le cortège des temps où sa présence est réellement nécessaire.')
  ) as v(label) returning id
),
_cl21_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl21.id, v.label, 'todo', false
  from cl21 cross join (values
    ('Désigner un adulte référent pour chaque enfant ou pour les deux enfants.'),
    ('Prévoir de l''eau et une collation adaptée.'),
    ('Prévoir une activité calme pendant les attentes longues.'),
    ('Prévoir une tenue ou solution de secours si nécessaire.'),
    ('Identifier un espace permettant de se reposer.'),
    ('Prévoir une solution si un enfant ne souhaite plus participer au moment prévu.'),
    ('Ne pas faire reposer le déroulement d''une cérémonie sur la participation obligatoire d''un enfant.')
  ) as v(label) returning id
),
_cl22_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl22.id, v.label, 'todo', false
  from cl22 cross join (values
    ('Lister les trajets des mariés sur les quatre jours.'),
    ('Confirmer le chauffeur ou moyen de transport prévu pour chaque trajet important.'),
    ('Définir les horaires de prise en charge.'),
    ('Prévoir une marge de circulation.'),
    ('Transmettre les adresses exactes au chauffeur.'),
    ('Prévoir le transport des effets personnels indispensables.'),
    ('Identifier une solution de secours en cas de problème de véhicule.')
  ) as v(label) returning id
),
_cl23_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl23.id, v.label, 'todo', false
  from cl23 cross join (values
    ('Identifier les personnes ayant besoin d''une solution de déplacement coordonnée.'),
    ('Vérifier que chacun connaît le lieu suivant.'),
    ('Prévoir les départs anticipés du dimanche vers le khane.'),
    ('Vérifier les déplacements entre l''église et Ostara.'),
    ('Éviter que les personnes ayant un rôle essentiel dépendent d''un trajet incertain.'),
    ('Partager les horaires de départ réellement nécessaires.')
  ) as v(label) returning id
),
_cl24_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl24.id, v.label, 'todo', false
  from cl24 cross join (values
    ('Éviter de programmer une activité trop lourde avant le départ au khane.'),
    ('Définir l''heure à laquelle les mariés cessent les activités précédentes.'),
    ('Prévoir un temps de préparation avant le départ.'),
    ('Prévoir un repas ou une collation compatible avec l''horaire.'),
    ('Prévoir une marge de déplacement suffisante.'),
    ('Vérifier que parents et témoins concernés connaissent leur heure de départ.'),
    ('Protéger l''énergie des mariés en vue du lundi.')
  ) as v(label) returning id
),
_cl25_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl25.id, v.label, 'todo', false
  from cl25 cross join (values
    ('Éviter une fin de soirée tardive inutile le dimanche.'),
    ('Vérifier que les affaires du lundi sont déjà prêtes.'),
    ('Mettre les téléphones et batteries en charge.'),
    ('Préparer l''eau et les collations du lendemain.'),
    ('Vérifier les horaires de réveil et de préparation.'),
    ('Limiter les sollicitations organisationnelles des mariés en fin de journée.'),
    ('Confirmer que les référents disposent des informations nécessaires pour le lundi.')
  ) as v(label) returning id
),
_cl26_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl26.id, v.label, 'todo', false
  from cl26 cross join (values
    ('Construire une journée réaliste entre préparation, église, trajet et réception.'),
    ('Prévoir des temps pour boire et manger avant la cérémonie.'),
    ('Prévoir une pause après la bénédiction si le conducteur le permet.'),
    ('Prévoir l''accès à l''espace de retrait à Ostara.'),
    ('Prévoir les changements de tenue éventuels.'),
    ('Prévoir une collation avant ou après le spectacle selon l''horaire.'),
    ('Prévoir des chaussures plus confortables pour la soirée si souhaité.'),
    ('Prévoir un relais pour limiter les sollicitations directes des mariés.')
  ) as v(label) returning id
),
_cl27_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl27.id, v.label, 'todo', false
  from cl27 cross join (values
    ('Veiller à ce que les mariés disposent régulièrement d''eau.'),
    ('Protéger leurs moments de repas.'),
    ('Centraliser les demandes pratiques auprès des référents.'),
    ('Prévenir suffisamment tôt les mariés avant un temps fort.'),
    ('Faciliter les passages vers l''espace de retrait.'),
    ('Préparer les changements de tenue avant qu''ils ne quittent la salle.'),
    ('Limiter les interruptions pendant leurs rares temps de pause.'),
    ('Alerter la coordination si le rythme devient trop dense.')
  ) as v(label) returning id
),
_cl28_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl28.id, v.label, 'todo', false
  from cl28 cross join (values
    ('Définir le moyen de transport de fin de soirée.'),
    ('Identifier qui récupère les effets personnels.'),
    ('Identifier qui récupère les tenues ou accessoires laissés dans l''espace de retrait.'),
    ('Prévoir que les mariés n''aient pas à gérer le rangement général.'),
    ('Prévoir de l''eau pour le départ.'),
    ('Vérifier que les clés et téléphones sont récupérés.'),
    ('Définir qui prend en charge les éléments devant rester sur place.')
  ) as v(label) returning id
),
_cl29_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl29.id, v.label, 'todo', false
  from cl29 cross join (values
    ('Prévenir le chauffeur ou conducteur au moment approprié.'),
    ('Rassembler les effets personnels des mariés.'),
    ('Vérifier les objets de valeur.'),
    ('Vérifier que les éléments nécessaires pour le lendemain sont récupérés.'),
    ('Accompagner les mariés jusqu''au véhicule.'),
    ('Confirmer la prise en charge des tâches restantes par les responsables désignés.')
  ) as v(label) returning id
),
_cl30_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl30.id, v.label, 'todo', false
  from cl30 cross join (values
    ('Regrouper les sacs et effets personnels restants.'),
    ('Récupérer les kits de confort.'),
    ('Récupérer les chaussures et vêtements de rechange.'),
    ('Identifier les objets appartenant aux parents, témoins ou cortège.'),
    ('Restituer les objets retrouvés à leurs propriétaires.'),
    ('Nettoyer ou ranger les éléments réutilisables.')
  ) as v(label) returning id
),
_cl31_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl31.id, v.label, 'todo', false
  from cl31 cross join (values
    ('Vérifier qu''aucun effet personnel important n''est manquant.'),
    ('Identifier les éventuels frais avancés par un référent.'),
    ('Transmettre ces frais au suivi financier si nécessaire.'),
    ('Récupérer les informations utiles sur les objets oubliés.'),
    ('Remercier les personnes ayant assuré les rôles d''accompagnement.'),
    ('Archiver les informations utiles pour le bilan d''organisation.')
  ) as v(label) returning id
),

-- ─── SÉQUENCES (groupes partagés) ────────────────────────────────────────────
sq_all_7 as materialized (
  select id from _20270628_event_sequences
  where name in (
    'Mariage civil',
    'Goûter d''honneur',
    'Moment convivial entre amis',
    'Pique-nique partagé',
    'Bénédiction au khane',
    'Bénédiction à l''église',
    'Célébration de mariage'
  )
),
sq_celebr as materialized (
  select id from _20270628_event_sequences
  where name = 'Célébration de mariage'
),
sq_eglise_celebr as materialized (
  select id from _20270628_event_sequences
  where name in ('Bénédiction à l''église', 'Célébration de mariage')
),

-- ─── LIENS MISSION ↔ SÉQUENCE ────────────────────────────────────────────────
-- m1–m11, m14–m16, m18–m19, m22–m23 → all 7
_ms1 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m1.id, sq_all_7.id from m1 cross join sq_all_7 returning mission_id
),
_ms2 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m2.id, sq_all_7.id from m2 cross join sq_all_7 returning mission_id
),
_ms3 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m3.id, sq_all_7.id from m3 cross join sq_all_7 returning mission_id
),
_ms4 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m4.id, sq_all_7.id from m4 cross join sq_all_7 returning mission_id
),
_ms5 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m5.id, sq_all_7.id from m5 cross join sq_all_7 returning mission_id
),
_ms6 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m6.id, sq_all_7.id from m6 cross join sq_all_7 returning mission_id
),
_ms7 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m7.id, sq_all_7.id from m7 cross join sq_all_7 returning mission_id
),
_ms8 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m8.id, sq_all_7.id from m8 cross join sq_all_7 returning mission_id
),
_ms9 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m9.id, sq_all_7.id from m9 cross join sq_all_7 returning mission_id
),
_ms10 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m10.id, sq_all_7.id from m10 cross join sq_all_7 returning mission_id
),
_ms11 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m11.id, sq_all_7.id from m11 cross join sq_all_7 returning mission_id
),
-- m12 → Civil + Khane + Église + Célébration
_ms12 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m12.id, s.id
  from m12
  cross join (
    select id from _20270628_event_sequences
    where name in (
      'Mariage civil',
      'Bénédiction au khane',
      'Bénédiction à l''église',
      'Célébration de mariage'
    )
  ) s
  returning mission_id
),
-- m13 → Célébration only
_ms13 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m13.id, sq_celebr.id from m13 cross join sq_celebr returning mission_id
),
_ms14 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m14.id, sq_all_7.id from m14 cross join sq_all_7 returning mission_id
),
_ms15 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m15.id, sq_all_7.id from m15 cross join sq_all_7 returning mission_id
),
_ms16 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m16.id, sq_all_7.id from m16 cross join sq_all_7 returning mission_id
),
-- m17 → Célébration only
_ms17 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m17.id, sq_celebr.id from m17 cross join sq_celebr returning mission_id
),
_ms18 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m18.id, sq_all_7.id from m18 cross join sq_all_7 returning mission_id
),
_ms19 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m19.id, sq_all_7.id from m19 cross join sq_all_7 returning mission_id
),
-- m20 → Civil + Église + Célébration
_ms20 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m20.id, s.id
  from m20
  cross join (
    select id from _20270628_event_sequences
    where name in (
      'Mariage civil',
      'Bénédiction à l''église',
      'Célébration de mariage'
    )
  ) s
  returning mission_id
),
-- m21 → Église + Célébration
_ms21 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m21.id, sq_eglise_celebr.id from m21 cross join sq_eglise_celebr returning mission_id
),
_ms22 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m22.id, sq_all_7.id from m22 cross join sq_all_7 returning mission_id
),
_ms23 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m23.id, sq_all_7.id from m23 cross join sq_all_7 returning mission_id
),
-- m24 → Pique-nique + Khane
_ms24 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m24.id, s.id
  from m24
  cross join (
    select id from _20270628_event_sequences
    where name in ('Pique-nique partagé', 'Bénédiction au khane')
  ) s
  returning mission_id
),
-- m25 → Khane only
_ms25 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m25.id, s.id
  from m25
  cross join (select id from _20270628_event_sequences where name = 'Bénédiction au khane') s
  returning mission_id
),
-- m26 → Église + Célébration
_ms26 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m26.id, sq_eglise_celebr.id from m26 cross join sq_eglise_celebr returning mission_id
),
-- m27 → Célébration only
_ms27 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m27.id, sq_celebr.id from m27 cross join sq_celebr returning mission_id
),
-- m28 → Célébration only
_ms28 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m28.id, sq_celebr.id from m28 cross join sq_celebr returning mission_id
),
-- m29 → Célébration only
_ms29 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m29.id, sq_celebr.id from m29 cross join sq_celebr returning mission_id
)
-- m30, m31 → aucune séquence

select
  (select count(*) from p)                        as poles,
  (select count(*) from d_org)
  + (select count(*) from d_maries)
  + (select count(*) from d_hydratation)
  + (select count(*) from d_repas)
  + (select count(*) from d_espaces)
  + (select count(*) from d_effets)
  + (select count(*) from d_kits)
  + (select count(*) from d_parents)
  + (select count(*) from d_cortege)
  + (select count(*) from d_deplacements)
  + (select count(*) from d_dimanche)
  + (select count(*) from d_lundi)
  + (select count(*) from d_fin)
  + (select count(*) from d_apres)               as domaines,
  (select count(*) from m1)
  + (select count(*) from m2)
  + (select count(*) from m3)
  + (select count(*) from m4)
  + (select count(*) from m5)
  + (select count(*) from m6)
  + (select count(*) from m7)
  + (select count(*) from m8)
  + (select count(*) from m9)
  + (select count(*) from m10)
  + (select count(*) from m11)
  + (select count(*) from m12)
  + (select count(*) from m13)
  + (select count(*) from m14)
  + (select count(*) from m15)
  + (select count(*) from m16)
  + (select count(*) from m17)
  + (select count(*) from m18)
  + (select count(*) from m19)
  + (select count(*) from m20)
  + (select count(*) from m21)
  + (select count(*) from m22)
  + (select count(*) from m23)
  + (select count(*) from m24)
  + (select count(*) from m25)
  + (select count(*) from m26)
  + (select count(*) from m27)
  + (select count(*) from m28)
  + (select count(*) from m29)
  + (select count(*) from m30)
  + (select count(*) from m31)                   as missions,
  (select count(*) from _cl1_items)
  + (select count(*) from _cl2_items)
  + (select count(*) from _cl3_items)
  + (select count(*) from _cl4_items)
  + (select count(*) from _cl5_items)
  + (select count(*) from _cl6_items)
  + (select count(*) from _cl7_items)
  + (select count(*) from _cl8_items)
  + (select count(*) from _cl9_items)
  + (select count(*) from _cl10_items)
  + (select count(*) from _cl11_items)
  + (select count(*) from _cl12_items)
  + (select count(*) from _cl13_items)
  + (select count(*) from _cl14_items)
  + (select count(*) from _cl15_items)
  + (select count(*) from _cl16_items)
  + (select count(*) from _cl17_items)
  + (select count(*) from _cl18_items)
  + (select count(*) from _cl19_items)
  + (select count(*) from _cl20_items)
  + (select count(*) from _cl21_items)
  + (select count(*) from _cl22_items)
  + (select count(*) from _cl23_items)
  + (select count(*) from _cl24_items)
  + (select count(*) from _cl25_items)
  + (select count(*) from _cl26_items)
  + (select count(*) from _cl27_items)
  + (select count(*) from _cl28_items)
  + (select count(*) from _cl29_items)
  + (select count(*) from _cl30_items)
  + (select count(*) from _cl31_items)           as checklist_items,
  (select count(*) from _ms1)
  + (select count(*) from _ms2)
  + (select count(*) from _ms3)
  + (select count(*) from _ms4)
  + (select count(*) from _ms5)
  + (select count(*) from _ms6)
  + (select count(*) from _ms7)
  + (select count(*) from _ms8)
  + (select count(*) from _ms9)
  + (select count(*) from _ms10)
  + (select count(*) from _ms11)
  + (select count(*) from _ms12)
  + (select count(*) from _ms13)
  + (select count(*) from _ms14)
  + (select count(*) from _ms15)
  + (select count(*) from _ms16)
  + (select count(*) from _ms17)
  + (select count(*) from _ms18)
  + (select count(*) from _ms19)
  + (select count(*) from _ms20)
  + (select count(*) from _ms21)
  + (select count(*) from _ms22)
  + (select count(*) from _ms23)
  + (select count(*) from _ms24)
  + (select count(*) from _ms25)
  + (select count(*) from _ms26)
  + (select count(*) from _ms27)
  + (select count(*) from _ms28)
  + (select count(*) from _ms29)                 as mission_sequences;
