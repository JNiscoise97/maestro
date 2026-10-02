-- seed_patch_audit_fiancailles.sql
-- Reprend les besoins identifiés parmi les 27 anciens éléments "À récupérer" de l'audit
-- des 1 782 anciennes lignes fiançailles (27 lignes → 26 items après déduplification).
-- 5 nouveaux domaines, 7 missions, 26 nouveaux checklist items, 4 liens mission ↔ séquence.
-- NE SUPPRIME AUCUNE DONNÉE EXISTANTE.

with

-- ─── PÔLES EXISTANTS (lecture seule) ─────────────────────────────────────────
p_finance as materialized (
  select id from _20270628_poles where name = 'Finance & administratif'
),
p_confort as materialized (
  select id from _20270628_poles where name = 'Confort & accompagnement'
),
p_invites as materialized (
  select id from _20270628_poles where name = 'Invités & accueil'
),
p_cere as materialized (
  select id from _20270628_poles where name = 'Cérémonies & animation'
),
p_lieu as materialized (
  select id from _20270628_poles where name = 'Lieu & prestataires'
),

-- ─── NOUVEAUX DOMAINES ───────────────────────────────────────────────────────
d_urne as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p_finance.id,
    'Urne & dons', 'urne-dons', null
  from p_finance returning id
),
d_parents as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p_confort.id,
    'Attentions aux parents', 'attentions-parents', 'avant'
  from p_confort returning id
),
d_heberg as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p_invites.id,
    'Hébergement des proches', 'hebergement-proches', 'avant'
  from p_invites returning id
),
d_mc as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p_cere.id,
    'Maître de cérémonie', 'maitre-ceremonie', 'avant'
  from p_cere returning id
),
d_debrief as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p_lieu.id,
    'Débrief & retour d''expérience', 'debrief-retour-experience', 'apres'
  from p_lieu returning id
),

-- ─── MISSIONS ────────────────────────────────────────────────────────────────
m_urne_avant as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_urne.id,
    'Préparer l''urne et désigner un gardien'
  from d_urne returning id
),
m_urne_jour as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_urne.id,
    'Surveiller et sécuriser l''urne'
  from d_urne returning id
),
m_urne_fin as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_urne.id,
    'Inventorier et restituer l''urne'
  from d_urne returning id
),
m_parents as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_parents.id,
    'Préparer une attention pour les parents'
  from d_parents returning id
),
m_heberg as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_heberg.id,
    'Organiser l''hébergement des proches venant de loin'
  from d_heberg returning id
),
m_mc as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_mc.id,
    'Désigner et préparer le maître de cérémonie'
  from d_mc returning id
),
m_debrief as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_debrief.id,
    'Réaliser le débrief et laisser des avis prestataires'
  from d_debrief returning id
),

-- ─── CHECKLISTS ──────────────────────────────────────────────────────────────
cl_urne_avant as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m_urne_avant.id,
    'Préparer l''urne et désigner un gardien'
  from m_urne_avant returning id
),
cl_urne_jour as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m_urne_jour.id,
    'Surveiller et sécuriser l''urne'
  from m_urne_jour returning id
),
cl_urne_fin as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m_urne_fin.id,
    'Inventorier et restituer l''urne'
  from m_urne_fin returning id
),
cl_parents as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m_parents.id,
    'Préparer une attention pour les parents'
  from m_parents returning id
),
cl_heberg as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m_heberg.id,
    'Organiser l''hébergement des proches venant de loin'
  from m_heberg returning id
),
cl_mc as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m_mc.id,
    'Désigner et préparer le maître de cérémonie'
  from m_mc returning id
),
cl_debrief as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m_debrief.id,
    'Réaliser le débrief et laisser des avis prestataires'
  from m_debrief returning id
),

