-- seed_communication_papeterie_mariage.sql
-- Pôle "Communication & papeterie" – script de seed complet (sort_order = 110)

delete from _20270628_poles where name = 'Communication & papeterie';

with
-- ─── PÔLE ────────────────────────────────────────────────────────────────────
p as materialized (
  insert into _20270628_poles (id, name, sort_order)
  values (gen_random_uuid(), 'Communication & papeterie', 110)
  returning id
),

-- ─── DOMAINES ────────────────────────────────────────────────────────────────
d_strategie as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Stratégie de communication', 'strategie-communication', 'avant'
  from p returning id
),
d_identite as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Identité graphique', 'identite-graphique', 'avant'
  from p returning id
),
d_invitations as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Save-the-date & invitations', 'save-the-date-invitations', 'avant'
  from p returning id
),
d_infos as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Informations pratiques', 'informations-pratiques', 'avant'
  from p returning id
),
d_numerique as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Communication numérique', 'communication-numerique', null
  from p returning id
),
d_civil as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Papeterie du mariage civil', 'papeterie-mariage-civil', 'avant'
  from p returning id
),
d_samedi as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Papeterie du samedi', 'papeterie-samedi', 'avant'
  from p returning id
),
d_khane as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Papeterie du khane', 'papeterie-khane', 'avant'
  from p returning id
),
d_eglise as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Papeterie de l''église', 'papeterie-eglise', 'avant'
  from p returning id
),
d_ostara as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Papeterie réception Ostara', 'papeterie-reception-ostara', 'avant'
  from p returning id
),
d_impression as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Impression & fabrication', 'impression-fabrication', 'avant'
  from p returning id
),
d_conditionnement as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Conditionnement & distribution', 'conditionnement-distribution', null
  from p returning id
),
d_mises_a_jour as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Mises à jour & corrections', 'mises-a-jour-corrections', null
  from p returning id
),
d_remerciements as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Remerciements', 'remerciements', null
  from p returning id
),
d_archives as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Archives & souvenirs papier', 'archives-souvenirs-papier', 'apres'
  from p returning id
),

-- ─── MISSIONS ────────────────────────────────────────────────────────────────
m1 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_strategie.id,
    'Définir l''architecture de communication du mariage'
  from d_strategie returning id
),
m2 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_strategie.id,
    'Définir le ton éditorial du mariage'
  from d_strategie returning id
),
m3 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_identite.id,
    'Définir l''identité visuelle de la papeterie'
  from d_identite returning id
),
m4 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_invitations.id,
    'Préparer le save-the-date'
  from d_invitations returning id
),
m5 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_invitations.id,
    'Concevoir l''invitation principale'
  from d_invitations returning id
),
m6 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_invitations.id,
    'Préparer les déclinaisons d''invitation par séquence'
  from d_invitations returning id
),
m7 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_invitations.id,
    'Préparer les invitations imprimées'
  from d_invitations returning id
),
m8 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_invitations.id,
    'Organiser l''envoi des invitations'
  from d_invitations returning id
),
m9 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_infos.id,
    'Créer le guide pratique général du mariage'
  from d_infos returning id
),
m10 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_infos.id,
    'Préparer les fiches pratiques par journée'
  from d_infos returning id
),
m11 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_infos.id,
    'Préparer les informations de transport et stationnement à diffuser'
  from d_infos returning id
),
m12 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_numerique.id,
    'Définir le support numérique central du mariage'
  from d_numerique returning id
),
m13 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_numerique.id,
    'Préparer les messages collectifs avant le mariage'
  from d_numerique returning id
),
m14 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_numerique.id,
    'Gérer les communications de dernière minute'
  from d_numerique returning id
),
m15 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_civil.id,
    'Préparer les supports utiles au vendredi'
  from d_civil returning id
),
m16 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_samedi.id,
    'Préparer les supports du moment convivial'
  from d_samedi returning id
),
m17 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_khane.id,
    'Préparer les informations et supports liés au khane'
  from d_khane returning id
),
m18 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_eglise.id,
    'Concevoir le livret de la bénédiction à l''église'
  from d_eglise returning id
),
m19 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_ostara.id,
    'Définir la papeterie nécessaire à la réception'
  from d_ostara returning id
),
m20 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_ostara.id,
    'Créer les supports de placement'
  from d_ostara returning id
),
m21 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_ostara.id,
    'Créer les supports liés à la restauration'
  from d_ostara returning id
),
m22 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_ostara.id,
    'Préparer les supports des temps forts de la réception'
  from d_ostara returning id
),
m23 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_impression.id,
    'Établir l''inventaire complet des impressions'
  from d_impression returning id
),
m24 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_impression.id,
    'Sélectionner et cadrer l''imprimeur'
  from d_impression returning id
),
m25 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_impression.id,
    'Valider les BAT avant production'
  from d_impression returning id
),
m26 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_impression.id,
    'Contrôler les impressions à réception'
  from d_impression returning id
),
m27 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_conditionnement.id,
    'Conditionner la papeterie par séquence'
  from d_conditionnement returning id
),
m28 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_conditionnement.id,
    'Attribuer la responsabilité des supports'
  from d_conditionnement returning id
),
m29 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_conditionnement.id,
    'Installer les supports imprimés'
  from d_conditionnement returning id
),
m30 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_mises_a_jour.id,
    'Gérer les modifications avant impression définitive'
  from d_mises_a_jour returning id
),
m31 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_mises_a_jour.id,
    'Préparer les corrections de dernière minute'
  from d_mises_a_jour returning id
),
m32 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_remerciements.id,
    'Préparer la stratégie de remerciement après mariage'
  from d_remerciements returning id
),
m33 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_remerciements.id,
    'Préparer et envoyer les remerciements'
  from d_remerciements returning id
),
m34 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_archives.id,
    'Conserver un exemplaire de la papeterie du mariage'
  from d_archives returning id
),

