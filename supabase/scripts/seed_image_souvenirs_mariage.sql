-- seed_image_souvenirs_mariage.sql
-- Pôle "Image & souvenirs" – script de seed complet (sort_order = 10)

delete from _20270628_poles where name = 'Image & souvenirs';

with
-- ─── PÔLE ────────────────────────────────────────────────────────────────────
p as materialized (
  insert into _20270628_poles (id, name, sort_order)
  values (gen_random_uuid(), 'Image & souvenirs', 10)
  returning id
),

-- ─── DOMAINES ────────────────────────────────────────────────────────────────
d_strategie as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Stratégie photo & vidéo', 'strategie-photo-video', 'avant'
  from p returning id
),
d_prestataires as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Prestataires image', 'prestataires-image', 'avant'
  from p returning id
),
d_brief as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Brief artistique', 'brief-artistique', 'avant'
  from p returning id
),
d_personnes as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Personnes & groupes', 'personnes-groupes', 'avant'
  from p returning id
),
d_preparatifs as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Préparatifs des mariés', 'preparatifs-maries', 'avant'
  from p returning id
),
d_ceremonies as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Cérémonies', 'ceremonies', 'avant'
  from p returning id
),
d_couple as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Couple', 'couple', 'avant'
  from p returning id
),
d_reception as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Réception Ostara', 'reception-ostara', 'avant'
  from p returning id
),
d_spectacle as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Spectacle & première danse', 'spectacle-premiere-danse', 'avant'
  from p returning id
),
d_invites as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Invités & spontanéité', 'invites-spontaneite', 'avant'
  from p returning id
),
d_technique as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Technique & sauvegarde', 'technique-sauvegarde', null
  from p returning id
),
d_souvenirs as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Souvenirs matériels', 'souvenirs-materiels', null
  from p returning id
),
d_livrables_photo as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Livrables photo', 'livrables-photo', 'apres'
  from p returning id
),
d_livrables_video as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Livrables vidéo', 'livrables-video', 'apres'
  from p returning id
),
d_albums as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Albums & transmission', 'albums-transmission', 'apres'
  from p returning id
),

-- ─── MISSIONS ────────────────────────────────────────────────────────────────
m1 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_strategie.id,
    'Définir la couverture photo et vidéo du mariage'
  from d_strategie returning id
),
m2 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_strategie.id,
    'Définir le style visuel recherché'
  from d_strategie returning id
),
m3 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_prestataires.id,
    'Finaliser les prestations photo et vidéo'
  from d_prestataires returning id
),
m4 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_prestataires.id,
    'Préparer les informations pratiques pour l''équipe image'
  from d_prestataires returning id
),
m5 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_brief.id,
    'Préparer le brief photo des moments incontournables'
  from d_brief returning id
),
m6 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_brief.id,
    'Préparer le brief vidéo'
  from d_brief returning id
),
m7 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_personnes.id,
    'Identifier les personnes à photographier en priorité'
  from d_personnes returning id
),
m8 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_personnes.id,
    'Construire la liste des photos de groupe'
  from d_personnes returning id
),
m9 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_preparatifs.id,
    'Préparer la couverture des préparatifs'
  from d_preparatifs returning id
),
m10 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_ceremonies.id,
    'Préparer la couverture du mariage civil'
  from d_ceremonies returning id
),
m11 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_ceremonies.id,
    'Préparer la couverture de la bénédiction à l''église'
  from d_ceremonies returning id
),
m12 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_couple.id,
    'Planifier les portraits de couple'
  from d_couple returning id
),
m13 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_reception.id,
    'Préparer la couverture de la réception à Ostara'
  from d_reception returning id
),
m14 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_spectacle.id,
    'Préparer la captation de la comédie musicale'
  from d_spectacle returning id
),
m15 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_spectacle.id,
    'Préparer la couverture de la première danse'
  from d_spectacle returning id
),
m16 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_invites.id,
    'Favoriser les images spontanées des invités'
  from d_invites returning id
),
m17 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_invites.id,
    'Définir la collecte d''images réalisées par les invités'
  from d_invites returning id
),
m18 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_technique.id,
    'Sécuriser les conditions techniques de captation'
  from d_technique returning id
),
m19 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_technique.id,
    'Vérifier la sauvegarde des prises de vue critiques'
  from d_technique returning id
),
m20 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_souvenirs.id,
    'Définir les souvenirs matériels souhaités'
  from d_souvenirs returning id
),
m21 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_souvenirs.id,
    'Collecter et sécuriser les souvenirs pendant le mariage'
  from d_souvenirs returning id
),
m22 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_livrables_photo.id,
    'Réceptionner et contrôler les photos'
  from d_livrables_photo returning id
),
m23 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_livrables_photo.id,
    'Sélectionner les photos à conserver et partager'
  from d_livrables_photo returning id
),
m24 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_livrables_video.id,
    'Réceptionner et contrôler les vidéos'
  from d_livrables_video returning id
),
m25 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_livrables_video.id,
    'Valider la version finale du film'
  from d_livrables_video returning id
),
m26 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_albums.id,
    'Créer l''album photo du mariage'
  from d_albums returning id
),
m27 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_albums.id,
    'Organiser l''archivage durable des souvenirs numériques'
  from d_albums returning id
),
m28 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_albums.id,
    'Partager les souvenirs avec les proches'
  from d_albums returning id
),

