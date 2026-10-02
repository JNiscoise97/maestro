-- seed_ceremonies_animation_mariage.sql
-- Pôle "Cérémonies & animation" – script de seed complet (sort_order = 70)

delete from _20270628_poles where name = 'Cérémonies & animation';

with
-- ─── PÔLE ────────────────────────────────────────────────────────────────────
p as materialized (
  insert into _20270628_poles (id, name, sort_order)
  values (gen_random_uuid(), 'Cérémonies & animation', 70)
  returning id
),

-- ─── DOMAINES ────────────────────────────────────────────────────────────────
d_archi as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Architecture des temps forts', 'architecture-temps-forts', 'avant'
  from p returning id
),
d_civil as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Mariage civil', 'mariage-civil', null
  from p returning id
),
d_khane as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Bénédiction au khane', 'benediction-khane', null
  from p returning id
),
d_eglise as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Bénédiction à l''église', 'benediction-eglise', null
  from p returning id
),
d_musique as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Musique & contenus cérémoniels', 'musique-contenus-ceremoniels', 'avant'
  from p returning id
),
d_samedi as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Animations du samedi', 'animations-samedi', null
  from p returning id
),
d_comedie as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Comédie musicale personnalisée', 'comedie-musicale-personnalisee', 'avant'
  from p returning id
),
d_recept as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Temps forts de la réception', 'temps-forts-reception', 'avant'
  from p returning id
),
d_tech as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Technique spectacle & animation', 'technique-spectacle-animation', null
  from p returning id
),
d_exec as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Exécution des temps forts', 'execution-temps-forts', null
  from p returning id
),

-- ─── MISSIONS ────────────────────────────────────────────────────────────────
m1 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_archi.id,
    'Définir les temps forts des quatre jours'
  from d_archi returning id
),
m2 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_archi.id,
    'Construire le déroulé détaillé des cérémonies'
  from d_archi returning id
),
m3 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_civil.id,
    'Préparer le déroulement de la cérémonie civile'
  from d_civil returning id
),
m4 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_civil.id,
    'Préparer les éléments nécessaires à la cérémonie civile'
  from d_civil returning id
),
m5 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_civil.id,
    'Coordonner les moments clés de la cérémonie civile'
  from d_civil returning id
),
m6 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_khane.id,
    'Préparer la bénédiction au khane'
  from d_khane returning id
),
m7 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_khane.id,
    'Préparer la transition vers le khane'
  from d_khane returning id
),
m8 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_khane.id,
    'Coordonner l''arrivée et la bénédiction au khane'
  from d_khane returning id
),
m9 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_eglise.id,
    'Construire la célébration religieuse à l''église'
  from d_eglise returning id
),
m10 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_eglise.id,
    'Préparer les intervenants de la célébration'
  from d_eglise returning id
),
m11 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_eglise.id,
    'Préparer les entrées, placements et sortie'
  from d_eglise returning id
),
m12 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_eglise.id,
    'Organiser une répétition de la cérémonie'
  from d_eglise returning id
),
m13 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_eglise.id,
    'Coordonner la célébration à l''église'
  from d_eglise returning id
),
m14 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_musique.id,
    'Définir les musiques des cérémonies'
  from d_musique returning id
),
m15 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_musique.id,
    'Préparer les fichiers et supports audio'
  from d_musique returning id
),
m16 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_samedi.id,
    'Construire le programme du moment convivial'
  from d_samedi returning id
),
m17 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_samedi.id,
    'Préparer les jeux et le casino fictif'
  from d_samedi returning id
),
m18 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_samedi.id,
    'Lancer et rythmer les animations du samedi'
  from d_samedi returning id
),
m19 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_comedie.id,
    'Définir le concept narratif de la comédie musicale'
  from d_comedie returning id
),
m20 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_comedie.id,
    'Écrire le spectacle'
  from d_comedie returning id
),
m21 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_comedie.id,
    'Construire l''univers musical du spectacle'
  from d_comedie returning id
),
m22 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_comedie.id,
    'Constituer la distribution du spectacle'
  from d_comedie returning id
),
m23 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_comedie.id,
    'Planifier et réaliser les répétitions'
  from d_comedie returning id
),
m24 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_comedie.id,
    'Préparer costumes, accessoires et éléments de scène'
  from d_comedie returning id
),
m25 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_recept.id,
    'Définir les interventions et prises de parole'
  from d_recept returning id
),
m26 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_recept.id,
    'Préparer la première danse'
  from d_recept returning id
),
m27 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_recept.id,
    'Construire la transition spectacle vers première danse'
  from d_recept returning id
),
m28 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_recept.id,
    'Définir les autres animations de la réception'
  from d_recept returning id
),
m29 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_tech.id,
    'Définir les besoins techniques'
  from d_tech returning id
),
m30 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_tech.id,
    'Effectuer les balances et tests techniques'
  from d_tech returning id
),
m31 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_tech.id,
    'Préparer les solutions de secours techniques'
  from d_tech returning id
),
m32 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_exec.id,
    'Piloter les cérémonies selon le conducteur'
  from d_exec returning id
),
m33 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_exec.id,
    'Récupérer le matériel et les contenus'
  from d_exec returning id
),
m34 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_exec.id,
    'Archiver les contenus des cérémonies et du spectacle'
  from d_exec returning id
),