-- ─── CHECKLISTS ──────────────────────────────────────────────────────────────
cl1  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m1.id,  'Définir l''architecture de communication du mariage'      from m1  returning id),
cl2  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m2.id,  'Définir le ton éditorial du mariage'                       from m2  returning id),
cl3  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m3.id,  'Définir l''identité visuelle de la papeterie'              from m3  returning id),
cl4  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m4.id,  'Préparer le save-the-date'                                 from m4  returning id),
cl5  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m5.id,  'Concevoir l''invitation principale'                        from m5  returning id),
cl6  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m6.id,  'Préparer les déclinaisons d''invitation par séquence'      from m6  returning id),
cl7  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m7.id,  'Préparer les invitations imprimées'                        from m7  returning id),
cl8  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m8.id,  'Organiser l''envoi des invitations'                        from m8  returning id),
cl9  as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m9.id,  'Créer le guide pratique général du mariage'                from m9  returning id),
cl10 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m10.id, 'Préparer les fiches pratiques par journée'                 from m10 returning id),
cl11 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m11.id, 'Préparer les informations de transport et stationnement à diffuser' from m11 returning id),
cl12 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m12.id, 'Définir le support numérique central du mariage'           from m12 returning id),
cl13 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m13.id, 'Préparer les messages collectifs avant le mariage'         from m13 returning id),
cl14 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m14.id, 'Gérer les communications de dernière minute'               from m14 returning id),
cl15 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m15.id, 'Préparer les supports utiles au vendredi'                  from m15 returning id),
cl16 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m16.id, 'Préparer les supports du moment convivial'                 from m16 returning id),
cl17 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m17.id, 'Préparer les informations et supports liés au khane'       from m17 returning id),
cl18 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m18.id, 'Concevoir le livret de la bénédiction à l''église'         from m18 returning id),
cl19 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m19.id, 'Définir la papeterie nécessaire à la réception'            from m19 returning id),
cl20 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m20.id, 'Créer les supports de placement'                           from m20 returning id),
cl21 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m21.id, 'Créer les supports liés à la restauration'                 from m21 returning id),
cl22 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m22.id, 'Préparer les supports des temps forts de la réception'     from m22 returning id),
cl23 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m23.id, 'Établir l''inventaire complet des impressions'             from m23 returning id),
cl24 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m24.id, 'Sélectionner et cadrer l''imprimeur'                       from m24 returning id),
cl25 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m25.id, 'Valider les BAT avant production'                          from m25 returning id),
cl26 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m26.id, 'Contrôler les impressions à réception'                     from m26 returning id),
cl27 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m27.id, 'Conditionner la papeterie par séquence'                    from m27 returning id),
cl28 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m28.id, 'Attribuer la responsabilité des supports'                  from m28 returning id),
cl29 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m29.id, 'Installer les supports imprimés'                           from m29 returning id),
cl30 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m30.id, 'Gérer les modifications avant impression définitive'       from m30 returning id),
cl31 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m31.id, 'Préparer les corrections de dernière minute'               from m31 returning id),
cl32 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m32.id, 'Préparer la stratégie de remerciement après mariage'       from m32 returning id),
cl33 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m33.id, 'Préparer et envoyer les remerciements'                     from m33 returning id),
cl34 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m34.id, 'Conserver un exemplaire de la papeterie du mariage'        from m34 returning id),