-- ─── CHECKLISTS ──────────────────────────────────────────────────────────────
cl1 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m1.id,
    'Définir la couverture photo et vidéo du mariage'
  from m1 returning id
),
cl2 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m2.id,
    'Définir le style visuel recherché'
  from m2 returning id
),
cl3 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m3.id,
    'Finaliser les prestations photo et vidéo'
  from m3 returning id
),
cl4 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m4.id,
    'Préparer les informations pratiques pour l''équipe image'
  from m4 returning id
),
cl5 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m5.id,
    'Préparer le brief photo des moments incontournables'
  from m5 returning id
),
cl6 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m6.id,
    'Préparer le brief vidéo'
  from m6 returning id
),
cl7 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m7.id,
    'Identifier les personnes à photographier en priorité'
  from m7 returning id
),
cl8 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m8.id,
    'Construire la liste des photos de groupe'
  from m8 returning id
),
cl9 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m9.id,
    'Préparer la couverture des préparatifs'
  from m9 returning id
),
cl10 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m10.id,
    'Préparer la couverture du mariage civil'
  from m10 returning id
),
cl11 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m11.id,
    'Préparer la couverture de la bénédiction à l''église'
  from m11 returning id
),
cl12 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m12.id,
    'Planifier les portraits de couple'
  from m12 returning id
),
cl13 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m13.id,
    'Préparer la couverture de la réception à Ostara'
  from m13 returning id
),
cl14 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m14.id,
    'Préparer la captation de la comédie musicale'
  from m14 returning id
),
cl15 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m15.id,
    'Préparer la couverture de la première danse'
  from m15 returning id
),
cl16 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m16.id,
    'Favoriser les images spontanées des invités'
  from m16 returning id
),
cl17 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m17.id,
    'Définir la collecte d''images réalisées par les invités'
  from m17 returning id
),
cl18 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m18.id,
    'Sécuriser les conditions techniques de captation'
  from m18 returning id
),
cl19 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m19.id,
    'Vérifier la sauvegarde des prises de vue critiques'
  from m19 returning id
),
cl20 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m20.id,
    'Définir les souvenirs matériels souhaités'
  from m20 returning id
),
cl21 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m21.id,
    'Collecter et sécuriser les souvenirs pendant le mariage'
  from m21 returning id
),
cl22 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m22.id,
    'Réceptionner et contrôler les photos'
  from m22 returning id
),
cl23 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m23.id,
    'Sélectionner les photos à conserver et partager'
  from m23 returning id
),
cl24 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m24.id,
    'Réceptionner et contrôler les vidéos'
  from m24 returning id
),
cl25 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m25.id,
    'Valider la version finale du film'
  from m25 returning id
),
cl26 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m26.id,
    'Créer l''album photo du mariage'
  from m26 returning id
),
cl27 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m27.id,
    'Organiser l''archivage durable des souvenirs numériques'
  from m27 returning id
),
cl28 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m28.id,
    'Partager les souvenirs avec les proches'
  from m28 returning id
),

