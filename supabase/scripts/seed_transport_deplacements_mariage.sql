-- seed_transport_deplacements_mariage.sql
-- Pôle "Transport & déplacements" – script de seed complet (sort_order = 100)

delete from _20270628_poles where name = 'Transport & déplacements';

with
-- ─── PÔLE ────────────────────────────────────────────────────────────────────
p as materialized (
  insert into _20270628_poles (id, name, sort_order)
  values (gen_random_uuid(), 'Transport & déplacements', 100)
  returning id
),

-- ─── DOMAINES ────────────────────────────────────────────────────────────────
d_mobilite as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Plan de mobilité', 'plan-mobilite', 'avant'
  from p returning id
),
d_transport_maries as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Transport des mariés', 'transport-maries', 'avant'
  from p returning id
),
d_parents as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Parents, témoins & cortège', 'parents-temoins-cortege', 'avant'
  from p returning id
),
d_vendredi as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Mariage civil & goûter', 'mariage-civil-gouter', 'avant'
  from p returning id
),
d_samedi as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Samedi entre amis', 'samedi-entre-amis', 'avant'
  from p returning id
),
d_dimanche as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Dimanche & khane', 'dimanche-khane', 'avant'
  from p returning id
),
d_lundi_eglise as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Lundi église', 'lundi-eglise', 'avant'
  from p returning id
),
d_eglise_ostara as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Lundi église → Ostara', 'lundi-eglise-ostara', null
  from p returning id
),
d_ostara as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Accès Domaine Ostara', 'acces-domaine-ostara', 'avant'
  from p returning id
),
d_statio as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Stationnement', 'stationnement', null
  from p returning id
),
d_covoit as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Covoiturage ciblé', 'covoiturage-cible', 'avant'
  from p returning id
),
d_presta as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Prestataires & livraisons', 'prestataires-livraisons', 'avant'
  from p returning id
),
d_bagages as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Bagages & effets', 'bagages-effets', 'avant'
  from p returning id
),
d_planb as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Plan B transport', 'plan-b-transport', 'avant'
  from p returning id
),
d_commu as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Communication transport', 'communication-transport', 'avant'
  from p returning id
),
d_exec as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Exécution transport', 'execution-transport', 'jour_j'
  from p returning id
),
d_retours as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Retours & fin de soirée', 'retours-fin-soiree', null
  from p returning id
),
d_cloture as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Clôture transport', 'cloture-transport', 'apres'
  from p returning id
),

-- ─── MISSIONS ────────────────────────────────────────────────────────────────
m1 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_mobilite.id,
    'Cartographier tous les déplacements du mariage'
  from d_mobilite returning id
),
m2 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_mobilite.id,
    'Construire le planning général des déplacements'
  from d_mobilite returning id
),
m3 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_transport_maries.id,
    'Organiser le chauffeur privé des mariés'
  from d_transport_maries returning id
),
m4 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_transport_maries.id,
    'Préparer les trajets des mariés par séquence'
  from d_transport_maries returning id
),
m5 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_parents.id,
    'Recenser les besoins de transport des personnes clés'
  from d_parents returning id
),
m6 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_parents.id,
    'Organiser les véhicules des personnes clés'
  from d_parents returning id
),
m7 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_vendredi.id,
    'Préparer les déplacements du vendredi'
  from d_vendredi returning id
),
m8 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_samedi.id,
    'Préparer les déplacements du samedi'
  from d_samedi returning id
),
m9 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_dimanche.id,
    'Organiser le départ anticipé vers le khane'
  from d_dimanche returning id
),
m10 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_dimanche.id,
    'Préparer l''accès et le stationnement au khane'
  from d_dimanche returning id
),
m11 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_lundi_eglise.id,
    'Préparer les arrivées à l''église'
  from d_lundi_eglise returning id
),
m12 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_eglise_ostara.id,
    'Construire le plan de transfert de l''église vers Ostara'
  from d_eglise_ostara returning id
),
m13 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_eglise_ostara.id,
    'Piloter le départ de l''église vers Ostara'
  from d_eglise_ostara returning id
),
m14 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_ostara.id,
    'Préparer les accès et circulations au Domaine Ostara'
  from d_ostara returning id
),
m15 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_statio.id,
    'Cartographier les solutions de stationnement'
  from d_statio returning id
),
m16 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_statio.id,
    'Mettre en place l''orientation véhicules lorsque nécessaire'
  from d_statio returning id
),
m17 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_covoit.id,
    'Organiser le covoiturage des personnes nécessitant une coordination'
  from d_covoit returning id
),
m18 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_presta.id,
    'Coordonner les contraintes de circulation des prestataires'
  from d_presta returning id
),
m19 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_bagages.id,
    'Organiser le transport des bagages et effets des mariés'
  from d_bagages returning id
),
m20 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_planb.id,
    'Préparer les solutions de secours pour les trajets critiques'
  from d_planb returning id
),
m21 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_planb.id,
    'Anticiper les perturbations de circulation'
  from d_planb returning id
),
m22 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_commu.id,
    'Préparer les fiches trajet des personnes clés'
  from d_commu returning id
),
m23 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_commu.id,
    'Confirmer les déplacements avec les conducteurs'
  from d_commu returning id
),
m24 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_exec.id,
    'Suivre les départs des personnes clés'
  from d_exec returning id
),
m25 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_exec.id,
    'Gérer les incidents de déplacement'
  from d_exec returning id
),
m26 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_retours.id,
    'Préparer les retours après les événements'
  from d_retours returning id
),
m27 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_retours.id,
    'Coordonner le départ des mariés le lundi soir'
  from d_retours returning id
),
m28 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_cloture.id,
    'Clôturer les prestations et frais de transport'
  from d_cloture returning id
),