-- ─── CHECKLISTS (NO sort_order) ──────────────────────────────────────────────
cl1 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m1.id,
    'Définir les temps forts des quatre jours'
  from m1 returning id
),
cl2 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m2.id,
    'Construire le déroulé détaillé des cérémonies'
  from m2 returning id
),
cl3 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m3.id,
    'Préparer le déroulement de la cérémonie civile'
  from m3 returning id
),
cl4 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m4.id,
    'Préparer les éléments nécessaires à la cérémonie civile'
  from m4 returning id
),
cl5 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m5.id,
    'Coordonner les moments clés de la cérémonie civile'
  from m5 returning id
),
cl6 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m6.id,
    'Préparer la bénédiction au khane'
  from m6 returning id
),
cl7 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m7.id,
    'Préparer la transition vers le khane'
  from m7 returning id
),
cl8 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m8.id,
    'Coordonner l''arrivée et la bénédiction au khane'
  from m8 returning id
),
cl9 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m9.id,
    'Construire la célébration religieuse à l''église'
  from m9 returning id
),
cl10 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m10.id,
    'Préparer les intervenants de la célébration'
  from m10 returning id
),
cl11 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m11.id,
    'Préparer les entrées, placements et sortie'
  from m11 returning id
),
cl12 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m12.id,
    'Organiser une répétition de la cérémonie'
  from m12 returning id
),
cl13 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m13.id,
    'Coordonner la célébration à l''église'
  from m13 returning id
),
cl14 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m14.id,
    'Définir les musiques des cérémonies'
  from m14 returning id
),
cl15 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m15.id,
    'Préparer les fichiers et supports audio'
  from m15 returning id
),
cl16 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m16.id,
    'Construire le programme du moment convivial'
  from m16 returning id
),
cl17 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m17.id,
    'Préparer les jeux et le casino fictif'
  from m17 returning id
),
cl18 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m18.id,
    'Lancer et rythmer les animations du samedi'
  from m18 returning id
),
cl19 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m19.id,
    'Définir le concept narratif de la comédie musicale'
  from m19 returning id
),
cl20 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m20.id,
    'Écrire le spectacle'
  from m20 returning id
),
cl21 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m21.id,
    'Construire l''univers musical du spectacle'
  from m21 returning id
),
cl22 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m22.id,
    'Constituer la distribution du spectacle'
  from m22 returning id
),
cl23 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m23.id,
    'Planifier et réaliser les répétitions'
  from m23 returning id
),
cl24 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m24.id,
    'Préparer costumes, accessoires et éléments de scène'
  from m24 returning id
),
cl25 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m25.id,
    'Définir les interventions et prises de parole'
  from m25 returning id
),
cl26 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m26.id,
    'Préparer la première danse'
  from m26 returning id
),
cl27 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m27.id,
    'Construire la transition spectacle vers première danse'
  from m27 returning id
),
cl28 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m28.id,
    'Définir les autres animations de la réception'
  from m28 returning id
),
cl29 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m29.id,
    'Définir les besoins techniques'
  from m29 returning id
),
cl30 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m30.id,
    'Effectuer les balances et tests techniques'
  from m30 returning id
),
cl31 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m31.id,
    'Préparer les solutions de secours techniques'
  from m31 returning id
),
cl32 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m32.id,
    'Piloter les cérémonies selon le conducteur'
  from m32 returning id
),
cl33 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m33.id,
    'Récupérer le matériel et les contenus'
  from m33 returning id
),
cl34 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m34.id,
    'Archiver les contenus des cérémonies et du spectacle'
  from m34 returning id
),