-- ─── CHECKLIST ITEMS ─────────────────────────────────────────────────────────
_cl1_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl1.id, v.label, 'todo', false
  from cl1 cross join (values
    ('Confirmer que la couverture professionnelle est concentrée sur le vendredi 25 et le lundi 28 juin 2027.'),
    ('Définir les horaires de présence souhaités le vendredi.'),
    ('Définir les horaires de présence souhaités le lundi.'),
    ('Identifier les moments qui doivent impérativement être couverts en photo.'),
    ('Identifier les moments qui doivent impérativement être couverts en vidéo.'),
    ('Définir les moments pouvant être documentés uniquement de manière informelle.'),
    ('Définir le niveau de présence souhaité pendant la soirée du lundi.'),
    ('Vérifier que la couverture prévue correspond au budget.')
  ) as v(label) returning id
),
_cl2_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl2.id, v.label, 'todo', false
  from cl2 cross join (values
    ('Formaliser le style photographique recherché.'),
    ('Préciser l''importance des images spontanées et prises sur le vif.'),
    ('Définir le niveau de photos posées souhaité.'),
    ('Définir le style recherché pour le film.'),
    ('Préparer des exemples visuels utiles sans imposer une reproduction exacte.'),
    ('Identifier les traitements ou effets visuels à éviter.'),
    ('Partager les références validées aux prestataires.')
  ) as v(label) returning id
),
_cl3_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl3.id, v.label, 'todo', false
  from cl3 cross join (values
    ('Confirmer les dates couvertes par chaque prestataire.'),
    ('Confirmer les horaires et durées de présence.'),
    ('Confirmer le nombre de photographes ou vidéastes présents.'),
    ('Confirmer les déplacements compris dans la prestation.'),
    ('Confirmer les livrables prévus.'),
    ('Confirmer les délais indicatifs de livraison.'),
    ('Confirmer les conditions concernant les retouches et modifications.'),
    ('Confirmer les droits d''utilisation et de diffusion des images.'),
    ('Conserver les contrats et coordonnées opérationnelles.')
  ) as v(label) returning id
),
_cl4_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl4.id, v.label, 'todo', false
  from cl4 cross join (values
    ('Transmettre les adresses exactes des lieux couverts.'),
    ('Transmettre les horaires du conducteur utiles.'),
    ('Transmettre les contacts opérationnels des deux journées.'),
    ('Informer des contraintes de stationnement et d''accès.'),
    ('Informer des règles particulières de la mairie et de l''église.'),
    ('Identifier les espaces où les prestataires peuvent déposer leur matériel.'),
    ('Prévoir leur repas ou collation selon la durée de présence.')
  ) as v(label) returning id
),
_cl5_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl5.id, v.label, 'todo', false
  from cl5 cross join (values
    ('Lister les moments incontournables du mariage civil.'),
    ('Lister les moments incontournables du goûter d''honneur.'),
    ('Lister les moments incontournables des préparatifs du lundi.'),
    ('Lister les moments incontournables de la bénédiction à l''église.'),
    ('Lister les moments incontournables de l''arrivée à Ostara.'),
    ('Lister les moments incontournables de la réception.'),
    ('Lister les moments incontournables du spectacle.'),
    ('Lister les moments incontournables de la première danse.'),
    ('Lister les moments incontournables de la soirée.'),
    ('Hiérarchiser la liste pour éviter un brief irréaliste.')
  ) as v(label) returning id
),
_cl6_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl6.id, v.label, 'todo', false
  from cl6 cross join (values
    ('Définir les moments devant apparaître dans le film final.'),
    ('Définir l''importance souhaitée des préparatifs.'),
    ('Définir l''importance souhaitée des cérémonies.'),
    ('Définir l''importance souhaitée des interactions spontanées avec les invités.'),
    ('Définir la place du spectacle dans le film.'),
    ('Définir la place de la première danse et de la soirée.'),
    ('Identifier les prises de parole dont le son doit être capté.'),
    ('Identifier les ambiances sonores importantes à conserver.'),
    ('Signaler les moments nécessitant plusieurs angles lorsque possible.')
  ) as v(label) returning id
),
_cl7_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl7.id, v.label, 'todo', false
  from cl7 cross join (values
    ('Lister les parents et proches indispensables.'),
    ('Lister les témoins.'),
    ('Lister les membres du cortège.'),
    ('Lister les grands groupes familiaux souhaités.'),
    ('Identifier les personnes venant de loin ou rarement réunies.'),
    ('Identifier les associations de personnes importantes à ne pas manquer.'),
    ('Limiter la liste prioritaire aux groupes réellement importants.'),
    ('Transmettre une version claire au photographe et à la personne chargée de rassembler les groupes.')
  ) as v(label) returning id
),
_cl8_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl8.id, v.label, 'todo', false
  from cl8 cross join (values
    ('Définir les photos de groupe souhaitées le vendredi.'),
    ('Définir les photos de groupe souhaitées après l''église.'),
    ('Définir les photos de groupe souhaitées à Ostara.'),
    ('Classer les groupes dans un ordre efficace.'),
    ('Identifier une personne connaissant les invités pour rassembler chaque groupe.'),
    ('Estimer le temps nécessaire à la série de photos.'),
    ('Éviter de multiplier les combinaisons redondantes.'),
    ('Intégrer la séance au conducteur.')
  ) as v(label) returning id
),
_cl9_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl9.id, v.label, 'todo', false
  from cl9 cross join (values
    ('Définir les lieux de préparation de Sarah pour les journées couvertes.'),
    ('Définir les lieux de préparation de Jordan pour les journées couvertes.'),
    ('Déterminer l''heure d''arrivée du photographe et du vidéaste.'),
    ('Préparer les accessoires et détails à photographier.'),
    ('Prévoir un espace suffisamment rangé et lumineux.'),
    ('Identifier les proches présents pendant les préparatifs.'),
    ('Coordonner les temps d''habillage avec la présence des prestataires image.'),
    ('Préserver suffisamment de marge avant les départs.')
  ) as v(label) returning id
),
_cl10_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl10.id, v.label, 'todo', false
  from cl10 cross join (values
    ('Informer l''équipe image du déroulement prévu.'),
    ('Vérifier les règles de prise de vue à l''intérieur de la mairie.'),
    ('Identifier les positions possibles sans gêner la cérémonie.'),
    ('Signaler les moments symboliques attendus.'),
    ('Prévoir la couverture de la sortie.'),
    ('Prévoir les photos immédiates avec les proches si souhaitées.'),
    ('Coordonner la transition vers le goûter d''honneur.')
  ) as v(label) returning id
),
_cl11_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl11.id, v.label, 'todo', false
  from cl11 cross join (values
    ('Transmettre le déroulé de la célébration.'),
    ('Vérifier les règles de photo et vidéo avec la paroisse.'),
    ('Identifier les positions autorisées.'),
    ('Signaler les entrées, lectures et gestes symboliques importants.'),
    ('Identifier les moments nécessitant une captation sonore.'),
    ('Préparer la couverture de la sortie.'),
    ('Prévoir la séance de groupes sans retarder excessivement le départ vers Ostara.')
  ) as v(label) returning id
),
_cl12_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl12.id, v.label, 'todo', false
  from cl12 cross join (values
    ('Définir les moments possibles pour les portraits le vendredi.'),
    ('Définir les moments possibles pour les portraits le lundi.'),
    ('Identifier les lieux ou décors intéressants.'),
    ('Prévoir une durée réaliste.'),
    ('Éviter d''isoler trop longtemps les mariés de leurs invités.'),
    ('Prévoir une solution si la météo empêche les prises de vue prévues.'),
    ('Informer la coordination des créneaux retenus.')
  ) as v(label) returning id
),
_cl13_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl13.id, v.label, 'todo', false
  from cl13 cross join (values
    ('Prévoir des images de la salle avant l''arrivée des invités.'),
    ('Prévoir des images de la décoration et des tables terminées.'),
    ('Prévoir des images de l''entrée et de l''espace glacier.'),
    ('Prévoir des images du buffet avant son utilisation.'),
    ('Prévoir la couverture de l''arrivée des mariés.'),
    ('Prévoir les interactions spontanées avec les invités.'),
    ('Prévoir les prises de parole et temps forts.'),
    ('Prévoir la couverture de la première danse et de la soirée.')
  ) as v(label) returning id
),
_cl14_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl14.id, v.label, 'todo', false
  from cl14 cross join (values
    ('Transmettre le conducteur du spectacle à l''équipe image.'),
    ('Identifier les scènes essentielles à couvrir.'),
    ('Identifier les entrées et sorties importantes.'),
    ('Prévoir la captation des réactions de Sarah et Jordan.'),
    ('Prévoir la captation des réactions des invités.'),
    ('Identifier les besoins de captation sonore.'),
    ('Déterminer les emplacements de prise de vue compatibles avec le public.'),
    ('Prévoir la révérence finale.'),
    ('Prévenir l''équipe image de l''enchaînement avec la première danse.')
  ) as v(label) returning id
),
_cl15_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl15.id, v.label, 'todo', false
  from cl15 cross join (values
    ('Transmettre le morceau et la durée prévue.'),
    ('Indiquer le point de départ des mariés.'),
    ('Indiquer les éventuels déplacements ou figures importantes.'),
    ('Vérifier que l''espace reste suffisamment dégagé pour les prises de vue.'),
    ('Coordonner l''éclairage avec les besoins photo et vidéo.'),
    ('Prévoir les réactions des proches.'),
    ('Prévoir l''ouverture de la piste après la danse si elle est intégrée au déroulé.')
  ) as v(label) returning id
),
_cl16_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl16.id, v.label, 'todo', false
  from cl16 cross join (values
    ('Informer les prestataires que les interactions naturelles sont prioritaires.'),
    ('Identifier les périodes propices aux photos prises sur le vif.'),
    ('Éviter de transformer toute la réception en succession de photos posées.'),
    ('Signaler les proches dont les interactions sont particulièrement importantes.'),
    ('Prévoir une couverture des différentes générations et groupes d''invités.'),
    ('Prévoir des images des jeux, discussions, rires et moments de danse.')
  ) as v(label) returning id
),
_cl17_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl17.id, v.label, 'todo', false
  from cl17 cross join (values
    ('Décider si les invités pourront partager leurs photos et vidéos.'),
    ('Choisir un moyen simple de collecte après les événements.'),
    ('Prévoir une communication discrète si nécessaire.'),
    ('Éviter de concurrencer le travail des professionnels pendant les cérémonies.'),
    ('Définir qui centralisera les contenus reçus.'),
    ('Prévoir le tri des contenus utiles après le mariage.')
  ) as v(label) returning id
),
_cl18_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl18.id, v.label, 'todo', false
  from cl18 cross join (values
    ('Vérifier les besoins électriques des prestataires.'),
    ('Vérifier les contraintes de lumière des lieux.'),
    ('Identifier les moments nécessitant une sonorisation exploitable.'),
    ('Coordonner la captation avec les techniciens du spectacle.'),
    ('Vérifier les restrictions concernant drones ou équipements particuliers si envisagés.'),
    ('Prévoir les accès nécessaires aux prestataires sans gêner les invités.')
  ) as v(label) returning id
),
_cl19_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl19.id, v.label, 'todo', false
  from cl19 cross join (values
    ('S''assurer que les prestataires disposent de leur procédure habituelle de sauvegarde.'),
    ('Éviter toute manipulation inutile des supports originaux par des tiers.'),
    ('Identifier rapidement tout incident technique signalé.'),
    ('Conserver les coordonnées et références de prestation jusqu''à livraison complète.'),
    ('Ne considérer la prestation comme clôturée qu''après réception des livrables convenus.')
  ) as v(label) returning id
),
_cl20_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl20.id, v.label, 'todo', false
  from cl20 cross join (values
    ('Décider si un livre d''or est souhaité.'),
    ('Décider si un dispositif de messages ou souvenirs invités est souhaité.'),
    ('Définir les éventuels objets ou supports à conserver des cérémonies.'),
    ('Identifier les éléments de papeterie à conserver.'),
    ('Identifier les éléments du spectacle à conserver.'),
    ('Prévoir un contenant sécurisé pour les souvenirs collectés pendant les événements.'),
    ('Éviter de multiplier les dispositifs demandant une participation forcée des invités.')
  ) as v(label) returning id
),
_cl21_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl21.id, v.label, 'todo', false
  from cl21 cross join (values
    ('Installer les supports de souvenirs retenus.'),
    ('Vérifier qu''ils restent accessibles pendant la période prévue.'),
    ('Récupérer régulièrement les éléments fragiles ou de valeur.'),
    ('Identifier la personne chargée de les sécuriser en fin de séquence.'),
    ('Regrouper les souvenirs avec les autres éléments à conserver.'),
    ('Éviter qu''ils soient mélangés au matériel à jeter ou restituer.')
  ) as v(label) returning id
),
_cl22_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl22.id, v.label, 'todo', false
  from cl22 cross join (values
    ('Vérifier que la galerie ou les fichiers sont accessibles.'),
    ('Vérifier que les deux journées couvertes sont représentées.'),
    ('Vérifier la présence des principaux moments attendus.'),
    ('Signaler rapidement les problèmes techniques ou fichiers manquants.'),
    ('Télécharger les fichiers selon les modalités prévues.'),
    ('Créer au moins une copie de sauvegarde indépendante.'),
    ('Conserver les fichiers en qualité originale.')
  ) as v(label) returning id
),
_cl23_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl23.id, v.label, 'todo', false
  from cl23 cross join (values
    ('Faire une première sélection des images favorites.'),
    ('Identifier les meilleures photos de couple.'),
    ('Identifier les meilleures photos des familles et témoins.'),
    ('Identifier les images représentatives des cérémonies.'),
    ('Identifier les images représentatives de la réception et du spectacle.'),
    ('Créer une sélection adaptée au partage avec les proches.'),
    ('Éviter de diffuser publiquement des images sensibles sans accord approprié.')
  ) as v(label) returning id
),
_cl24_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl24.id, v.label, 'todo', false
  from cl24 cross join (values
    ('Vérifier la présence de tous les livrables prévus au contrat.'),
    ('Visionner les vidéos dans leur intégralité.'),
    ('Vérifier l''ordre narratif et la cohérence générale.'),
    ('Vérifier la qualité sonore des moments importants.'),
    ('Vérifier la présence des séquences considérées comme essentielles.'),
    ('Lister précisément les éventuels ajustements demandés.'),
    ('Regrouper les retours avant de les transmettre au vidéaste.')
  ) as v(label) returning id
),
_cl25_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl25.id, v.label, 'todo', false
  from cl25 cross join (values
    ('Vérifier que les corrections demandées ont été prises en compte.'),
    ('Visionner une dernière fois la version complète.'),
    ('Valider les titres et chapitrages éventuels.'),
    ('Valider la version finale auprès du vidéaste.'),
    ('Télécharger le fichier final en qualité maximale.'),
    ('Créer plusieurs copies de sauvegarde.'),
    ('Conserver également les versions courtes ou teaser livrés.')
  ) as v(label) returning id
),
_cl26_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl26.id, v.label, 'todo', false
  from cl26 cross join (values
    ('Définir le format de l''album principal.'),
    ('Sélectionner les photos définitives.'),
    ('Construire un ordre racontant les deux journées couvertes.'),
    ('Équilibrer couple, familles, invités, détails et ambiance.'),
    ('Relire les éventuels textes et légendes.'),
    ('Valider la maquette avant impression.'),
    ('Commander l''album définitif.')
  ) as v(label) returning id
),
_cl27_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl27.id, v.label, 'todo', false
  from cl27 cross join (values
    ('Créer une arborescence claire par date et séquence.'),
    ('Conserver les photos originales en haute définition.'),
    ('Conserver les films dans leur qualité maximale.'),
    ('Conserver les scripts, textes et fichiers audio importants.'),
    ('Créer une copie locale.'),
    ('Créer une copie sur un support ou emplacement indépendant.'),
    ('Vérifier périodiquement que les sauvegardes restent lisibles.')
  ) as v(label) returning id
),
_cl28_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl28.id, v.label, 'todo', false
  from cl28 cross join (values
    ('Définir quels contenus seront partagés avec l''ensemble des invités.'),
    ('Créer une sélection raisonnable de photos.'),
    ('Définir le moyen de partage.'),
    ('Vérifier les paramètres d''accès avant diffusion.'),
    ('Partager les vidéos uniquement selon les droits et accords prévus.'),
    ('Prévoir éventuellement des sélections spécifiques pour les familles et témoins.')
  ) as v(label) returning id
),

