-- seed_tenues_preparation_personnelle_mariage.sql
-- Pôle "Tenues & préparation personnelle" – script de seed complet (sort_order = 7)

delete from _20270628_poles where name = 'Tenues & préparation personnelle';

with
-- ─── PÔLE ────────────────────────────────────────────────────────────────────
p as materialized (
  insert into _20270628_poles (id, name, sort_order)
  values (gen_random_uuid(), 'Tenues & préparation personnelle', 7)
  returning id
),

-- ─── DOMAINES ────────────────────────────────────────────────────────────────
d_plan as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Plan vestimentaire', 'plan-vestimentaire', 'avant'
  from p returning id
),
d_sarah as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Tenues de Sarah', 'tenues-sarah', 'avant'
  from p returning id
),
d_jordan as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Tenues de Jordan', 'tenues-jordan', 'avant'
  from p returning id
),
d_cortege as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Cortège & témoins', 'cortege-temoins', 'avant'
  from p returning id
),
d_enfants as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Tenues des enfants', 'tenues-enfants', 'avant'
  from p returning id
),
d_beaute as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Beauté & préparation', 'beaute-preparation', 'avant'
  from p returning id
),
d_alliances as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Alliances & objets personnels', 'alliances-objets-personnels', 'avant'
  from p returning id
),
d_conditionnement as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Conditionnement des tenues', 'conditionnement-tenues', 'avant'
  from p returning id
),
d_controles as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Contrôles finaux', 'controles-finaux', null
  from p returning id
),
d_habillage as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Habillage & retouches', 'habillage-retouches', 'jour_j'
  from p returning id
),
d_rangement as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Rangement & entretien', 'rangement-entretien', null
  from p returning id
),

-- ─── MISSIONS ────────────────────────────────────────────────────────────────
m1 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_plan.id,
    'Définir le plan des tenues des mariés sur les quatre jours'
  from d_plan returning id
),
m2 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_plan.id,
    'Définir la coordination visuelle du cortège'
  from d_plan returning id
),
m3 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_sarah.id,
    'Choisir et valider les tenues de Sarah'
  from d_sarah returning id
),
m4 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_sarah.id,
    'Organiser les essayages et retouches des tenues de Sarah'
  from d_sarah returning id
),
m5 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_sarah.id,
    'Préparer les accessoires de Sarah'
  from d_sarah returning id
),
m6 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_jordan.id,
    'Choisir et valider les tenues de Jordan'
  from d_jordan returning id
),
m7 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_jordan.id,
    'Organiser les essayages et retouches des tenues de Jordan'
  from d_jordan returning id
),
m8 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_jordan.id,
    'Préparer les accessoires de Jordan'
  from d_jordan returning id
),
m9 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_cortege.id,
    'Confirmer les personnes composant le cortège'
  from d_cortege returning id
),
m10 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_cortege.id,
    'Communiquer les consignes vestimentaires au cortège'
  from d_cortege returning id
),
m11 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_cortege.id,
    'Suivre l''acquisition des tenues du cortège'
  from d_cortege returning id
),
m12 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_cortege.id,
    'Définir ce qui est financé pour le cortège'
  from d_cortege returning id
),
m13 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_enfants.id,
    'Choisir et préparer les tenues des enfants du cortège'
  from d_enfants returning id
),
m14 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_beaute.id,
    'Définir la préparation beauté de Sarah'
  from d_beaute returning id
),
m15 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_beaute.id,
    'Planifier la préparation personnelle de Jordan'
  from d_beaute returning id
),
m16 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_beaute.id,
    'Construire les plannings d''habillage et de préparation'
  from d_beaute returning id
),
m17 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_alliances.id,
    'Préparer les alliances pour les cérémonies'
  from d_alliances returning id
),
m18 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_alliances.id,
    'Préparer les objets personnels indispensables des mariés'
  from d_alliances returning id
),
m19 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_conditionnement.id,
    'Préparer les tenues complètes par séquence'
  from d_conditionnement returning id
),
m20 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_conditionnement.id,
    'Organiser le transport des tenues entre les lieux'
  from d_conditionnement returning id
),
m21 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_conditionnement.id,
    'Préparer les kits de secours vestimentaires'
  from d_conditionnement returning id
),
m22 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_controles.id,
    'Effectuer le contrôle vestimentaire final avant le mariage'
  from d_controles returning id
),
m23 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_controles.id,
    'Contrôler les tenues avant chaque préparation'
  from d_controles returning id
),
m24 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_habillage.id,
    'Assister la préparation et l''habillage de Sarah'
  from d_habillage returning id
),
m25 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_habillage.id,
    'Assister la préparation et l''habillage de Jordan'
  from d_habillage returning id
),
m26 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_habillage.id,
    'Gérer les changements de tenue et retouches pendant les événements'
  from d_habillage returning id
),
m27 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_rangement.id,
    'Récupérer et sécuriser les tenues après chaque séquence'
  from d_rangement returning id
),
m28 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_rangement.id,
    'Gérer l''entretien et la conservation des tenues après le mariage'
  from d_rangement returning id
),