-- ─── CHECKLIST ITEMS ─────────────────────────────────────────────────────────
_cl1_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl1.id, v.label, 'todo', false
  from cl1 cross join (values
    ('Lister les communications nécessaires avant, pendant et après le mariage.'),
    ('Distinguer les informations communes à tous les invités des informations propres à chaque séquence.'),
    ('Identifier les publics concernés par chaque journée.'),
    ('Définir quels contenus seront numériques et quels contenus seront imprimés.'),
    ('Définir les canaux principaux de communication avec les invités.'),
    ('Définir qui valide les communications avant diffusion.'),
    ('Centraliser les versions finales des textes et supports.')
  ) as v(label) returning id
),
_cl2_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl2.id, v.label, 'todo', false
  from cl2 cross join (values
    ('Définir le niveau de formalité souhaité.'),
    ('Définir la manière de présenter le format sur quatre jours.'),
    ('Définir une terminologie cohérente pour chaque temps du mariage.'),
    ('Définir la manière de présenter les deux bénédictions religieuses.'),
    ('Prévoir des formulations compréhensibles pour les invités peu familiers avec certaines traditions.'),
    ('Harmoniser les noms des lieux, horaires et événements sur tous les supports.'),
    ('Créer un document de référence avec les formulations validées.')
  ) as v(label) returning id
),
_cl3_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl3.id, v.label, 'todo', false
  from cl3 cross join (values
    ('Définir les couleurs principales de la papeterie.'),
    ('Choisir les typographies.'),
    ('Définir les motifs ou éléments graphiques récurrents.'),
    ('Assurer la cohérence avec l''univers Tropical élégant.'),
    ('Définir les règles d''utilisation des prénoms et de la date.'),
    ('Créer un modèle graphique réutilisable pour les différents supports.'),
    ('Vérifier la lisibilité des supports imprimés et numériques.')
  ) as v(label) returning id
),
_cl4_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl4.id, v.label, 'todo', false
  from cl4 cross join (values
    ('Déterminer les destinataires du save-the-date.'),
    ('Définir les informations indispensables à communiquer.'),
    ('Rédiger le texte.'),
    ('Créer la version graphique.'),
    ('Relire les noms, dates et lieux.'),
    ('Valider la version finale.'),
    ('Préparer le format de diffusion retenu.')
  ) as v(label) returning id
),
_cl5_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl5.id, v.label, 'todo', false
  from cl5 cross join (values
    ('Définir les informations présentes sur l''invitation principale.'),
    ('Rédiger le texte principal.'),
    ('Présenter clairement la période du 25 au 28 juin 2027.'),
    ('Éviter de laisser penser que tous les destinataires sont invités à toutes les séquences.'),
    ('Prévoir un renvoi vers les informations détaillées.'),
    ('Créer la maquette.'),
    ('Faire relire la maquette avant validation.')
  ) as v(label) returning id
),
_cl6_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl6.id, v.label, 'todo', false
  from cl6 cross join (values
    ('Définir les combinaisons de séquences pouvant être proposées aux invités.'),
    ('Préparer les textes adaptés au mariage civil et au goûter d''honneur.'),
    ('Préparer les informations du moment convivial du samedi.'),
    ('Préparer les informations du dimanche.'),
    ('Préparer les informations relatives à la bénédiction au khane.'),
    ('Préparer les informations relatives à la bénédiction à l''église.'),
    ('Préparer les informations relatives à la célébration à Ostara.'),
    ('Vérifier que chaque invité reçoit uniquement les informations correspondant à son invitation.')
  ) as v(label) returning id
),
_cl7_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl7.id, v.label, 'todo', false
  from cl7 cross join (values
    ('Définir le format final.'),
    ('Choisir le papier.'),
    ('Déterminer les quantités nécessaires.'),
    ('Prévoir une marge d''exemplaires supplémentaires.'),
    ('Valider le BAT avant impression.'),
    ('Contrôler les exemplaires à réception.'),
    ('Préparer les enveloppes et éléments complémentaires.'),
    ('Conserver quelques exemplaires vierges et souvenirs.')
  ) as v(label) returning id
),
_cl8_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl8.id, v.label, 'todo', false
  from cl8 cross join (values
    ('Préparer la liste des destinataires.'),
    ('Vérifier les adresses postales ou coordonnées numériques.'),
    ('Associer chaque destinataire à la bonne version d''invitation.'),
    ('Préparer les enveloppes ou messages.'),
    ('Vérifier une dernière fois les correspondances avant envoi.'),
    ('Enregistrer la date d''envoi.'),
    ('Signaler au pôle Invités & accueil les invitations envoyées.')
  ) as v(label) returning id
),
_cl9_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl9.id, v.label, 'todo', false
  from cl9 cross join (values
    ('Présenter les quatre journées de manière synthétique.'),
    ('Préciser que les invitations peuvent varier selon les personnes.'),
    ('Présenter les principales adresses utiles.'),
    ('Présenter les recommandations générales de transport.'),
    ('Présenter les informations pratiques sur les tenues lorsque nécessaire.'),
    ('Présenter les informations d''hébergement utiles sans prendre en charge les réservations.'),
    ('Prévoir les coordonnées utiles en cas de question.'),
    ('Maintenir le guide à jour jusqu''au mariage.')
  ) as v(label) returning id
),
_cl10_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl10.id, v.label, 'todo', false
  from cl10 cross join (values
    ('Créer une fiche pratique pour le vendredi.'),
    ('Créer une fiche pratique pour le samedi.'),
    ('Créer une fiche pratique pour le dimanche.'),
    ('Créer une fiche pratique pour le lundi.'),
    ('Indiquer les horaires utiles sans exposer le conducteur interne complet.'),
    ('Indiquer les adresses et informations d''accès.'),
    ('Indiquer les recommandations particulières propres à chaque journée.'),
    ('Vérifier la cohérence avec les informations communiquées ailleurs.')
  ) as v(label) returning id
),
_cl11_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl11.id, v.label, 'todo', false
  from cl11 cross join (values
    ('Récupérer les informations validées auprès du pôle Transport & déplacements.'),
    ('Sélectionner uniquement les informations utiles aux invités.'),
    ('Préparer les indications d''accès aux différents lieux.'),
    ('Préparer les informations de stationnement lorsque nécessaires.'),
    ('Prévoir les éventuelles consignes de covoiturage.'),
    ('Mettre à jour les informations si un accès change.'),
    ('Éviter de diffuser les détails opérationnels réservés aux équipes.')
  ) as v(label) returning id
),
_cl12_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl12.id, v.label, 'todo', false
  from cl12 cross join (values
    ('Décider s''il faut une page, un site, un espace partagé ou un autre support central.'),
    ('Définir les rubriques nécessaires.'),
    ('Prévoir les informations adaptées aux différentes séquences.'),
    ('Prévoir une section informations pratiques.'),
    ('Prévoir un moyen simple de mettre à jour les informations.'),
    ('Vérifier l''affichage sur téléphone.'),
    ('Vérifier que les informations sensibles ne sont pas publiées inutilement.')
  ) as v(label) returning id
),
_cl13_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl13.id, v.label, 'todo', false
  from cl13 cross join (values
    ('Lister les messages devant être envoyés plusieurs mois avant le mariage.'),
    ('Préparer le message de rappel des informations pratiques.'),
    ('Préparer le rappel final quelques jours avant chaque séquence.'),
    ('Préparer un message en cas de changement important.'),
    ('Définir les groupes ou listes de diffusion appropriés.'),
    ('Éviter d''envoyer à tous des informations concernant uniquement une partie des invités.'),
    ('Faire valider les messages importants avant envoi.')
  ) as v(label) returning id
),
_cl14_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl14.id, v.label, 'todo', false
  from cl14 cross join (values
    ('Centraliser les changements devant réellement être communiqués.'),
    ('Vérifier le public concerné avant diffusion.'),
    ('Rédiger un message court et non ambigu.'),
    ('Faire valider les modifications importantes par la coordination.'),
    ('Diffuser par le canal le plus adapté.'),
    ('Éviter les messages multiples contradictoires.'),
    ('Archiver la dernière information communiquée.')
  ) as v(label) returning id
),
_cl15_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl15.id, v.label, 'todo', false
  from cl15 cross join (values
    ('Lister les supports imprimés réellement nécessaires au mariage civil.'),
    ('Lister les supports nécessaires au goûter d''honneur.'),
    ('Préparer les éventuels programmes ou cartes d''information.'),
    ('Préparer les supports permettant d''orienter vers le goûter d''honneur si nécessaire.'),
    ('Vérifier les horaires et adresses.'),
    ('Faire imprimer les quantités nécessaires.'),
    ('Conditionner les supports du vendredi séparément.')
  ) as v(label) returning id
),
_cl16_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl16.id, v.label, 'todo', false
  from cl16 cross join (values
    ('Lister les supports nécessaires aux jeux et animations.'),
    ('Préparer les règles imprimées des activités si nécessaire.'),
    ('Préparer les supports du casino fictif.'),
    ('Préparer les feuilles de score ou équipes si retenues.'),
    ('Préparer les quiz ou cartes de jeu prévues.'),
    ('Vérifier la lisibilité et la simplicité des consignes.'),
    ('Conditionner les supports du samedi séparément.')
  ) as v(label) returning id
),
_cl17_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl17.id, v.label, 'todo', false
  from cl17 cross join (values
    ('Déterminer avec les personnes concernées les supports appropriés.'),
    ('Préparer une courte explication destinée aux invités qui en ont besoin.'),
    ('Vérifier la terminologie utilisée.'),
    ('Respecter les consignes du lieu et de la communauté.'),
    ('Éviter d''imprimer des supports inutiles si la cérémonie n''en nécessite pas.'),
    ('Faire valider tout contenu religieux ou protocolaire sensible.'),
    ('Conditionner les éventuels supports séparément.')
  ) as v(label) returning id
),
_cl18_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl18.id, v.label, 'todo', false
  from cl18 cross join (values
    ('Définir la structure du livret avec la paroisse ou le célébrant.'),
    ('Rassembler les textes et éléments validés.'),
    ('Intégrer les chants si leur reproduction est autorisée et nécessaire.'),
    ('Présenter clairement les différentes étapes de la célébration.'),
    ('Vérifier les noms des intervenants.'),
    ('Faire relire le contenu religieux avant impression.'),
    ('Valider la mise en page.'),
    ('Déterminer le nombre d''exemplaires.'),
    ('Faire imprimer les livrets.'),
    ('Conditionner les livrets pour leur transport à l''église.')
  ) as v(label) returning id
),
_cl19_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl19.id, v.label, 'todo', false
  from cl19 cross join (values
    ('Lister les supports nécessaires à l''accueil.'),
    ('Déterminer si des menus imprimés sont utiles avec le format buffet.'),
    ('Déterminer les supports nécessaires pour identifier les plats.'),
    ('Déterminer les supports nécessaires au plan de table ou placement.'),
    ('Déterminer les supports nécessaires pour les numéros ou noms de tables.'),
    ('Déterminer les cartes ou indications liées au glacier.'),
    ('Déterminer les supports utiles au bar de nuit.'),
    ('Éviter les supports décoratifs redondants avec le pôle Décoration & ambiance.')
  ) as v(label) returning id
),
_cl20_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl20.id, v.label, 'todo', false
  from cl20 cross join (values
    ('Récupérer le plan de placement final auprès du pôle Invités & accueil.'),
    ('Choisir le format du plan de table.'),
    ('Créer les numéros ou noms de tables.'),
    ('Créer les marque-places si cette option est retenue.'),
    ('Vérifier l''orthographe de tous les noms.'),
    ('Vérifier la correspondance entre plan de table et supports de table.'),
    ('Prévoir une méthode de correction de dernière minute.'),
    ('Faire valider avant impression.')
  ) as v(label) returning id
),
_cl21_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl21.id, v.label, 'todo', false
  from cl21 cross join (values
    ('Récupérer les intitulés définitifs auprès du pôle Restauration & boissons.'),
    ('Créer les étiquettes ou cartes d''identification des plats si nécessaires.'),
    ('Prévoir les indications utiles sur certains régimes ou allergènes avec le traiteur.'),
    ('Créer les éventuels menus généraux.'),
    ('Préparer les supports liés au glacier si nécessaires.'),
    ('Préparer les supports du bar de nuit si nécessaires.'),
    ('Vérifier l''orthographe des plats et spécialités culturelles.'),
    ('Faire valider les informations avant impression.')
  ) as v(label) returning id
),
_cl22_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl22.id, v.label, 'todo', false
  from cl22 cross join (values
    ('Identifier les temps forts nécessitant un support imprimé.'),
    ('Préparer les éventuels supports de jeux ou interactions invités.'),
    ('Préparer les supports nécessaires à la comédie musicale si le spectacle en requiert.'),
    ('Préparer les éventuelles cartes ou consignes destinées aux participants.'),
    ('Éviter de révéler les surprises dans les supports accessibles aux invités.'),
    ('Coordonner les contenus avec le pôle Cérémonies & animation.')
  ) as v(label) returning id
),
_cl23_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl23.id, v.label, 'todo', false
  from cl23 cross join (values
    ('Lister chaque support à imprimer.'),
    ('Associer chaque support à une séquence.'),
    ('Définir le format et le papier.'),
    ('Définir la quantité.'),
    ('Identifier la date limite de validation.'),
    ('Identifier la date limite d''impression.'),
    ('Identifier les supports pouvant être imprimés à domicile et ceux nécessitant un imprimeur.'),
    ('Prévoir une marge pour les exemplaires supplémentaires.')
  ) as v(label) returning id
),
_cl24_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl24.id, v.label, 'todo', false
  from cl24 cross join (values
    ('Identifier les imprimeurs adaptés aux supports retenus.'),
    ('Demander les tarifs et délais.'),
    ('Vérifier les formats de fichiers demandés.'),
    ('Vérifier les options de papier et finitions.'),
    ('Vérifier les délais de BAT.'),
    ('Vérifier les conditions de réimpression en cas d''erreur.'),
    ('Choisir l''imprimeur.'),
    ('Archiver le devis et les spécifications.')
  ) as v(label) returning id
),
_cl25_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl25.id, v.label, 'todo', false
  from cl25 cross join (values
    ('Relire tous les textes.'),
    ('Vérifier les dates.'),
    ('Vérifier les horaires.'),
    ('Vérifier les adresses.'),
    ('Vérifier l''orthographe des noms propres.'),
    ('Vérifier les quantités.'),
    ('Vérifier le format et les marges d''impression.'),
    ('Obtenir la validation finale avant lancement.')
  ) as v(label) returning id
),
_cl26_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl26.id, v.label, 'todo', false
  from cl26 cross join (values
    ('Vérifier les quantités reçues.'),
    ('Vérifier la qualité d''impression.'),
    ('Vérifier les couleurs.'),
    ('Vérifier les découpes et finitions.'),
    ('Contrôler plusieurs exemplaires de chaque support.'),
    ('Isoler les exemplaires défectueux.'),
    ('Demander une correction si nécessaire.'),
    ('Ranger les supports validés par journée.')
  ) as v(label) returning id
),
_cl27_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl27.id, v.label, 'todo', false
  from cl27 cross join (values
    ('Créer un lot pour le vendredi.'),
    ('Créer un lot pour le samedi.'),
    ('Créer un lot pour le dimanche.'),
    ('Créer un lot pour la bénédiction au khane.'),
    ('Créer un lot pour la bénédiction à l''église.'),
    ('Créer un lot pour la réception à Ostara.'),
    ('Étiqueter clairement chaque contenant.'),
    ('Joindre une liste du contenu à chaque lot.')
  ) as v(label) returning id
),
_cl28_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl28.id, v.label, 'todo', false
  from cl28 cross join (values
    ('Définir qui transporte chaque lot.'),
    ('Définir qui installe ou distribue chaque support.'),
    ('Définir qui conserve les exemplaires de secours.'),
    ('Définir qui peut effectuer une correction de dernière minute.'),
    ('Informer les responsables de l''emplacement des supports.'),
    ('Éviter de confier la distribution directement aux mariés.')
  ) as v(label) returning id
),
_cl29_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl29.id, v.label, 'todo', false
  from cl29 cross join (values
    ('Vérifier que les bons supports sont arrivés sur le bon lieu.'),
    ('Installer les supports d''accueil prévus.'),
    ('Installer les supports de placement lorsque nécessaire.'),
    ('Installer les supports liés à la restauration lorsque nécessaire.'),
    ('Distribuer les livrets ou programmes selon le dispositif prévu.'),
    ('Conserver quelques exemplaires de remplacement.'),
    ('Faire un contrôle visuel avant l''arrivée des invités.')
  ) as v(label) returning id
),
_cl30_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl30.id, v.label, 'todo', false
  from cl30 cross join (values
    ('Centraliser toutes les demandes de correction.'),
    ('Éviter les modifications directement dans plusieurs copies du même fichier.'),
    ('Maintenir une version maître de chaque support.'),
    ('Tracer les changements importants.'),
    ('Faire revalider les informations modifiées.'),
    ('Verrouiller les fichiers une fois le BAT validé.')
  ) as v(label) returning id
),
_cl31_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl31.id, v.label, 'todo', false
  from cl31 cross join (values
    ('Prévoir quelques supports vierges ou facilement modifiables.'),
    ('Prévoir de quoi corriger un nom ou un placement si nécessaire.'),
    ('Conserver une version numérique des fichiers importants accessible aux responsables.'),
    ('Identifier une solution d''impression de secours pour les petits volumes.'),
    ('Ne modifier un support opérationnel qu''après validation de la coordination.')
  ) as v(label) returning id
),
_cl32_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl32.id, v.label, 'todo', false
  from cl32 cross join (values
    ('Définir les catégories de personnes à remercier.'),
    ('Choisir le format des remerciements.'),
    ('Préparer une base de texte personnalisable.'),
    ('Prévoir une version particulière pour les personnes fortement impliquées.'),
    ('Prévoir une version pour les prestataires si souhaité.'),
    ('Définir le moment d''envoi des remerciements.'),
    ('Prévoir les éventuelles photos à intégrer.')
  ) as v(label) returning id
),
_cl33_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl33.id, v.label, 'todo', false
  from cl33 cross join (values
    ('Finaliser la liste des destinataires.'),
    ('Personnaliser les messages lorsque nécessaire.'),
    ('Sélectionner les photos utilisées si le support en contient.'),
    ('Faire imprimer les cartes si le format papier est retenu.'),
    ('Préparer les envois numériques ou postaux.'),
    ('Suivre les envois réalisés.'),
    ('Conserver un exemplaire de la papeterie de remerciement.')
  ) as v(label) returning id
),
_cl34_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl34.id, v.label, 'todo', false
  from cl34 cross join (values
    ('Conserver un exemplaire de l''invitation.'),
    ('Conserver un exemplaire de chaque déclinaison importante.'),
    ('Conserver un livret de cérémonie.'),
    ('Conserver un exemplaire des menus ou cartes principales.'),
    ('Conserver un numéro ou nom de table si souhaité.'),
    ('Conserver les supports particuliers liés aux animations.'),
    ('Regrouper les éléments dans les souvenirs du mariage.'),
    ('Archiver également les fichiers numériques définitifs.')
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

-- ─── LIENS MISSION ↔ SÉQUENCE ────────────────────────────────────────────────
-- m1–m14, m23–m31 → all 7
_ms1  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m1.id,  sq_all_7.id from m1  cross join sq_all_7 returning mission_id),
_ms2  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m2.id,  sq_all_7.id from m2  cross join sq_all_7 returning mission_id),
_ms3  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m3.id,  sq_all_7.id from m3  cross join sq_all_7 returning mission_id),
_ms4  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m4.id,  sq_all_7.id from m4  cross join sq_all_7 returning mission_id),
_ms5  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m5.id,  sq_all_7.id from m5  cross join sq_all_7 returning mission_id),
_ms6  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m6.id,  sq_all_7.id from m6  cross join sq_all_7 returning mission_id),
_ms7  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m7.id,  sq_all_7.id from m7  cross join sq_all_7 returning mission_id),
_ms8  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m8.id,  sq_all_7.id from m8  cross join sq_all_7 returning mission_id),
_ms9  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m9.id,  sq_all_7.id from m9  cross join sq_all_7 returning mission_id),
_ms10 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m10.id, sq_all_7.id from m10 cross join sq_all_7 returning mission_id),
_ms11 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m11.id, sq_all_7.id from m11 cross join sq_all_7 returning mission_id),
_ms12 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m12.id, sq_all_7.id from m12 cross join sq_all_7 returning mission_id),
_ms13 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m13.id, sq_all_7.id from m13 cross join sq_all_7 returning mission_id),
_ms14 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m14.id, sq_all_7.id from m14 cross join sq_all_7 returning mission_id),
-- m15 → Mariage civil + Goûter d'honneur
_ms15 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m15.id, s.id
  from m15
  cross join (select id from _20270628_event_sequences where name in ('Mariage civil', 'Goûter d''honneur')) s
  returning mission_id
),
-- m16 → Moment convivial entre amis
_ms16 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m16.id, s.id
  from m16
  cross join (select id from _20270628_event_sequences where name = 'Moment convivial entre amis') s
  returning mission_id
),
-- m17 → Bénédiction au khane
_ms17 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m17.id, s.id
  from m17
  cross join (select id from _20270628_event_sequences where name = 'Bénédiction au khane') s
  returning mission_id
),
-- m18 → Bénédiction à l'église
_ms18 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m18.id, s.id
  from m18
  cross join (select id from _20270628_event_sequences where name = 'Bénédiction à l''église') s
  returning mission_id
),
-- m19–m22 → Célébration de mariage
_ms19 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m19.id, sq_celebr.id from m19 cross join sq_celebr returning mission_id),
_ms20 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m20.id, sq_celebr.id from m20 cross join sq_celebr returning mission_id),
_ms21 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m21.id, sq_celebr.id from m21 cross join sq_celebr returning mission_id),
_ms22 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m22.id, sq_celebr.id from m22 cross join sq_celebr returning mission_id),
_ms23 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m23.id, sq_all_7.id from m23 cross join sq_all_7 returning mission_id),
_ms24 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m24.id, sq_all_7.id from m24 cross join sq_all_7 returning mission_id),
_ms25 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m25.id, sq_all_7.id from m25 cross join sq_all_7 returning mission_id),
_ms26 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m26.id, sq_all_7.id from m26 cross join sq_all_7 returning mission_id),
_ms27 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m27.id, sq_all_7.id from m27 cross join sq_all_7 returning mission_id),
_ms28 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m28.id, sq_all_7.id from m28 cross join sq_all_7 returning mission_id),
_ms29 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m29.id, sq_all_7.id from m29 cross join sq_all_7 returning mission_id),
_ms30 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m30.id, sq_all_7.id from m30 cross join sq_all_7 returning mission_id),
_ms31 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m31.id, sq_all_7.id from m31 cross join sq_all_7 returning mission_id)
-- m32, m33, m34 → aucune séquence