-- ─── CHECKLISTS ──────────────────────────────────────────────────────────────
cl1 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m1.id,
    'Cartographier tous les déplacements du mariage'
  from m1 returning id
),
cl2 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m2.id,
    'Construire le planning général des déplacements'
  from m2 returning id
),
cl3 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m3.id,
    'Organiser le chauffeur privé des mariés'
  from m3 returning id
),
cl4 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m4.id,
    'Préparer les trajets des mariés par séquence'
  from m4 returning id
),
cl5 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m5.id,
    'Recenser les besoins de transport des personnes clés'
  from m5 returning id
),
cl6 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m6.id,
    'Organiser les véhicules des personnes clés'
  from m6 returning id
),
cl7 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m7.id,
    'Préparer les déplacements du vendredi'
  from m7 returning id
),
cl8 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m8.id,
    'Préparer les déplacements du samedi'
  from m8 returning id
),
cl9 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m9.id,
    'Organiser le départ anticipé vers le khane'
  from m9 returning id
),
cl10 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m10.id,
    'Préparer l''accès et le stationnement au khane'
  from m10 returning id
),
cl11 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m11.id,
    'Préparer les arrivées à l''église'
  from m11 returning id
),
cl12 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m12.id,
    'Construire le plan de transfert de l''église vers Ostara'
  from m12 returning id
),
cl13 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m13.id,
    'Piloter le départ de l''église vers Ostara'
  from m13 returning id
),
cl14 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m14.id,
    'Préparer les accès et circulations au Domaine Ostara'
  from m14 returning id
),
cl15 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m15.id,
    'Cartographier les solutions de stationnement'
  from m15 returning id
),
cl16 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m16.id,
    'Mettre en place l''orientation véhicules lorsque nécessaire'
  from m16 returning id
),
cl17 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m17.id,
    'Organiser le covoiturage des personnes nécessitant une coordination'
  from m17 returning id
),
cl18 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m18.id,
    'Coordonner les contraintes de circulation des prestataires'
  from m18 returning id
),
cl19 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m19.id,
    'Organiser le transport des bagages et effets des mariés'
  from m19 returning id
),
cl20 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m20.id,
    'Préparer les solutions de secours pour les trajets critiques'
  from m20 returning id
),
cl21 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m21.id,
    'Anticiper les perturbations de circulation'
  from m21 returning id
),
cl22 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m22.id,
    'Préparer les fiches trajet des personnes clés'
  from m22 returning id
),
cl23 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m23.id,
    'Confirmer les déplacements avec les conducteurs'
  from m23 returning id
),
cl24 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m24.id,
    'Suivre les départs des personnes clés'
  from m24 returning id
),
cl25 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m25.id,
    'Gérer les incidents de déplacement'
  from m25 returning id
),
cl26 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m26.id,
    'Préparer les retours après les événements'
  from m26 returning id
),
cl27 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m27.id,
    'Coordonner le départ des mariés le lundi soir'
  from m27 returning id
),
cl28 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m28.id,
    'Clôturer les prestations et frais de transport'
  from m28 returning id
),