-- ─── CHECKLIST ITEMS ─────────────────────────────────────────────────────────
_cl1_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl1.id, v.label, 'todo', false
  from cl1 cross join (values
    ('Lister les cérémonies et événements des quatre jours'),
    ('Définir l''ordre chronologique des temps forts'),
    ('Attribuer des responsables à chaque temps fort'),
    ('Estimer la durée de chaque temps fort'),
    ('Identifier les transitions entre les temps forts'),
    ('Valider le planning avec les mariés'),
    ('Partager le plan avec l''équipe')
  ) as v(label) returning id
),
_cl2_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl2.id, v.label, 'todo', false
  from cl2 cross join (values
    ('Lister toutes les cérémonies à dérouler'),
    ('Définir le minutage de chaque cérémonie'),
    ('Identifier les intervenants pour chaque cérémonie'),
    ('Préparer les scripts et déroulés détaillés'),
    ('Coordonner avec les officiants et célébrants'),
    ('Valider les déroulés avec les mariés'),
    ('Distribuer les déroulés à l''équipe')
  ) as v(label) returning id
),
_cl3_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl3.id, v.label, 'todo', false
  from cl3 cross join (values
    ('Contacter la mairie pour les démarches administratives'),
    ('Confirmer la date et l''heure de la cérémonie civile'),
    ('Préparer la liste des témoins et leurs documents'),
    ('Définir l''ordre de passage et les déplacements'),
    ('Préparer les discours et lectures prévus'),
    ('Confirmer la présence de tous les participants'),
    ('Récapituler le déroulement la veille')
  ) as v(label) returning id
),
_cl4_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl4.id, v.label, 'todo', false
  from cl4 cross join (values
    ('Vérifier les documents administratifs requis'),
    ('Préparer les alliances'),
    ('Organiser le transport vers la mairie'),
    ('Prévoir une tenue de cérémonie adaptée'),
    ('Confirmer la présence des témoins'),
    ('Prévoir un plan B en cas d''imprévu')
  ) as v(label) returning id
),
_cl5_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl5.id, v.label, 'todo', false
  from cl5 cross join (values
    ('Superviser l''arrivée des mariés et invités à la mairie'),
    ('Coordonner les entrées selon le protocole'),
    ('Assurer le suivi du déroulement en temps réel'),
    ('Gérer les imprévus et ajustements'),
    ('Coordonner la sortie et les photos officielles'),
    ('Confirmer la clôture administrative')
  ) as v(label) returning id
),
_cl6_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl6.id, v.label, 'todo', false
  from cl6 cross join (values
    ('Confirmer le lieu et l''heure de la bénédiction'),
    ('Contacter le responsable de la cérémonie au khane'),
    ('Préparer le déroulement et les rituels prévus'),
    ('Lister les participants et leurs rôles'),
    ('Préparer les éléments rituels nécessaires'),
    ('Informer les invités du déroulement'),
    ('Prévoir les transitions avant et après la cérémonie'),
    ('Confirmer la logistique de transport')
  ) as v(label) returning id
),
_cl7_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl7.id, v.label, 'todo', false
  from cl7 cross join (values
    ('Définir le timing de départ du pique-nique vers le khane'),
    ('Organiser le transport des invités'),
    ('Prévenir les participants du changement de lieu'),
    ('Coordonner avec l''équipe au khane'),
    ('Prévoir un signal de départ clair'),
    ('Assurer l''accueil à l''arrivée au khane'),
    ('Briefer les responsables de la transition')
  ) as v(label) returning id
),
_cl8_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl8.id, v.label, 'todo', false
  from cl8 cross join (values
    ('Superviser l''arrivée des participants au khane'),
    ('Coordonner le placement des invités'),
    ('Donner le signal de début de la bénédiction'),
    ('Suivre le déroulement en temps réel'),
    ('Gérer les imprévus durant la cérémonie'),
    ('Coordonner la clôture et la sortie')
  ) as v(label) returning id
),
_cl9_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl9.id, v.label, 'todo', false
  from cl9 cross join (values
    ('Prendre contact avec le prêtre ou officiant'),
    ('Définir les étapes liturgiques de la messe'),
    ('Choisir les lectures bibliques et prières'),
    ('Préparer les chants et leur placement dans la messe'),
    ('Définir les moments de participation des invités'),
    ('Préparer le livret de messe'),
    ('Confirmer tous les éléments avec l''officiant'),
    ('Valider le déroulement avec les mariés')
  ) as v(label) returning id
),
_cl10_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl10.id, v.label, 'todo', false
  from cl10 cross join (values
    ('Identifier les lecteurs et témoins de la foi'),
    ('Briefer chaque intervenant sur son rôle'),
    ('Fournir les textes à lire ou réciter'),
    ('Organiser une répétition avec les intervenants'),
    ('Confirmer la présence de chaque intervenant'),
    ('Préparer une liste de remplaçants en cas d''absence'),
    ('Distribuer les plannings aux intervenants')
  ) as v(label) returning id
),
_cl11_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl11.id, v.label, 'todo', false
  from cl11 cross join (values
    ('Définir l''ordre de cortège pour l''entrée'),
    ('Planifier les placements dans l''église'),
    ('Confirmer les rôles des garçons et demoiselles d''honneur'),
    ('Préparer la sortie et les photos devant l''église'),
    ('Définir la musique d''entrée et de sortie'),
    ('Répéter les déplacements avec les participants'),
    ('Informer les invités de leur placement')
  ) as v(label) returning id
),
_cl12_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl12.id, v.label, 'todo', false
  from cl12 cross join (values
    ('Planifier la date et l''heure de la répétition'),
    ('Convoquer tous les intervenants à la répétition'),
    ('Répéter l''ordre de cortège et les entrées'),
    ('Tester le son et la musique en conditions réelles'),
    ('Régler les imprévus identifiés lors de la répétition'),
    ('Prendre des notes sur les ajustements nécessaires'),
    ('Confirmer le déroulement final avec l''officiant')
  ) as v(label) returning id
),
_cl13_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl13.id, v.label, 'todo', false
  from cl13 cross join (values
    ('Superviser l''accueil et le placement des invités'),
    ('Coordonner les entrées selon le protocole prévu'),
    ('Assurer le suivi du déroulement liturgique'),
    ('Gérer les transitions et les changements'),
    ('Coordonner la sortie et les photos'),
    ('Clôturer la cérémonie et informer de la suite')
  ) as v(label) returning id
),
_cl14_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl14.id, v.label, 'todo', false
  from cl14 cross join (values
    ('Identifier les moments musicaux dans chaque cérémonie'),
    ('Sélectionner les morceaux pour la cérémonie civile'),
    ('Choisir les chants et musiques pour la bénédiction au khane'),
    ('Définir les musiques pour la messe à l''église'),
    ('Préparer les fichiers et supports nécessaires'),
    ('Confirmer les choix avec les mariés'),
    ('Transmettre les sélections aux musiciens')
  ) as v(label) returning id
),
_cl15_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl15.id, v.label, 'todo', false
  from cl15 cross join (values
    ('Collecter tous les fichiers audio sélectionnés'),
    ('Vérifier la qualité et le format des fichiers'),
    ('Créer des playlists organisées par cérémonie'),
    ('Préparer un support de lecture (ordinateur ou tablette)'),
    ('Tester les fichiers sur l''équipement prévu'),
    ('Préparer des sauvegardes des fichiers importants'),
    ('Partager les supports avec les responsables son')
  ) as v(label) returning id
),
_cl16_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl16.id, v.label, 'todo', false
  from cl16 cross join (values
    ('Définir la structure et les temps du moment convivial'),
    ('Lister les animations prévues et leur durée'),
    ('Établir l''ordre de passage des animations'),
    ('Prévoir des transitions fluides entre les activités'),
    ('Assigner des responsables à chaque animation'),
    ('Préparer le matériel nécessaire pour chaque activité'),
    ('Informer les animateurs du programme'),
    ('Valider le programme avec les mariés')
  ) as v(label) returning id
),
_cl17_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl17.id, v.label, 'todo', false
  from cl17 cross join (values
    ('Choisir les jeux adaptés à l''ambiance souhaitée'),
    ('Acheter ou fabriquer le matériel de jeux'),
    ('Préparer les règles du casino fictif'),
    ('Former les animateurs aux jeux et au casino'),
    ('Prévoir des jetons ou monnaie fictive'),
    ('Organiser l''espace dédié aux jeux et au casino'),
    ('Tester les jeux avant l''événement'),
    ('Prévoir des prix et récompenses pour les vainqueurs')
  ) as v(label) returning id
),
_cl18_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl18.id, v.label, 'todo', false
  from cl18 cross join (values
    ('Confirmer la disponibilité des animateurs'),
    ('Donner le signal de lancement des animations'),
    ('Assurer le rythme et l''enchaînement des activités'),
    ('Adapter le programme en fonction de l''ambiance'),
    ('Gérer les transitions entre les animations'),
    ('Maintenir l''énergie et l''enthousiasme des invités'),
    ('Clôturer les animations et annoncer la suite')
  ) as v(label) returning id
),
_cl19_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl19.id, v.label, 'todo', false
  from cl19 cross join (values
    ('Brainstormer le thème central de la comédie musicale'),
    ('Définir les personnages principaux et leur arc narratif'),
    ('Construire la trame narrative du spectacle'),
    ('Intégrer des anecdotes personnelles des mariés'),
    ('Définir les scènes clés et leur ordre'),
    ('Déterminer le ton et l''humour du spectacle'),
    ('Choisir les références culturelles à inclure'),
    ('Définir la durée totale du spectacle'),
    ('Valider le concept avec les mariés'),
    ('Présenter le concept aux autres participants'),
    ('Ajuster le concept après les retours'),
    ('Finaliser le synopsis du spectacle')
  ) as v(label) returning id
),
_cl20_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl20.id, v.label, 'todo', false
  from cl20 cross join (values
    ('Rédiger le script de la comédie musicale'),
    ('Écrire les dialogues et répliques'),
    ('Préparer les paroles des chansons originales'),
    ('Écrire les transitions et narrations'),
    ('Intégrer les moments de participation du public'),
    ('Relire et corriger le script complet'),
    ('Adapter le script aux capacités des participants'),
    ('Faire une lecture à voix haute pour tester'),
    ('Finaliser le script après retours')
  ) as v(label) returning id
),
_cl21_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl21.id, v.label, 'todo', false
  from cl21 cross join (values
    ('Sélectionner les morceaux musicaux pour le spectacle'),
    ('Adapter ou arranger les chansons si nécessaire'),
    ('Créer ou récupérer les pistes instrumentales'),
    ('Préparer les playbacks et accompagnements'),
    ('Définir les tonalités adaptées aux chanteurs'),
    ('Tester les arrangements avec les participants'),
    ('Enregistrer les guides vocaux pour les répétitions'),
    ('Préparer les fichiers définitifs pour le jour J'),
    ('Valider les choix musicaux avec les mariés')
  ) as v(label) returning id
),
_cl22_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl22.id, v.label, 'todo', false
  from cl22 cross join (values
    ('Identifier les participants volontaires'),
    ('Attribuer les rôles en fonction des capacités'),
    ('Confirmer la disponibilité de chaque participant'),
    ('Présenter les rôles et attentes à chacun'),
    ('Préparer les fiches de rôle individuelles'),
    ('Organiser la première réunion de distribution'),
    ('Valider la distribution finale')
  ) as v(label) returning id
),
_cl23_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl23.id, v.label, 'todo', false
  from cl23 cross join (values
    ('Définir le calendrier des répétitions'),
    ('Réserver les lieux de répétition'),
    ('Préparer le matériel de répétition'),
    ('Animer la première répétition lecture'),
    ('Réaliser les répétitions scéniques'),
    ('Organiser une répétition filée complète'),
    ('Effectuer la répétition générale'),
    ('Collecter les retours et ajustements'),
    ('Valider la version définitive du spectacle')
  ) as v(label) returning id
),
_cl24_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl24.id, v.label, 'todo', false
  from cl24 cross join (values
    ('Définir les costumes pour chaque personnage'),
    ('Acheter ou fabriquer les costumes nécessaires'),
    ('Ajuster les costumes aux participants'),
    ('Préparer les accessoires de scène'),
    ('Créer ou récupérer les décors et éléments de scène'),
    ('Tester les costumes lors des répétitions'),
    ('Ranger et étiqueter chaque costume et accessoire'),
    ('Transporter les costumes sur le lieu du spectacle')
  ) as v(label) returning id
),
_cl25_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl25.id, v.label, 'todo', false
  from cl25 cross join (values
    ('Identifier les proches souhaitant prendre la parole'),
    ('Définir le format et la durée des discours'),
    ('Conseiller les intervenants sur le contenu'),
    ('Planifier l''ordre de passage des discours'),
    ('Préparer l''introduction de chaque intervenant'),
    ('Confirmer la présence et la disponibilité de chacun'),
    ('Intégrer les discours dans le déroulé de la soirée')
  ) as v(label) returning id
),
_cl26_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl26.id, v.label, 'todo', false
  from cl26 cross join (values
    ('Choisir la chanson de la première danse'),
    ('Définir la chorégraphie ou le style de danse'),
    ('Organiser des cours de danse si souhaité'),
    ('Répéter la chorégraphie avec les mariés'),
    ('Prévoir un signal pour l''ouverture du bal'),
    ('Coordonner avec le DJ ou musicien'),
    ('Confirmer la logistique de la piste de danse')
  ) as v(label) returning id
),
_cl27_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl27.id, v.label, 'todo', false
  from cl27 cross join (values
    ('Définir le moment exact de la transition'),
    ('Préparer l''annonce de fin de spectacle'),
    ('Coordonner le retrait des éléments de scène'),
    ('Organiser l''entrée des mariés pour la première danse'),
    ('Prévoir une mise en lumière adaptée'),
    ('Briefer le DJ ou musicien sur la transition'),
    ('Préparer le moment de surprise si prévu'),
    ('Tester la transition lors de la répétition générale')
  ) as v(label) returning id
),
_cl28_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl28.id, v.label, 'todo', false
  from cl28 cross join (values
    ('Lister les animations souhaitées pour la soirée'),
    ('Choisir les prestataires ou animateurs'),
    ('Planifier l''ordre et le timing des animations'),
    ('Préparer le matériel nécessaire'),
    ('Briefer les animateurs sur le déroulement'),
    ('Intégrer les animations dans le planning de soirée'),
    ('Valider les animations avec les mariés')
  ) as v(label) returning id
),
_cl29_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl29.id, v.label, 'todo', false
  from cl29 cross join (values
    ('Évaluer les besoins en sonorisation pour chaque cérémonie'),
    ('Définir les besoins en éclairage de scène'),
    ('Identifier les besoins en vidéoprojection'),
    ('Lister le matériel technique nécessaire'),
    ('Contacter des prestataires techniques'),
    ('Établir un devis et choisir le prestataire'),
    ('Confirmer la disponibilité du matériel'),
    ('Préparer le plan technique détaillé')
  ) as v(label) returning id
),
_cl30_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl30.id, v.label, 'todo', false
  from cl30 cross join (values
    ('Planifier les balances sur les lieux de cérémonie'),
    ('Tester le système de sonorisation à l''église'),
    ('Vérifier l''acoustique et ajuster les réglages'),
    ('Tester la projection si applicable'),
    ('Réaliser la balance technique pour le spectacle'),
    ('Tester tous les équipements en conditions réelles'),
    ('Résoudre les problèmes techniques identifiés'),
    ('Valider le setup technique final')
  ) as v(label) returning id
),
_cl31_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl31.id, v.label, 'todo', false
  from cl31 cross join (values
    ('Identifier les risques techniques potentiels'),
    ('Préparer des équipements de secours (micros, câbles)'),
    ('Télécharger les fichiers audio sur plusieurs supports'),
    ('Préparer un plan B pour chaque scénario critique'),
    ('Former un responsable technique aux solutions de secours'),
    ('Tester les solutions de secours avant le jour J')
  ) as v(label) returning id
),
_cl32_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl32.id, v.label, 'todo', false
  from cl32 cross join (values
    ('Préparer le conducteur détaillé de toutes les cérémonies'),
    ('Briefer l''équipe sur le déroulement prévu'),
    ('Coordonner en temps réel avec les responsables de chaque cérémonie'),
    ('Suivre l''avancement par rapport au planning'),
    ('Gérer les imprévus et prendre des décisions rapides'),
    ('Communiquer les changements à l''équipe'),
    ('Valider la clôture de chaque cérémonie')
  ) as v(label) returning id
),
_cl33_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl33.id, v.label, 'todo', false
  from cl33 cross join (values
    ('Lister tout le matériel prêté ou loué à récupérer'),
    ('Organiser la collecte du matériel après chaque événement'),
    ('Vérifier l''état du matériel lors de la récupération'),
    ('Récupérer les fichiers audio et vidéo captés'),
    ('Rassembler les costumes et accessoires du spectacle'),
    ('Confirmer la restitution complète du matériel loué')
  ) as v(label) returning id
),
_cl34_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl34.id, v.label, 'todo', false
  from cl34 cross join (values
    ('Collecter les photos et vidéos des cérémonies'),
    ('Organiser les fichiers par cérémonie et par date'),
    ('Archiver les scripts et partitions du spectacle'),
    ('Compiler les retours et observations de l''équipe'),
    ('Créer un dossier mémoriel pour les mariés'),
    ('Sauvegarder les archives sur un support durable')
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
sq_5 as materialized (
  select id from _20270628_event_sequences
  where name in (
    'Mariage civil',
    'Moment convivial entre amis',
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
  where name in (
    'Bénédiction à l''église',
    'Célébration de mariage'
  )
),

-- ─── LIENS MISSION ↔ SÉQUENCE ────────────────────────────────────────────────
_ms1 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m1.id, sq_all_7.id
  from m1 cross join sq_all_7
  returning mission_id
),
_ms2 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m2.id, sq_5.id
  from m2 cross join sq_5
  returning mission_id
),
_ms3 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m3.id, s.id
  from m3
  cross join (select id from _20270628_event_sequences where name = 'Mariage civil') s
  returning mission_id
),
_ms4 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m4.id, s.id
  from m4
  cross join (select id from _20270628_event_sequences where name = 'Mariage civil') s
  returning mission_id
),
_ms5 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m5.id, s.id
  from m5
  cross join (select id from _20270628_event_sequences where name = 'Mariage civil') s
  returning mission_id
),
_ms6 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m6.id, s.id
  from m6
  cross join (select id from _20270628_event_sequences where name = 'Bénédiction au khane') s
  returning mission_id
),
_ms7 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m7.id, s.id
  from m7
  cross join (
    select id from _20270628_event_sequences
    where name in ('Pique-nique partagé', 'Bénédiction au khane')
  ) s
  returning mission_id
),
_ms8 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m8.id, s.id
  from m8
  cross join (select id from _20270628_event_sequences where name = 'Bénédiction au khane') s
  returning mission_id
),
_ms9 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m9.id, s.id
  from m9
  cross join (select id from _20270628_event_sequences where name = 'Bénédiction à l''église') s
  returning mission_id
),
_ms10 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m10.id, s.id
  from m10
  cross join (select id from _20270628_event_sequences where name = 'Bénédiction à l''église') s
  returning mission_id
),
_ms11 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m11.id, s.id
  from m11
  cross join (select id from _20270628_event_sequences where name = 'Bénédiction à l''église') s
  returning mission_id
),
_ms12 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m12.id, s.id
  from m12
  cross join (select id from _20270628_event_sequences where name = 'Bénédiction à l''église') s
  returning mission_id
),
_ms13 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m13.id, s.id
  from m13
  cross join (select id from _20270628_event_sequences where name = 'Bénédiction à l''église') s
  returning mission_id
),
_ms14 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m14.id, s.id
  from m14
  cross join (
    select id from _20270628_event_sequences
    where name in ('Mariage civil', 'Bénédiction au khane', 'Bénédiction à l''église')
  ) s
  returning mission_id
),
_ms15 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m15.id, s.id
  from m15
  cross join (
    select id from _20270628_event_sequences
    where name in (
      'Mariage civil',
      'Moment convivial entre amis',
      'Bénédiction à l''église',
      'Célébration de mariage'
    )
  ) s
  returning mission_id
),
_ms16 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m16.id, s.id
  from m16
  cross join (select id from _20270628_event_sequences where name = 'Moment convivial entre amis') s
  returning mission_id
),
_ms17 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m17.id, s.id
  from m17
  cross join (select id from _20270628_event_sequences where name = 'Moment convivial entre amis') s
  returning mission_id
),
_ms18 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m18.id, s.id
  from m18
  cross join (select id from _20270628_event_sequences where name = 'Moment convivial entre amis') s
  returning mission_id
),
_ms19 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m19.id, sq_celebr.id
  from m19 cross join sq_celebr
  returning mission_id
),
_ms20 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m20.id, sq_celebr.id
  from m20 cross join sq_celebr
  returning mission_id
),
_ms21 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m21.id, sq_celebr.id
  from m21 cross join sq_celebr
  returning mission_id
),
_ms22 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m22.id, sq_celebr.id
  from m22 cross join sq_celebr
  returning mission_id
),
_ms23 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m23.id, sq_celebr.id
  from m23 cross join sq_celebr
  returning mission_id
),
_ms24 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m24.id, sq_celebr.id
  from m24 cross join sq_celebr
  returning mission_id
),
_ms25 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m25.id, sq_celebr.id
  from m25 cross join sq_celebr
  returning mission_id
),
_ms26 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m26.id, sq_celebr.id
  from m26 cross join sq_celebr
  returning mission_id
),
_ms27 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m27.id, sq_celebr.id
  from m27 cross join sq_celebr
  returning mission_id
),
_ms28 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m28.id, sq_celebr.id
  from m28 cross join sq_celebr
  returning mission_id
),
_ms29 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m29.id, s.id
  from m29
  cross join (
    select id from _20270628_event_sequences
    where name in (
      'Moment convivial entre amis',
      'Bénédiction à l''église',
      'Célébration de mariage'
    )
  ) s
  returning mission_id
),
_ms30 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m30.id, sq_eglise_celebr.id
  from m30 cross join sq_eglise_celebr
  returning mission_id
),
_ms31 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m31.id, sq_eglise_celebr.id
  from m31 cross join sq_eglise_celebr
  returning mission_id
),
_ms32 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m32.id, sq_5.id
  from m32 cross join sq_5
  returning mission_id
),
_ms33 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m33.id, s.id
  from m33
  cross join (
    select id from _20270628_event_sequences
    where name in ('Moment convivial entre amis', 'Célébration de mariage')
  ) s
  returning mission_id
)
-- m34 → aucune séquence

select
  (select count(*) from p)              as poles,
  (select count(*) from d_archi)
  + (select count(*) from d_civil)
  + (select count(*) from d_khane)
  + (select count(*) from d_eglise)
  + (select count(*) from d_musique)
  + (select count(*) from d_samedi)
  + (select count(*) from d_comedie)
  + (select count(*) from d_recept)
  + (select count(*) from d_tech)
  + (select count(*) from d_exec)       as domaines,
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
  + (select count(*) from m31)
  + (select count(*) from m32)
  + (select count(*) from m33)
  + (select count(*) from m34)          as missions,
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
  + (select count(*) from _cl31_items)
  + (select count(*) from _cl32_items)
  + (select count(*) from _cl33_items)
  + (select count(*) from _cl34_items)  as checklist_items,
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
  + (select count(*) from _ms29)
  + (select count(*) from _ms30)
  + (select count(*) from _ms31)
  + (select count(*) from _ms32)
  + (select count(*) from _ms33)        as mission_sequences;