-- ─── CHECKLIST ITEMS ─────────────────────────────────────────────────────────
-- Urne & dons — Avant (3 items)
_urne_avant_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl_urne_avant.id, v.label, 'todo', false
  from cl_urne_avant cross join (values
    ('Préparer l''emplacement destiné à recevoir l''urne.'),
    ('Choisir et préparer l''urne ou boîte sécurisée.'),
    ('Désigner une personne de confiance pour gérer l''urne toute la soirée.')
  ) as v(label) returning id
),
-- Urne & dons — Jour J (5 items)
_urne_jour_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl_urne_jour.id, v.label, 'todo', false
  from cl_urne_jour cross join (values
    ('Installer l''urne à son emplacement visible et surveillé dès le début.'),
    ('Surveiller l''urne tout au long de la soirée.'),
    ('Réceptionner et sécuriser les éventuels cadeaux physiques.'),
    ('Récupérer et sécuriser l''urne en fin de soirée (avant les adieux).'),
    ('Remettre l''urne et les cadeaux aux mariés ou à une personne désignée.')
  ) as v(label) returning id
),
-- Urne & dons — Désinstallation (5 items)
_urne_fin_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl_urne_fin.id, v.label, 'todo', false
  from cl_urne_fin cross join (values
    ('Retirer l''urne de son emplacement.'),
    ('Vérifier l''inventaire du contenu de l''urne avec le référent désigné.'),
    ('Inventorier le contenu de l''urne en présence de témoins.'),
    ('Lister les donateurs pour les remerciements personnalisés.'),
    ('Remettre l''urne et les cadeaux physiques aux mariés de façon sécurisée.')
  ) as v(label) returning id
),
-- Attentions aux parents — Avant (2 items)
_parents_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl_parents.id, v.label, 'todo', false
  from cl_parents cross join (values
    ('Décider si on prévoit un cadeau ou une attention pour les parents.'),
    ('Si oui : choisir le type, commander avec un délai compatible, organiser la distribution le jour J.')
  ) as v(label) returning id
),
-- Hébergement des proches — Avant (2 items)
_heberg_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl_heberg.id, v.label, 'todo', false
  from cl_heberg cross join (values
    ('Vérifier que tous les invités venant de loin ont bien reçu le guide hébergement.'),
    ('Demander qui loge où et centraliser les informations.')
  ) as v(label) returning id
),
-- Maître de cérémonie — Avant (2 items)
_mc_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl_mc.id, v.label, 'todo', false
  from cl_mc cross join (values
    ('Désigner un MC ou coordinateur des discours pour assurer les transitions.'),
    ('Réaliser un micro-test avec les parents et les intervenants désignés.')
  ) as v(label) returning id
),
-- Débrief & retour d'expérience — Après (7 items)
_debrief_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl_debrief.id, v.label, 'todo', false
  from cl_debrief cross join (values
    ('Laisser des avis Google ou sur les plateformes pour les prestataires qui l''ont mérité.'),
    ('Garder les coordonnées des prestataires pour de futurs événements.'),
    ('Faire un debriefing informel avec le coordinateur général pour noter les points à améliorer.'),
    ('Identifier les points forts de l''événement.'),
    ('Identifier les difficultés rencontrées.'),
    ('Noter les améliorations pour les futurs événements.'),
    ('Conserver les enseignements issus du déroulé.')
  ) as v(label) returning id
),

-- ─── SÉQUENCES ───────────────────────────────────────────────────────────────
sq_celebr as materialized (
  select id from _20270628_event_sequences
  where name = 'Célébration de mariage'
),

-- ─── LIENS MISSION ↔ SÉQUENCE ────────────────────────────────────────────────
-- Urne (3 missions) + MC (1 mission) → Célébration de mariage uniquement
-- m_parents  → aucune séquence (transversal, moment de remise non décidé)
-- m_heberg   → aucune séquence (concerne le mariage globalement, pas une séquence)
-- m_debrief  → aucune séquence (post-événement)
_ms_urne_avant as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m_urne_avant.id, sq_celebr.id from m_urne_avant cross join sq_celebr
  returning mission_id
),
_ms_urne_jour as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m_urne_jour.id, sq_celebr.id from m_urne_jour cross join sq_celebr
  returning mission_id
),
_ms_urne_fin as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m_urne_fin.id, sq_celebr.id from m_urne_fin cross join sq_celebr
  returning mission_id
),
_ms_mc as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m_mc.id, sq_celebr.id from m_mc cross join sq_celebr
  returning mission_id
)

select
  (select count(*) from d_urne) + (select count(*) from d_parents)
  + (select count(*) from d_heberg) + (select count(*) from d_mc)
  + (select count(*) from d_debrief)                              as domaines,
  (select count(*) from m_urne_avant) + (select count(*) from m_urne_jour)
  + (select count(*) from m_urne_fin) + (select count(*) from m_parents)
  + (select count(*) from m_heberg) + (select count(*) from m_mc)
  + (select count(*) from m_debrief)                             as missions,
  (select count(*) from _urne_avant_items) + (select count(*) from _urne_jour_items)
  + (select count(*) from _urne_fin_items) + (select count(*) from _parents_items)
  + (select count(*) from _heberg_items) + (select count(*) from _mc_items)
  + (select count(*) from _debrief_items)                        as checklist_items,
  (select count(*) from _ms_urne_avant) + (select count(*) from _ms_urne_jour)
  + (select count(*) from _ms_urne_fin) + (select count(*) from _ms_mc) as mission_sequences;