-- ─── CHECKLISTS ──────────────────────────────────────────────────────────────
cl1 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m1.id,
    'Définir le plan des tenues des mariés sur les quatre jours'
  from m1 returning id
),
cl2 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m2.id,
    'Définir la coordination visuelle du cortège'
  from m2 returning id
),
cl3 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m3.id,
    'Choisir et valider les tenues de Sarah'
  from m3 returning id
),
cl4 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m4.id,
    'Organiser les essayages et retouches des tenues de Sarah'
  from m4 returning id
),
cl5 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m5.id,
    'Préparer les accessoires de Sarah'
  from m5 returning id
),
cl6 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m6.id,
    'Choisir et valider les tenues de Jordan'
  from m6 returning id
),
cl7 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m7.id,
    'Organiser les essayages et retouches des tenues de Jordan'
  from m7 returning id
),
cl8 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m8.id,
    'Préparer les accessoires de Jordan'
  from m8 returning id
),
cl9 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m9.id,
    'Confirmer les personnes composant le cortège'
  from m9 returning id
),
cl10 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m10.id,
    'Communiquer les consignes vestimentaires au cortège'
  from m10 returning id
),
cl11 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m11.id,
    'Suivre l''acquisition des tenues du cortège'
  from m11 returning id
),
cl12 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m12.id,
    'Définir ce qui est financé pour le cortège'
  from m12 returning id
),
cl13 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m13.id,
    'Choisir et préparer les tenues des enfants du cortège'
  from m13 returning id
),
cl14 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m14.id,
    'Définir la préparation beauté de Sarah'
  from m14 returning id
),
cl15 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m15.id,
    'Planifier la préparation personnelle de Jordan'
  from m15 returning id
),
cl16 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m16.id,
    'Construire les plannings d''habillage et de préparation'
  from m16 returning id
),
cl17 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m17.id,
    'Préparer les alliances pour les cérémonies'
  from m17 returning id
),
cl18 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m18.id,
    'Préparer les objets personnels indispensables des mariés'
  from m18 returning id
),
cl19 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m19.id,
    'Préparer les tenues complètes par séquence'
  from m19 returning id
),
cl20 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m20.id,
    'Organiser le transport des tenues entre les lieux'
  from m20 returning id
),
cl21 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m21.id,
    'Préparer les kits de secours vestimentaires'
  from m21 returning id
),
cl22 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m22.id,
    'Effectuer le contrôle vestimentaire final avant le mariage'
  from m22 returning id
),
cl23 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m23.id,
    'Contrôler les tenues avant chaque préparation'
  from m23 returning id
),
cl24 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m24.id,
    'Assister la préparation et l''habillage de Sarah'
  from m24 returning id
),
cl25 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m25.id,
    'Assister la préparation et l''habillage de Jordan'
  from m25 returning id
),
cl26 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m26.id,
    'Gérer les changements de tenue et retouches pendant les événements'
  from m26 returning id
),
cl27 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m27.id,
    'Récupérer et sécuriser les tenues après chaque séquence'
  from m27 returning id
),
cl28 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m28.id,
    'Gérer l''entretien et la conservation des tenues après le mariage'
  from m28 returning id
),