-- ─── CHECKLIST ITEMS ─────────────────────────────────────────────────────────
_cl1_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl1.id, v.label, 'todo', false
  from cl1 cross join (values
    ('Lister tous les lieux utilisés entre le 25 et le 28 juin 2027.'),
    ('Lister les trajets nécessaires entre les différents lieux.'),
    ('Identifier les trajets des mariés.'),
    ('Identifier les trajets des parents.'),
    ('Identifier les trajets des témoins et du cortège.'),
    ('Identifier les trajets des prestataires lorsque leur coordination est nécessaire.'),
    ('Identifier les trajets comportant une contrainte horaire forte.'),
    ('Associer chaque déplacement à la séquence correspondante.')
  ) as v(label) returning id
),
_cl2_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl2.id, v.label, 'todo', false
  from cl2 cross join (values
    ('Définir l''heure de départ nécessaire pour chaque trajet critique.'),
    ('Intégrer les temps de circulation estimés.'),
    ('Ajouter une marge pour le stationnement et la marche jusqu''au lieu.'),
    ('Ajouter une marge supplémentaire avant les cérémonies.'),
    ('Identifier les déplacements pouvant être réalisés indépendamment.'),
    ('Identifier les personnes devant impérativement voyager ensemble.'),
    ('Transmettre les horaires retenus au pôle Pilotage & coordination.')
  ) as v(label) returning id
),
_cl3_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl3.id, v.label, 'todo', false
  from cl3 cross join (values
    ('Définir les journées et trajets nécessitant un chauffeur privé.'),
    ('Confirmer les horaires de prise en charge.'),
    ('Confirmer les adresses de départ et d''arrivée.'),
    ('Confirmer la capacité du véhicule pour les tenues et effets nécessaires.'),
    ('Vérifier la possibilité de décorer discrètement le véhicule si souhaité.'),
    ('Vérifier les conditions tarifaires et éventuels temps d''attente.'),
    ('Conserver les coordonnées directes du chauffeur.'),
    ('Prévoir une solution de secours en cas d''indisponibilité.')
  ) as v(label) returning id
),
_cl4_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl4.id, v.label, 'todo', false
  from cl4 cross join (values
    ('Définir le trajet vers le mariage civil.'),
    ('Définir le déplacement vers le goûter d''honneur si nécessaire.'),
    ('Définir les déplacements du samedi.'),
    ('Définir le trajet vers la bénédiction au khane.'),
    ('Définir le trajet vers la bénédiction à l''église.'),
    ('Définir le trajet entre l''église et le Domaine Ostara.'),
    ('Définir le trajet de fin de soirée du lundi.')
  ) as v(label) returning id
),
_cl5_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl5.id, v.label, 'todo', false
  from cl5 cross join (values
    ('Identifier les parents disposant de leur propre véhicule.'),
    ('Identifier les témoins disposant de leur propre véhicule.'),
    ('Identifier les membres du cortège ayant besoin d''un transport.'),
    ('Identifier les personnes ne pouvant pas conduire sur certains trajets.'),
    ('Identifier les besoins spécifiques liés aux enfants du cortège.'),
    ('Identifier les personnes devant arriver plus tôt que les invités.'),
    ('Centraliser uniquement les besoins nécessitant une coordination.')
  ) as v(label) returning id
),
_cl6_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl6.id, v.label, 'todo', false
  from cl6 cross join (values
    ('Attribuer les places disponibles dans les véhicules lorsque nécessaire.'),
    ('Éviter de dépendre d''un seul véhicule pour plusieurs personnes indispensables.'),
    ('Définir les conducteurs pour les trajets critiques.'),
    ('Vérifier que chaque conducteur connaît les adresses.'),
    ('Prévoir les horaires de rendez-vous.'),
    ('Prévoir les éventuels retours séparés.'),
    ('Partager les coordonnées utiles entre conducteurs et passagers.')
  ) as v(label) returning id
),
_cl7_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl7.id, v.label, 'todo', false
  from cl7 cross join (values
    ('Définir le lieu de départ des mariés.'),
    ('Définir l''heure de départ pour la mairie.'),
    ('Identifier les contraintes de circulation autour de la mairie.'),
    ('Identifier la solution de stationnement ou de dépose.'),
    ('Préparer le déplacement vers le goûter d''honneur.'),
    ('Informer les personnes clés de l''itinéraire entre les deux lieux.'),
    ('Prévoir le transport des effets nécessaires au goûter d''honneur.'),
    ('Définir le retour ou départ des mariés en fin de journée.')
  ) as v(label) returning id
),
_cl8_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl8.id, v.label, 'todo', false
  from cl8 cross join (values
    ('Confirmer l''adresse définitive du lieu du moment convivial.'),
    ('Identifier les possibilités de stationnement.'),
    ('Définir le moyen de transport des mariés.'),
    ('Identifier les personnes clés ayant besoin d''un covoiturage.'),
    ('Communiquer les informations d''accès utiles.'),
    ('Prévoir les conditions de retour après la soirée.'),
    ('Éviter qu''une personne ayant consommé de l''alcool soit désignée comme conducteur.')
  ) as v(label) returning id
),
_cl9_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl9.id, v.label, 'todo', false
  from cl9 cross join (values
    ('Définir l''heure impérative à laquelle les mariés quittent l''activité précédente.'),
    ('Définir l''heure de départ des parents concernés.'),
    ('Définir l''heure de départ des témoins concernés.'),
    ('Identifier les véhicules ou chauffeurs de chaque groupe.'),
    ('Prévoir une marge suffisante avant la bénédiction de 17 h.'),
    ('Vérifier que les tenues et effets nécessaires voyagent avec les bonnes personnes.'),
    ('Informer la coordination de l''heure limite de départ.'),
    ('Prévoir une solution si l''activité précédente prend du retard.')
  ) as v(label) returning id
),
_cl10_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl10.id, v.label, 'todo', false
  from cl10 cross join (values
    ('Confirmer l''adresse exacte et l''entrée à utiliser.'),
    ('Identifier les possibilités de dépose des mariés.'),
    ('Identifier les possibilités de stationnement des proches concernés.'),
    ('Vérifier les éventuelles consignes particulières d''accès.'),
    ('Partager uniquement les informations nécessaires aux personnes participant à la bénédiction.'),
    ('Prévoir le trajet de retour après la cérémonie.')
  ) as v(label) returning id
),
_cl11_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl11.id, v.label, 'todo', false
  from cl11 cross join (values
    ('Confirmer l''adresse et l''entrée à utiliser.'),
    ('Définir l''heure d''arrivée des mariés.'),
    ('Définir l''heure d''arrivée des parents.'),
    ('Définir l''heure d''arrivée des témoins et du cortège.'),
    ('Identifier les zones de dépose possibles.'),
    ('Identifier les possibilités de stationnement.'),
    ('Prévoir la gestion des véhicules qui devront ensuite rejoindre Ostara.'),
    ('Informer les conducteurs des contraintes de départ après la cérémonie.')
  ) as v(label) returning id
),
_cl12_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl12.id, v.label, 'todo', false
  from cl12 cross join (values
    ('Définir l''heure cible de départ de l''église.'),
    ('Estimer le temps de trajet jusqu''au Domaine Ostara.'),
    ('Ajouter une marge pour la sortie de cérémonie et les photos.'),
    ('Définir le véhicule des mariés.'),
    ('Définir les véhicules des parents, témoins et cortège.'),
    ('Identifier les personnes devant arriver à Ostara avant les mariés.'),
    ('Identifier les personnes pouvant partir plus tard.'),
    ('Prévoir le transport des tenues, accessoires et effets personnels.'),
    ('Transmettre le plan final au pôle Pilotage & coordination.')
  ) as v(label) returning id
),
_cl13_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl13.id, v.label, 'todo', false
  from cl13 cross join (values
    ('Vérifier que les véhicules nécessaires sont disponibles.'),
    ('Prévenir les conducteurs avant la sortie de l''église.'),
    ('Rassembler les personnes ayant un horaire de départ prioritaire.'),
    ('Vérifier que les effets indispensables quittent l''église avec le bon véhicule.'),
    ('Éviter que les photos de groupe retardent les personnes devant partir.'),
    ('Confirmer le départ des mariés.'),
    ('Signaler à Ostara l''heure d''arrivée estimée des mariés.')
  ) as v(label) returning id
),
_cl14_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl14.id, v.label, 'todo', false
  from cl14 cross join (values
    ('Confirmer l''adresse et l''accès véhicules.'),
    ('Identifier la zone de dépose des mariés.'),
    ('Identifier les zones de stationnement des proches.'),
    ('Identifier les accès réservés aux prestataires.'),
    ('Identifier les éventuelles restrictions de circulation sur le domaine.'),
    ('Prévoir une signalétique d''accès si nécessaire.'),
    ('Partager les informations utiles aux responsables concernés.')
  ) as v(label) returning id
),
_cl15_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl15.id, v.label, 'todo', false
  from cl15 cross join (values
    ('Identifier le stationnement disponible pour chaque lieu.'),
    ('Identifier les lieux où le stationnement est limité.'),
    ('Identifier les zones de dépose-minute utiles.'),
    ('Identifier les éventuelles restrictions horaires.'),
    ('Identifier les alternatives lorsque le parking principal est complet.'),
    ('Prévoir les informations à communiquer aux personnes clés.'),
    ('Transmettre les informations générales aux invités via le pôle Invités & accueil.')
  ) as v(label) returning id
),
_cl16_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl16.id, v.label, 'todo', false
  from cl16 cross join (values
    ('Installer la signalétique temporaire prévue.'),
    ('Vérifier que les accès ne sont pas bloqués.'),
    ('Préserver les zones nécessaires aux prestataires.'),
    ('Préserver la zone de dépose des mariés lorsqu''elle existe.'),
    ('Informer les personnes chargées de l''accueil des règles de stationnement.'),
    ('Retirer la signalétique temporaire en fin d''utilisation.')
  ) as v(label) returning id
),
_cl17_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl17.id, v.label, 'todo', false
  from cl17 cross join (values
    ('Recenser les demandes de covoiturage réellement nécessaires.'),
    ('Identifier les conducteurs disposant de places.'),
    ('Regrouper les personnes selon leur trajet.'),
    ('Éviter les détours incompatibles avec les horaires des cérémonies.'),
    ('Échanger les coordonnées entre conducteurs et passagers.'),
    ('Prévoir les trajets retour lorsque nécessaire.'),
    ('Laisser le pôle Invités & accueil communiquer les informations aux invités concernés.')
  ) as v(label) returning id
),
_cl18_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl18.id, v.label, 'todo', false
  from cl18 cross join (values
    ('Identifier les prestataires arrivant avec un véhicule.'),
    ('Identifier ceux nécessitant un accès proche pour décharger.'),
    ('Identifier les créneaux de livraison et retrait.'),
    ('Éviter les conflits entre livraisons simultanées.'),
    ('Identifier les véhicules devant rester sur place.'),
    ('Définir les zones de stationnement prestataires.'),
    ('Transmettre ces contraintes aux pôles Lieu & prestataires et Matériel & logistique.')
  ) as v(label) returning id
),
_cl19_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl19.id, v.label, 'todo', false
  from cl19 cross join (values
    ('Lister les sacs nécessaires pour chaque journée.'),
    ('Identifier les tenues devant voyager séparément.'),
    ('Identifier le véhicule transportant les effets personnels.'),
    ('Éviter de placer les objets indispensables dans un véhicule arrivant plus tard.'),
    ('Prévoir le transfert des affaires vers Ostara le lundi.'),
    ('Prévoir le transport des affaires en fin de soirée.'),
    ('Vérifier les bagages avant chaque changement de lieu.')
  ) as v(label) returning id
),
_cl20_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl20.id, v.label, 'todo', false
  from cl20 cross join (values
    ('Identifier une solution si le véhicule des mariés est indisponible.'),
    ('Identifier une solution si un conducteur clé est absent.'),
    ('Prévoir des coordonnées de taxis ou VTC utilisables si nécessaire.'),
    ('Prévoir une marge financière pour un transport imprévu.'),
    ('Identifier les trajets pour lesquels un retard aurait le plus d''impact.'),
    ('Définir qui prend la décision d''activer une solution de secours.'),
    ('Partager ce plan uniquement avec les responsables concernés.')
  ) as v(label) returning id
),
_cl21_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl21.id, v.label, 'todo', false
  from cl21 cross join (values
    ('Vérifier à l''approche du mariage les travaux ou fermetures connus.'),
    ('Vérifier les événements locaux pouvant perturber la circulation.'),
    ('Préparer un itinéraire alternatif pour les trajets critiques.'),
    ('Réévaluer les temps de trajet quelques jours avant le mariage.'),
    ('Informer les conducteurs concernés de toute modification.'),
    ('Adapter les heures de départ si nécessaire.')
  ) as v(label) returning id
),
_cl22_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl22.id, v.label, 'todo', false
  from cl22 cross join (values
    ('Préparer une fiche synthétique par journée.'),
    ('Indiquer les adresses exactes.'),
    ('Indiquer les horaires de départ et d''arrivée.'),
    ('Indiquer le conducteur ou moyen de transport.'),
    ('Indiquer les passagers concernés.'),
    ('Indiquer les informations de stationnement utiles.'),
    ('Indiquer le contact à appeler en cas de problème.'),
    ('Éviter de surcharger les fiches avec des informations non liées au transport.')
  ) as v(label) returning id
),
_cl23_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl23.id, v.label, 'todo', false
  from cl23 cross join (values
    ('Confirmer la disponibilité de chaque conducteur.'),
    ('Confirmer le véhicule utilisé.'),
    ('Confirmer le nombre de places.'),
    ('Confirmer les horaires de rendez-vous.'),
    ('Confirmer les adresses.'),
    ('Confirmer les éventuels passagers.'),
    ('Rappeler les trajets critiques quelques jours avant le mariage.')
  ) as v(label) returning id
),
_cl24_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl24.id, v.label, 'todo', false
  from cl24 cross join (values
    ('Vérifier que les conducteurs sont présents.'),
    ('Vérifier que les passagers prioritaires sont prêts.'),
    ('Donner le top de départ lorsque nécessaire.'),
    ('Signaler immédiatement un retard important.'),
    ('Adapter les regroupements de véhicules si nécessaire.'),
    ('Informer la destination lorsqu''une arrivée critique est décalée.')
  ) as v(label) returning id
),
_cl25_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl25.id, v.label, 'todo', false
  from cl25 cross join (values
    ('Identifier rapidement la nature du problème.'),
    ('Activer le véhicule ou conducteur de secours si nécessaire.'),
    ('Réaffecter les passagers prioritaires.'),
    ('Prévenir la coordination de l''impact horaire.'),
    ('Prévenir le lieu ou prestataire concerné si nécessaire.'),
    ('Éviter de solliciter directement les mariés lorsque le problème peut être résolu par les référents.')
  ) as v(label) returning id
),
_cl26_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl26.id, v.label, 'todo', false
  from cl26 cross join (values
    ('Définir le retour des mariés après chaque journée.'),
    ('Identifier les personnes clés ayant besoin d''un retour organisé.'),
    ('Prévoir les retours séparés lorsque les horaires diffèrent.'),
    ('Identifier les conducteurs qui ne consommeront pas d''alcool.'),
    ('Prévoir une solution alternative pour les personnes ne pouvant finalement pas conduire.'),
    ('Partager les informations de retour avant le début de la soirée.')
  ) as v(label) returning id
),
_cl27_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl27.id, v.label, 'todo', false
  from cl27 cross join (values
    ('Confirmer l''heure souhaitée de départ avec la coordination.'),
    ('Prévenir le chauffeur suffisamment tôt.'),
    ('Vérifier l''accès du véhicule au point de prise en charge.'),
    ('Vérifier que les effets personnels ont été chargés.'),
    ('Vérifier que les personnes responsables des opérations restantes sont informées.'),
    ('Accompagner les mariés jusqu''au véhicule sans leur transférer les tâches de clôture.')
  ) as v(label) returning id
),
_cl28_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl28.id, v.label, 'todo', false
  from cl28 cross join (values
    ('Vérifier les éventuels suppléments de chauffeur.'),
    ('Récupérer les justificatifs de transport nécessaires.'),
    ('Transmettre les dépenses au pôle Finance & administratif.'),
    ('Vérifier qu''aucun remboursement de covoiturage convenu n''est oublié.'),
    ('Archiver les coordonnées des prestataires de transport.'),
    ('Clôturer les éventuels incidents ou réclamations.')
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
sq_eglise_celebr as materialized (
  select id from _20270628_event_sequences
  where name in ('Bénédiction à l''église', 'Célébration de mariage')
),
sq_convivial_celebr as materialized (
  select id from _20270628_event_sequences
  where name in ('Moment convivial entre amis', 'Célébration de mariage')
),
sq_celebr as materialized (
  select id from _20270628_event_sequences
  where name = 'Célébration de mariage'
),

-- ─── LIENS MISSION ↔ SÉQUENCE ────────────────────────────────────────────────
-- m1–m6, m15, m17–m25 → all 7
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
-- m7 → Mariage civil + Goûter d'honneur
_ms7 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m7.id, s.id
  from m7
  cross join (
    select id from _20270628_event_sequences
    where name in ('Mariage civil', 'Goûter d''honneur')
  ) s
  returning mission_id
),
-- m8 → Moment convivial entre amis
_ms8 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m8.id, s.id
  from m8
  cross join (select id from _20270628_event_sequences where name = 'Moment convivial entre amis') s
  returning mission_id
),
-- m9 → Pique-nique partagé + Bénédiction au khane
_ms9 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m9.id, s.id
  from m9
  cross join (
    select id from _20270628_event_sequences
    where name in ('Pique-nique partagé', 'Bénédiction au khane')
  ) s
  returning mission_id
),
-- m10 → Bénédiction au khane
_ms10 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m10.id, s.id
  from m10
  cross join (select id from _20270628_event_sequences where name = 'Bénédiction au khane') s
  returning mission_id
),
-- m11 → Bénédiction à l'église
_ms11 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m11.id, s.id
  from m11
  cross join (select id from _20270628_event_sequences where name = 'Bénédiction à l''église') s
  returning mission_id
),
-- m12, m13 → Église + Célébration
_ms12 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m12.id, sq_eglise_celebr.id from m12 cross join sq_eglise_celebr returning mission_id
),
_ms13 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m13.id, sq_eglise_celebr.id from m13 cross join sq_eglise_celebr returning mission_id
),
-- m14 → Célébration only
_ms14 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m14.id, sq_celebr.id from m14 cross join sq_celebr returning mission_id
),
_ms15 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m15.id, sq_all_7.id from m15 cross join sq_all_7 returning mission_id
),
-- m16 → Convivial + Célébration
_ms16 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m16.id, sq_convivial_celebr.id from m16 cross join sq_convivial_celebr returning mission_id
),
_ms17 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m17.id, sq_all_7.id from m17 cross join sq_all_7 returning mission_id
),
_ms18 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m18.id, sq_all_7.id from m18 cross join sq_all_7 returning mission_id
),
_ms19 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m19.id, sq_all_7.id from m19 cross join sq_all_7 returning mission_id
),
_ms20 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m20.id, sq_all_7.id from m20 cross join sq_all_7 returning mission_id
),
_ms21 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m21.id, sq_all_7.id from m21 cross join sq_all_7 returning mission_id
),
_ms22 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m22.id, sq_all_7.id from m22 cross join sq_all_7 returning mission_id
),
_ms23 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m23.id, sq_all_7.id from m23 cross join sq_all_7 returning mission_id
),
_ms24 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m24.id, sq_all_7.id from m24 cross join sq_all_7 returning mission_id
),
_ms25 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m25.id, sq_all_7.id from m25 cross join sq_all_7 returning mission_id
),
-- m26 → Convivial + Célébration
_ms26 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m26.id, sq_convivial_celebr.id from m26 cross join sq_convivial_celebr returning mission_id
),
-- m27 → Célébration only
_ms27 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m27.id, sq_celebr.id from m27 cross join sq_celebr returning mission_id
)
-- m28 → aucune séquence

select
  (select count(*) from p)                        as poles,
  (select count(*) from d_mobilite)
  + (select count(*) from d_transport_maries)
  + (select count(*) from d_parents)
  + (select count(*) from d_vendredi)
  + (select count(*) from d_samedi)
  + (select count(*) from d_dimanche)
  + (select count(*) from d_lundi_eglise)
  + (select count(*) from d_eglise_ostara)
  + (select count(*) from d_ostara)
  + (select count(*) from d_statio)
  + (select count(*) from d_covoit)
  + (select count(*) from d_presta)
  + (select count(*) from d_bagages)
  + (select count(*) from d_planb)
  + (select count(*) from d_commu)
  + (select count(*) from d_exec)
  + (select count(*) from d_retours)
  + (select count(*) from d_cloture)             as domaines,
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
  + (select count(*) from m28)                   as missions,
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
  + (select count(*) from _cl28_items)           as checklist_items,
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
  + (select count(*) from _ms27)                 as mission_sequences;