select
  (select count(*) from p)                        as poles,
  (select count(*) from d_strategie)
  + (select count(*) from d_identite)
  + (select count(*) from d_invitations)
  + (select count(*) from d_infos)
  + (select count(*) from d_numerique)
  + (select count(*) from d_civil)
  + (select count(*) from d_samedi)
  + (select count(*) from d_khane)
  + (select count(*) from d_eglise)
  + (select count(*) from d_ostara)
  + (select count(*) from d_impression)
  + (select count(*) from d_conditionnement)
  + (select count(*) from d_mises_a_jour)
  + (select count(*) from d_remerciements)
  + (select count(*) from d_archives)             as domaines,
  (select count(*) from m1)  + (select count(*) from m2)  + (select count(*) from m3)
  + (select count(*) from m4)  + (select count(*) from m5)  + (select count(*) from m6)
  + (select count(*) from m7)  + (select count(*) from m8)  + (select count(*) from m9)
  + (select count(*) from m10) + (select count(*) from m11) + (select count(*) from m12)
  + (select count(*) from m13) + (select count(*) from m14) + (select count(*) from m15)
  + (select count(*) from m16) + (select count(*) from m17) + (select count(*) from m18)
  + (select count(*) from m19) + (select count(*) from m20) + (select count(*) from m21)
  + (select count(*) from m22) + (select count(*) from m23) + (select count(*) from m24)
  + (select count(*) from m25) + (select count(*) from m26) + (select count(*) from m27)
  + (select count(*) from m28) + (select count(*) from m29) + (select count(*) from m30)
  + (select count(*) from m31) + (select count(*) from m32) + (select count(*) from m33)
  + (select count(*) from m34)                    as missions,
  (select count(*) from _cl1_items)  + (select count(*) from _cl2_items)
  + (select count(*) from _cl3_items)  + (select count(*) from _cl4_items)
  + (select count(*) from _cl5_items)  + (select count(*) from _cl6_items)
  + (select count(*) from _cl7_items)  + (select count(*) from _cl8_items)
  + (select count(*) from _cl9_items)  + (select count(*) from _cl10_items)
  + (select count(*) from _cl11_items) + (select count(*) from _cl12_items)
  + (select count(*) from _cl13_items) + (select count(*) from _cl14_items)
  + (select count(*) from _cl15_items) + (select count(*) from _cl16_items)
  + (select count(*) from _cl17_items) + (select count(*) from _cl18_items)
  + (select count(*) from _cl19_items) + (select count(*) from _cl20_items)
  + (select count(*) from _cl21_items) + (select count(*) from _cl22_items)
  + (select count(*) from _cl23_items) + (select count(*) from _cl24_items)
  + (select count(*) from _cl25_items) + (select count(*) from _cl26_items)
  + (select count(*) from _cl27_items) + (select count(*) from _cl28_items)
  + (select count(*) from _cl29_items) + (select count(*) from _cl30_items)
  + (select count(*) from _cl31_items) + (select count(*) from _cl32_items)
  + (select count(*) from _cl33_items) + (select count(*) from _cl34_items) as checklist_items,
  (select count(*) from _ms1)  + (select count(*) from _ms2)
  + (select count(*) from _ms3)  + (select count(*) from _ms4)
  + (select count(*) from _ms5)  + (select count(*) from _ms6)
  + (select count(*) from _ms7)  + (select count(*) from _ms8)
  + (select count(*) from _ms9)  + (select count(*) from _ms10)
  + (select count(*) from _ms11) + (select count(*) from _ms12)
  + (select count(*) from _ms13) + (select count(*) from _ms14)
  + (select count(*) from _ms15) + (select count(*) from _ms16)
  + (select count(*) from _ms17) + (select count(*) from _ms18)
  + (select count(*) from _ms19) + (select count(*) from _ms20)
  + (select count(*) from _ms21) + (select count(*) from _ms22)
  + (select count(*) from _ms23) + (select count(*) from _ms24)
  + (select count(*) from _ms25) + (select count(*) from _ms26)
  + (select count(*) from _ms27) + (select count(*) from _ms28)
  + (select count(*) from _ms29) + (select count(*) from _ms30)
  + (select count(*) from _ms31)                  as mission_sequences;