-- ─── CHECKLIST ITEMS ─────────────────────────────────────────────────────────
_cl1_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl1.id, v.label, 'todo', false
  from cl1 cross join (values
    ('Lister les tenues nécessaires pour Sarah par séquence.'),
    ('Lister les tenues nécessaires pour Jordan par séquence.'),
    ('Identifier les tenues pouvant être réutilisées au cours du week-end.'),
    ('Identifier les éventuels changements de tenue au sein d''une même séquence.'),
    ('Définir le niveau de formalité attendu pour chaque moment.'),
    ('Vérifier la cohérence des tenues avec les lieux et les cérémonies.'),
    ('Documenter la tenue complète prévue pour chaque séquence.')
  ) as v(label) returning id
),
_cl2_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl2.id, v.label, 'todo', false
  from cl2 cross join (values
    ('Lister les membres du cortège concernés.'),
    ('Distinguer témoins, autres membres du cortège et enfants.'),
    ('Définir les couleurs retenues pour les différents groupes.'),
    ('Définir les règles d''assortiment entre tenues féminines et accessoires masculins.'),
    ('Définir une solution estivale confortable pour les tenues masculines.'),
    ('Vérifier que les couleurs et pièces choisies sont faciles à trouver.'),
    ('Préparer des références visuelles claires à transmettre au cortège.')
  ) as v(label) returning id
),
_cl3_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl3.id, v.label, 'todo', false
  from cl3 cross join (values
    ('Définir la tenue prévue pour le mariage civil.'),
    ('Définir la tenue prévue pour le goûter d''honneur si différente.'),
    ('Définir la tenue prévue pour le samedi.'),
    ('Définir la tenue adaptée au dimanche et au khane.'),
    ('Définir la tenue prévue pour la bénédiction à l''église.'),
    ('Définir la tenue prévue pour la célébration à Ostara.'),
    ('Identifier les éventuels changements de tenue pendant la réception.'),
    ('Vérifier la compatibilité de chaque tenue avec les déplacements et activités prévus.')
  ) as v(label) returning id
),
_cl4_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl4.id, v.label, 'todo', false
  from cl4 cross join (values
    ('Planifier les essayages nécessaires.'),
    ('Tester chaque tenue avec les sous-vêtements prévus.'),
    ('Tester chaque tenue avec les chaussures prévues.'),
    ('Identifier les retouches nécessaires.'),
    ('Planifier les retouches avec une marge suffisante.'),
    ('Effectuer un essayage après retouches.'),
    ('Vérifier la possibilité de marcher, s''asseoir et danser confortablement.'),
    ('Faire un dernier contrôle à l''approche du mariage.')
  ) as v(label) returning id
),
_cl5_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl5.id, v.label, 'todo', false
  from cl5 cross join (values
    ('Lister les bijoux prévus pour chaque tenue.'),
    ('Choisir les chaussures associées à chaque tenue.'),
    ('Prévoir une paire de chaussures de secours ou plus confortable.'),
    ('Lister les accessoires de cheveux.'),
    ('Prévoir les éventuels voiles, étoles ou accessoires cérémoniels.'),
    ('Préparer les sous-vêtements adaptés.'),
    ('Identifier les accessoires devant être transférés d''une tenue à l''autre.'),
    ('Conditionner les accessoires par séquence.')
  ) as v(label) returning id
),
_cl6_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl6.id, v.label, 'todo', false
  from cl6 cross join (values
    ('Définir la tenue prévue pour le mariage civil.'),
    ('Définir la tenue prévue pour le goûter d''honneur si différente.'),
    ('Définir la tenue prévue pour le samedi.'),
    ('Définir la tenue adaptée au dimanche et au khane.'),
    ('Définir la tenue prévue pour la bénédiction à l''église.'),
    ('Définir la tenue prévue pour la célébration à Ostara.'),
    ('Identifier les éventuels changements de tenue pendant la réception.'),
    ('Vérifier le confort des tenues pour la chaleur de fin juin.')
  ) as v(label) returning id
),
_cl7_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl7.id, v.label, 'todo', false
  from cl7 cross join (values
    ('Planifier les essayages nécessaires.'),
    ('Tester les vestes avec les chemises prévues.'),
    ('Tester les pantalons avec les chaussures prévues.'),
    ('Vérifier les longueurs de manches et pantalons.'),
    ('Identifier les retouches nécessaires.'),
    ('Effectuer un essayage après retouches.'),
    ('Tester le confort assis et en mouvement.'),
    ('Faire un dernier contrôle à l''approche du mariage.')
  ) as v(label) returning id
),
_cl8_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl8.id, v.label, 'todo', false
  from cl8 cross join (values
    ('Lister les chaussures prévues pour chaque tenue.'),
    ('Lister les cravates, nœuds papillon ou autres accessoires.'),
    ('Préparer les ceintures ou bretelles nécessaires.'),
    ('Préparer les chaussettes adaptées à chaque tenue.'),
    ('Préparer les boutons de manchette si utilisés.'),
    ('Prévoir une chemise de secours pour les séquences longues ou chaudes.'),
    ('Prévoir les éléments nécessaires à une retouche rapide de la tenue.'),
    ('Conditionner les accessoires par séquence.')
  ) as v(label) returning id
),
_cl9_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl9.id, v.label, 'todo', false
  from cl9 cross join (values
    ('Établir la liste définitive des membres du cortège.'),
    ('Identifier les deux témoins garçons concernés par la tenue coordonnée.'),
    ('Identifier les deux témoins filles concernées par la tenue coordonnée.'),
    ('Identifier les autres garçons et filles du cortège.'),
    ('Identifier les deux enfants du cortège.'),
    ('Confirmer la participation de chacun.'),
    ('Associer chaque personne aux séquences auxquelles sa tenue coordonnée est attendue.')
  ) as v(label) returning id
),
_cl10_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl10.id, v.label, 'todo', false
  from cl10 cross join (values
    ('Préparer un message clair présentant la tenue attendue.'),
    ('Transmettre les couleurs exactes ou références visuelles.'),
    ('Préciser les pièces obligatoires et celles laissées au choix.'),
    ('Préciser les contraintes de longueur ou de style si nécessaire.'),
    ('Préciser la solution retenue pour les tenues masculines en été.'),
    ('Indiquer la date limite souhaitée pour l''achat.'),
    ('Demander une photo ou validation avant achat lorsque nécessaire.'),
    ('Rappeler que le confort doit rester compatible avec une journée longue.')
  ) as v(label) returning id
),
_cl11_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl11.id, v.label, 'todo', false
  from cl11 cross join (values
    ('Vérifier que chaque membre a trouvé sa tenue.'),
    ('Identifier rapidement les difficultés de taille ou de disponibilité.'),
    ('Vérifier la conformité générale des couleurs.'),
    ('Vérifier les accessoires masculins assortis.'),
    ('Suivre les éventuelles commandes en ligne.'),
    ('Prévoir une solution de remplacement en cas de rupture ou retard.'),
    ('Faire un point global suffisamment tôt avant le mariage.')
  ) as v(label) returning id
),
_cl12_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl12.id, v.label, 'todo', false
  from cl12 cross join (values
    ('Lister les pièces que Sarah et Jordan souhaitent financer.'),
    ('Lister les pièces restant à la charge des participants.'),
    ('Définir un budget maximum pour les éléments financés.'),
    ('Définir la méthode d''achat ou de remboursement.'),
    ('Conserver les justificatifs nécessaires.'),
    ('Informer clairement chaque personne de ce qui est ou non pris en charge.')
  ) as v(label) returning id
),
_cl13_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl13.id, v.label, 'todo', false
  from cl13 cross join (values
    ('Définir le style et les couleurs des deux tenues enfants.'),
    ('Choisir des vêtements adaptés à la chaleur.'),
    ('Prévoir des chaussures confortables.'),
    ('Tenir compte de la croissance jusqu''en juin 2027.'),
    ('Éviter les achats définitifs trop précoces lorsque la taille peut évoluer.'),
    ('Planifier un essayage suffisamment proche du mariage.'),
    ('Prévoir une tenue ou solution de secours en cas de tache ou accident.')
  ) as v(label) returning id
),
_cl14_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl14.id, v.label, 'todo', false
  from cl14 cross join (values
    ('Définir les besoins en coiffure pour chaque journée concernée.'),
    ('Définir les besoins en maquillage pour chaque journée concernée.'),
    ('Choisir les prestataires ou personnes chargées de la préparation.'),
    ('Planifier les essais coiffure nécessaires.'),
    ('Planifier les essais maquillage nécessaires.'),
    ('Tester la tenue du résultat sur plusieurs heures.'),
    ('Prévoir les adaptations nécessaires entre cérémonie et soirée.'),
    ('Préparer les références visuelles validées.')
  ) as v(label) returning id
),
_cl15_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl15.id, v.label, 'todo', false
  from cl15 cross join (values
    ('Définir la coiffure prévue à l''approche du mariage.'),
    ('Planifier la coupe suffisamment proche des événements.'),
    ('Définir la préparation de la barbe ou du rasage.'),
    ('Prévoir les soins personnels utiles avant les quatre jours.'),
    ('Prévoir le nécessaire pour les retouches pendant les journées.'),
    ('Éviter les changements esthétiques non testés juste avant le mariage.')
  ) as v(label) returning id
),
_cl16_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl16.id, v.label, 'todo', false
  from cl16 cross join (values
    ('Estimer le temps nécessaire à la préparation de Sarah.'),
    ('Estimer le temps nécessaire à la préparation de Jordan.'),
    ('Intégrer les temps de coiffure et maquillage.'),
    ('Intégrer les temps de photo et vidéo des préparatifs les jours concernés.'),
    ('Prévoir une marge avant les heures de départ.'),
    ('Identifier les personnes présentes pendant les préparatifs.'),
    ('Transmettre les horaires utiles au pôle Pilotage & coordination.')
  ) as v(label) returning id
),
_cl17_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl17.id, v.label, 'todo', false
  from cl17 cross join (values
    ('Confirmer les alliances définitives.'),
    ('Vérifier les tailles.'),
    ('Prévoir les éventuelles gravures.'),
    ('Contrôler les alliances après réception.'),
    ('Définir la ou les cérémonies pendant lesquelles elles seront utilisées.'),
    ('Définir la personne chargée de les conserver avant chaque cérémonie.'),
    ('Prévoir leur écrin ou support.'),
    ('Définir la procédure de transfert des alliances entre les journées.')
  ) as v(label) returning id
),
_cl18_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl18.id, v.label, 'todo', false
  from cl18 cross join (values
    ('Lister les pièces d''identité nécessaires.'),
    ('Lister les bijoux et accessoires de valeur.'),
    ('Lister les médicaments ou produits personnels nécessaires sans les confier inutilement à plusieurs personnes.'),
    ('Lister les téléphones, chargeurs et batteries externes.'),
    ('Lister les clés et moyens de paiement nécessaires.'),
    ('Attribuer une personne ou un contenant sécurisé pour les objets non portés.'),
    ('Vérifier le contenu avant chaque départ important.')
  ) as v(label) returning id
),
_cl19_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl19.id, v.label, 'todo', false
  from cl19 cross join (values
    ('Regrouper chaque tenue avec ses accessoires.'),
    ('Ajouter les chaussures correspondantes.'),
    ('Ajouter les sous-vêtements et chaussettes nécessaires.'),
    ('Ajouter les bijoux ou accessoires prévus.'),
    ('Ajouter une photo ou liste de référence si plusieurs ensembles se ressemblent.'),
    ('Étiqueter chaque housse ou contenant par personne et séquence.'),
    ('Séparer les éléments nécessitant un transport particulier.'),
    ('Vérifier chaque ensemble à l''aide d''une checklist avant fermeture.')
  ) as v(label) returning id
),
_cl20_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl20.id, v.label, 'todo', false
  from cl20 cross join (values
    ('Identifier où chaque tenue doit se trouver avant utilisation.'),
    ('Identifier qui transporte chaque housse ou valise.'),
    ('Éviter de laisser les tenues indispensables dans un véhicule non accessible.'),
    ('Prévoir le transfert des tenues nécessaires au dimanche.'),
    ('Prévoir le transfert des tenues nécessaires au lundi.'),
    ('Identifier les vêtements devant rester suspendus.'),
    ('Prévoir une solution pour protéger les tenues de la pluie ou des salissures.'),
    ('Confirmer la bonne arrivée des tenues critiques.')
  ) as v(label) returning id
),
_cl21_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl21.id, v.label, 'todo', false
  from cl21 cross join (values
    ('Préparer un mini kit couture.'),
    ('Préparer des épingles de sûreté.'),
    ('Préparer du détachant adapté.'),
    ('Préparer un rouleau anti-peluches.'),
    ('Préparer du ruban adhésif textile ou fashion tape si utile.'),
    ('Préparer des pansements pour les chaussures.'),
    ('Prévoir des mouchoirs et lingettes utiles.'),
    ('Prévoir les produits de retouche coiffure ou maquillage nécessaires.')
  ) as v(label) returning id
),
_cl22_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl22.id, v.label, 'todo', false
  from cl22 cross join (values
    ('Vérifier que toutes les tenues des mariés sont présentes.'),
    ('Vérifier que toutes les retouches sont terminées.'),
    ('Vérifier que les vêtements sont propres et repassés.'),
    ('Vérifier toutes les chaussures.'),
    ('Vérifier tous les accessoires.'),
    ('Vérifier les alliances et leur écrin.'),
    ('Vérifier les tenues du cortège nécessitant encore une validation.'),
    ('Traiter immédiatement les derniers éléments manquants.')
  ) as v(label) returning id
),
_cl23_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl23.id, v.label, 'todo', false
  from cl23 cross join (values
    ('Vérifier que la tenue prévue est bien sur le lieu de préparation.'),
    ('Vérifier qu''aucun élément n''est froissé ou endommagé.'),
    ('Vérifier les chaussures et accessoires.'),
    ('Vérifier que les alliances sont avec la personne désignée lorsque nécessaire.'),
    ('Préparer les éléments dans l''ordre d''habillage.'),
    ('Signaler immédiatement tout élément manquant pour permettre une solution de secours.')
  ) as v(label) returning id
),
_cl24_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl24.id, v.label, 'todo', false
  from cl24 cross join (values
    ('Respecter l''heure de début de préparation.'),
    ('Préparer la tenue et les accessoires avant l''habillage.'),
    ('Coordonner coiffure et maquillage avec l''heure de départ.'),
    ('Prévoir le temps nécessaire aux photos des préparatifs les jours concernés.'),
    ('Effectuer les dernières retouches avant le départ.'),
    ('Vérifier que Sarah dispose des effets personnels nécessaires.'),
    ('Confirmer qu''elle est prête avec la marge prévue.')
  ) as v(label) returning id
),
_cl25_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl25.id, v.label, 'todo', false
  from cl25 cross join (values
    ('Respecter l''heure de début de préparation.'),
    ('Préparer la tenue et les accessoires avant l''habillage.'),
    ('Vérifier chemise, pantalon, veste et chaussures.'),
    ('Prévoir le temps nécessaire aux photos des préparatifs les jours concernés.'),
    ('Effectuer les dernières retouches avant le départ.'),
    ('Vérifier que Jordan dispose des effets personnels nécessaires.'),
    ('Confirmer qu''il est prêt avec la marge prévue.')
  ) as v(label) returning id
),
_cl26_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl26.id, v.label, 'todo', false
  from cl26 cross join (values
    ('Prévenir les mariés avant l''heure prévue du changement.'),
    ('Vérifier que la tenue suivante est prête.'),
    ('Préparer un espace permettant de se changer.'),
    ('Prévoir une personne d''assistance lorsque nécessaire.'),
    ('Ranger immédiatement la tenue retirée.'),
    ('Effectuer les retouches coiffure, maquillage ou tenue nécessaires.'),
    ('Informer la coordination lorsque les mariés sont prêts à reprendre le conducteur.')
  ) as v(label) returning id
),
_cl27_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl27.id, v.label, 'todo', false
  from cl27 cross join (values
    ('Récupérer les vêtements et accessoires retirés.'),
    ('Vérifier que les bijoux et objets de valeur sont sécurisés.'),
    ('Suspendre ou plier les tenues selon leur besoin.'),
    ('Isoler les vêtements tachés ou humides.'),
    ('Regrouper les chaussures et accessoires.'),
    ('Préparer les éléments nécessaires à la séquence suivante.')
  ) as v(label) returning id
),
_cl28_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl28.id, v.label, 'todo', false
  from cl28 cross join (values
    ('Identifier les tenues nécessitant un nettoyage professionnel.'),
    ('Faire nettoyer les tenues à conserver.'),
    ('Restituer les éléments loués ou empruntés.'),
    ('Vérifier les accessoires avant rangement.'),
    ('Définir les conditions de conservation des tenues importantes.'),
    ('Identifier les pièces pouvant être revendues ou données.'),
    ('Archiver les informations utiles sur les références et prestataires.')
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
sq_4 as materialized (
  select id from _20270628_event_sequences
  where name in (
    'Mariage civil',
    'Bénédiction au khane',
    'Bénédiction à l''église',
    'Célébration de mariage'
  )
),
sq_3 as materialized (
  select id from _20270628_event_sequences
  where name in (
    'Mariage civil',
    'Bénédiction à l''église',
    'Célébration de mariage'
  )
),

-- ─── LIENS MISSION ↔ SÉQUENCE ────────────────────────────────────────────────
-- m1, m3, m5, m6, m8, m18, m19, m20, m22, m27 → all 7
_ms1 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m1.id, sq_all_7.id from m1 cross join sq_all_7
  returning mission_id
),
_ms3 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m3.id, sq_all_7.id from m3 cross join sq_all_7
  returning mission_id
),
_ms5 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m5.id, sq_all_7.id from m5 cross join sq_all_7
  returning mission_id
),
_ms6 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m6.id, sq_all_7.id from m6 cross join sq_all_7
  returning mission_id
),
_ms8 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m8.id, sq_all_7.id from m8 cross join sq_all_7
  returning mission_id
),
_ms18 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m18.id, sq_all_7.id from m18 cross join sq_all_7
  returning mission_id
),
_ms19 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m19.id, sq_all_7.id from m19 cross join sq_all_7
  returning mission_id
),
_ms20 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m20.id, sq_all_7.id from m20 cross join sq_all_7
  returning mission_id
),
_ms22 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m22.id, sq_all_7.id from m22 cross join sq_all_7
  returning mission_id
),
_ms27 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m27.id, sq_all_7.id from m27 cross join sq_all_7
  returning mission_id
),
-- m4, m7, m14, m15, m16, m21, m23, m24, m25 → sq_4 (Civil+Khane+Église+Célébration)
_ms4 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m4.id, sq_4.id from m4 cross join sq_4
  returning mission_id
),
_ms7 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m7.id, sq_4.id from m7 cross join sq_4
  returning mission_id
),
_ms14 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m14.id, sq_4.id from m14 cross join sq_4
  returning mission_id
),
_ms15 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m15.id, sq_4.id from m15 cross join sq_4
  returning mission_id
),
_ms16 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m16.id, sq_4.id from m16 cross join sq_4
  returning mission_id
),
_ms21 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m21.id, sq_4.id from m21 cross join sq_4
  returning mission_id
),
_ms23 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m23.id, sq_4.id from m23 cross join sq_4
  returning mission_id
),
_ms24 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m24.id, sq_4.id from m24 cross join sq_4
  returning mission_id
),
_ms25 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m25.id, sq_4.id from m25 cross join sq_4
  returning mission_id
),
-- m2, m9, m10, m11, m12 → sq_3 (Civil+Église+Célébration)
_ms2 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m2.id, sq_3.id from m2 cross join sq_3
  returning mission_id
),
_ms9 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m9.id, sq_3.id from m9 cross join sq_3
  returning mission_id
),
_ms10 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m10.id, sq_3.id from m10 cross join sq_3
  returning mission_id
),
_ms11 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m11.id, sq_3.id from m11 cross join sq_3
  returning mission_id
),
_ms12 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m12.id, sq_3.id from m12 cross join sq_3
  returning mission_id
),
-- m13 → Église + Célébration (2)
_ms13 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m13.id, s.id
  from m13
  cross join (
    select id from _20270628_event_sequences
    where name in ('Bénédiction à l''église', 'Célébration de mariage')
  ) s
  returning mission_id
),
-- m17 → Civil + Église (2)
_ms17 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m17.id, s.id
  from m17
  cross join (
    select id from _20270628_event_sequences
    where name in ('Mariage civil', 'Bénédiction à l''église')
  ) s
  returning mission_id
),
-- m26 → Célébration only
_ms26 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m26.id, s.id
  from m26
  cross join (select id from _20270628_event_sequences where name = 'Célébration de mariage') s
  returning mission_id
)
-- m28 → aucune séquence

select
  (select count(*) from p)                    as poles,
  (select count(*) from d_plan)
  + (select count(*) from d_sarah)
  + (select count(*) from d_jordan)
  + (select count(*) from d_cortege)
  + (select count(*) from d_enfants)
  + (select count(*) from d_beaute)
  + (select count(*) from d_alliances)
  + (select count(*) from d_conditionnement)
  + (select count(*) from d_controles)
  + (select count(*) from d_habillage)
  + (select count(*) from d_rangement)        as domaines,
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
  + (select count(*) from m28)               as missions,
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
  + (select count(*) from _cl28_items)       as checklist_items,
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
  + (select count(*) from _ms27)             as mission_sequences;