-- ─── SÉQUENCES (groupes partagés) ────────────────────────────────────────────
sq_4 as materialized (
  select id from _20270628_event_sequences
  where name in (
    'Mariage civil',
    'Goûter d''honneur',
    'Bénédiction à l''église',
    'Célébration de mariage'
  )
),
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
-- m1–m8, m12, m16, m18–m19, m22–m26 → sq_4 (Civil+Goûter+Église+Célébration)
_ms1 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m1.id, sq_4.id from m1 cross join sq_4
  returning mission_id
),
_ms2 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m2.id, sq_4.id from m2 cross join sq_4
  returning mission_id
),
_ms3 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m3.id, sq_4.id from m3 cross join sq_4
  returning mission_id
),
_ms4 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m4.id, sq_4.id from m4 cross join sq_4
  returning mission_id
),
_ms5 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m5.id, sq_4.id from m5 cross join sq_4
  returning mission_id
),
_ms6 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m6.id, sq_4.id from m6 cross join sq_4
  returning mission_id
),
_ms7 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m7.id, sq_4.id from m7 cross join sq_4
  returning mission_id
),
_ms8 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m8.id, sq_4.id from m8 cross join sq_4
  returning mission_id
),
-- m9 → Civil + Église (2)
_ms9 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m9.id, s.id
  from m9
  cross join (
    select id from _20270628_event_sequences
    where name in ('Mariage civil', 'Bénédiction à l''église')
  ) s
  returning mission_id
),
-- m10 → Mariage civil only
_ms10 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m10.id, s.id
  from m10
  cross join (select id from _20270628_event_sequences where name = 'Mariage civil') s
  returning mission_id
),
-- m11 → Bénédiction à l'église only
_ms11 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m11.id, s.id
  from m11
  cross join (select id from _20270628_event_sequences where name = 'Bénédiction à l''église') s
  returning mission_id
),
_ms12 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m12.id, sq_4.id from m12 cross join sq_4
  returning mission_id
),
-- m13, m14, m15 → Célébration de mariage only
_ms13 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m13.id, sq_celebr.id from m13 cross join sq_celebr
  returning mission_id
),
_ms14 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m14.id, sq_celebr.id from m14 cross join sq_celebr
  returning mission_id
),
_ms15 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m15.id, sq_celebr.id from m15 cross join sq_celebr
  returning mission_id
),
_ms16 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m16.id, sq_4.id from m16 cross join sq_4
  returning mission_id
),
-- m17 → all 7
_ms17 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m17.id, sq_all_7.id from m17 cross join sq_all_7
  returning mission_id
),
_ms18 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m18.id, sq_4.id from m18 cross join sq_4
  returning mission_id
),
_ms19 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m19.id, sq_4.id from m19 cross join sq_4
  returning mission_id
),
-- m20 → aucune séquence
-- m21 → Goûter + Convivial + Célébration (3)
_ms21 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m21.id, s.id
  from m21
  cross join (
    select id from _20270628_event_sequences
    where name in (
      'Goûter d''honneur',
      'Moment convivial entre amis',
      'Célébration de mariage'
    )
  ) s
  returning mission_id
),
_ms22 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m22.id, sq_4.id from m22 cross join sq_4
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
_ms26 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m26.id, sq_4.id from m26 cross join sq_4
  returning mission_id
)
-- m27, m28 → aucune séquence

select
  (select count(*) from p)                      as poles,
  (select count(*) from d_strategie)
  + (select count(*) from d_prestataires)
  + (select count(*) from d_brief)
  + (select count(*) from d_personnes)
  + (select count(*) from d_preparatifs)
  + (select count(*) from d_ceremonies)
  + (select count(*) from d_couple)
  + (select count(*) from d_reception)
  + (select count(*) from d_spectacle)
  + (select count(*) from d_invites)
  + (select count(*) from d_technique)
  + (select count(*) from d_souvenirs)
  + (select count(*) from d_livrables_photo)
  + (select count(*) from d_livrables_video)
  + (select count(*) from d_albums)             as domaines,
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
  + (select count(*) from m28)                  as missions,
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
  + (select count(*) from _cl28_items)          as checklist_items,
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
  + (select count(*) from _ms21)
  + (select count(*) from _ms22)
  + (select count(*) from _ms23)
  + (select count(*) from _ms24)
  + (select count(*) from _ms25)
  + (select count(*) from _ms26)                as mission_sequences;
