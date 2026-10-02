-- ============================================================
-- Seed : Pôle "Restauration & boissons" — portail mariage
-- Remplace intégralement le pôle existant (delete + insert).
-- Lancer dans l'éditeur SQL Supabase (rôle service_role).
-- ============================================================

delete from _20270628_poles where name = 'Restauration & boissons';

with

-- ──────────────────────────── Pôle ────────────────────────────
pole as materialized (
  insert into _20270628_poles (id, name, sort_order)
  values (gen_random_uuid(), 'Restauration & boissons', 60)
  returning id
),

-- ──────────────────────────── Domaines ────────────────────────────
d_strat as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Stratégie restauration', 'strategie-restauration', 1, 'avant'
  from pole returning id
),
d_menus as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Menus & offre culinaire', 'menus-offre-culinaire', 2, 'avant'
  from pole returning id
),
d_effectifs as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Effectifs & quantités', 'effectifs-quantites', 3, 'avant'
  from pole returning id
),
d_regimes as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Régimes, allergies & enfants', 'regimes-allergies-enfants', 4, null
  from pole returning id
),
d_traiteur as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Traiteur & prestataires food', 'traiteur-prestataires-food', 5, 'avant'
  from pole returning id
),
d_boissons as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Boissons', 'boissons', 6, 'avant'
  from pole returning id
),
d_materiel as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Matériel & implantation', 'materiel-implantation', 7, 'avant'
  from pole returning id
),
d_instal as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Installation & contrôle', 'installation-controle-restauration', 8, 'installation'
  from pole returning id
),
d_service as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Service & réassort', 'service-reassort', 9, 'jour_j'
  from pole returning id
),
d_hygiene as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Hygiène & conservation', 'hygiene-conservation', 10, null
  from pole returning id
),
d_restes as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Restes & clôture', 'restes-cloture', 11, 'desinstallation'
  from pole returning id
),

-- ──────────────────────────── Missions ────────────────────────────
-- d_strat
m1  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_strat.id,     'Définir le format de restauration de chaque séquence',          'todo', 1 from d_strat     returning id),
m2  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_strat.id,     'Construire le budget restauration et boissons',                 'todo', 2 from d_strat     returning id),
-- d_menus
m3  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_menus.id,     'Construire le menu de la célébration du lundi',                 'todo', 1 from d_menus     returning id),
m4  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_menus.id,     'Finaliser les recettes et adaptations avec le traiteur',        'todo', 2 from d_menus     returning id),
m5  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_menus.id,     'Définir l''offre alimentaire des autres journées',              'todo', 3 from d_menus     returning id),
-- d_effectifs
m6  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_effectifs.id, 'Déterminer les effectifs à nourrir par séquence',               'todo', 1 from d_effectifs  returning id),
m7  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_effectifs.id, 'Calculer et valider les quantités de nourriture',               'todo', 2 from d_effectifs  returning id),
m8  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_effectifs.id, 'Figer les quantités finales auprès des prestataires',           'todo', 3 from d_effectifs  returning id),
-- d_regimes
m9  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_regimes.id,   'Recenser les contraintes alimentaires',                         'todo', 1 from d_regimes    returning id),
m10 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_regimes.id,   'Prévoir les repas ou alternatives adaptés',                     'todo', 2 from d_regimes    returning id),
m11 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_regimes.id,   'Vérifier l''information sur les allergènes',                    'todo', 3 from d_regimes    returning id),
-- d_traiteur
m12 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_traiteur.id,  'Finaliser la prestation du traiteur principal',                  'todo', 1 from d_traiteur   returning id),
m13 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_traiteur.id,  'Finaliser la prestation du glacier',                             'todo', 2 from d_traiteur   returning id),
m14 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_traiteur.id,  'Préparer les éventuels autres prestataires alimentaires',        'todo', 3 from d_traiteur   returning id),
-- d_boissons
m15 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_boissons.id,  'Définir l''offre de boissons par séquence',                     'todo', 1 from d_boissons   returning id),
m16 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_boissons.id,  'Calculer les quantités de boissons',                            'todo', 2 from d_boissons   returning id),
m17 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_boissons.id,  'Organiser l''achat, la livraison et le stockage des boissons',  'todo', 3 from d_boissons   returning id),
m18 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_boissons.id,  'Définir le bar de nuit',                                        'todo', 4 from d_boissons   returning id),
-- d_materiel
m19 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_materiel.id,  'Définir le matériel nécessaire à la restauration',              'todo', 1 from d_materiel   returning id),
m20 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_materiel.id,  'Concevoir l''implantation du buffet et des boissons à Ostara',  'todo', 2 from d_materiel   returning id),
-- d_instal
m21 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_instal.id,    'Réceptionner et contrôler les prestations alimentaires',         'todo', 1 from d_instal     returning id),
m22 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_instal.id,    'Installer les espaces de restauration et boissons',              'todo', 2 from d_instal     returning id),
-- d_service
m23 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_service.id,   'Piloter le lancement des différents services',                   'todo', 1 from d_service    returning id),
m24 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_service.id,   'Suivre le buffet et les boissons pendant le service',            'todo', 2 from d_service    returning id),
m25 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_service.id,   'Coordonner le dessert, le glacier et la suite de soirée',        'todo', 3 from d_service    returning id),
-- d_hygiene
m26 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_hygiene.id,   'Préparer les conditions de conservation des aliments et boissons','todo', 1 from d_hygiene    returning id),
m27 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_hygiene.id,   'Maintenir les conditions d''hygiène pendant le service',         'todo', 2 from d_hygiene    returning id),
-- d_restes
m28 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_restes.id,    'Gérer les restes alimentaires et boissons',                     'todo', 1 from d_restes     returning id),
m29 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_restes.id,    'Clôturer les espaces de restauration',                          'todo', 2 from d_restes     returning id),

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
cl29 as materialized (insert into _20270628_checklists (id, owner_type, owner_id, title) select gen_random_uuid(), 'mission', m29.id, 'TODO' from m29 returning id),

-- ──────────────────────────── Items ────────────────────────────
-- m1 — Format de restauration par séquence (7 items, high)
i1 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl1.id, v.lbl, 'todo', 'high', false, v.n
  from cl1 cross join (values
    (0, 'Définir si une offre alimentaire est nécessaire pour chaque séquence.'),
    (1, 'Définir le format de service adapté à chaque moment.'),
    (2, 'Définir le niveau de prestation attendu.'),
    (3, 'Définir les horaires prévisionnels de service.'),
    (4, 'Identifier les prestations prises en charge par un professionnel.'),
    (5, 'Identifier les éventuelles contributions ou préparations personnelles.'),
    (6, 'Vérifier la cohérence avec le rythme général des quatre jours.')
  ) as v(n, lbl)
  returning id
),
-- m2 — Budget restauration et boissons (7 items, high)
i2 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl2.id, v.lbl, 'todo', 'high', false, v.n
  from cl2 cross join (values
    (0, 'Définir l''enveloppe cible par séquence.'),
    (1, 'Distinguer nourriture, boissons, service, matériel et frais annexes.'),
    (2, 'Intégrer les éventuels coûts de livraison ou déplacement.'),
    (3, 'Intégrer les coûts de vaisselle, verrerie et nappage lorsqu''ils ne sont pas inclus.'),
    (4, 'Intégrer les éventuels coûts de personnel supplémentaire.'),
    (5, 'Comparer le budget prévisionnel aux devis reçus.'),
    (6, 'Mettre à jour l''estimation après chaque décision importante.')
  ) as v(n, lbl)
  returning id
),
-- m3 — Menu de la célébration du lundi (10 items, high)
i3 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl3.id, v.lbl, 'todo', 'high', false, v.n
  from cl3 cross join (values
    (0, 'Valider la composition du cocktail ou rhum d''honneur.'),
    (1, 'Valider l''équilibre entre spécialités créoles, malgaches et indiennes.'),
    (2, 'Valider les pièces froides, chaudes et moins frites.'),
    (3, 'Valider la présence du composé malgache en verrine.'),
    (4, 'Valider l''animation plancha avec les seiches persillées.'),
    (5, 'Valider la proposition de makis malgaches.'),
    (6, 'Valider les plats principaux du buffet.'),
    (7, 'Valider les accompagnements.'),
    (8, 'Valider le dessert et l''articulation avec l''offre de glaces.'),
    (9, 'Vérifier que l''ensemble reste cohérent en quantité et en rythme.')
  ) as v(n, lbl)
  returning id
),
-- m4 — Recettes et adaptations avec le traiteur (9 items, high)
i4 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl4.id, v.lbl, 'todo', 'high', false, v.n
  from cl4 cross join (values
    (0, 'Transmettre les recettes spécifiques lorsque le traiteur en a besoin.'),
    (1, 'Valider la recette du mini bokit au poulet.'),
    (2, 'Valider la recette du samoussa au thon.'),
    (3, 'Valider la composition du féroce d''avocat.'),
    (4, 'Valider le feuilleté aux achards.'),
    (5, 'Choisir et valider l''apéritif indien remplaçant la croustade de poulet.'),
    (6, 'Valider la composition du composé malgache.'),
    (7, 'Valider les modalités de préparation des makis malgaches.'),
    (8, 'Valider les ajustements de recettes après dégustation ou échange.')
  ) as v(n, lbl)
  returning id
),
-- m5 — Offre alimentaire des autres journées (7 items, high)
i5 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl5.id, v.lbl, 'todo', 'high', false, v.n
  from cl5 cross join (values
    (0, 'Définir précisément l''offre du goûter d''honneur du vendredi.'),
    (1, 'Définir l''offre alimentaire du moment convivial du samedi.'),
    (2, 'Décider du format définitif du rendez-vous du dimanche midi.'),
    (3, 'Déterminer si une collation est nécessaire autour de la bénédiction au khane.'),
    (4, 'Déterminer si une collation ou un rafraîchissement est nécessaire autour de l''église.'),
    (5, 'Éviter les doublons ou repas trop lourds sur plusieurs jours consécutifs.'),
    (6, 'Adapter les formats aux contraintes des lieux et des horaires.')
  ) as v(n, lbl)
  returning id
),
-- m6 — Effectifs à nourrir par séquence (6 items, high)
i6 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl6.id, v.lbl, 'todo', 'high', false, v.n
  from cl6 cross join (values
    (0, 'Extraire les invités attendus pour chaque séquence.'),
    (1, 'Distinguer adultes et enfants lorsque cela influe sur les quantités.'),
    (2, 'Ajouter les prestataires ou membres d''équipe devant être nourris.'),
    (3, 'Identifier les personnes présentes seulement sur une partie du service.'),
    (4, 'Prévoir une marge adaptée aux incertitudes restantes.'),
    (5, 'Communiquer les effectifs provisoires puis définitifs aux prestataires concernés.')
  ) as v(n, lbl)
  returning id
),
-- m7 — Quantités de nourriture (8 items, high)
i7 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl7.id, v.lbl, 'todo', 'high', false, v.n
  from cl7 cross join (values
    (0, 'Définir le nombre de pièces apéritives par personne.'),
    (1, 'Répartir les quantités entre les différentes pièces proposées.'),
    (2, 'Définir les quantités des plats principaux.'),
    (3, 'Définir les quantités des accompagnements.'),
    (4, 'Définir les quantités de dessert.'),
    (5, 'Définir les quantités spécifiques pour les enfants lorsque nécessaire.'),
    (6, 'Vérifier que les quantités correspondent au format buffet et à la durée de la réception.'),
    (7, 'Faire valider les hypothèses par le traiteur.')
  ) as v(n, lbl)
  returning id
),
-- m8 — Figer les quantités finales (7 items, high)
i8 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl8.id, v.lbl, 'todo', 'high', false, v.n
  from cl8 cross join (values
    (0, 'Identifier la date limite de modification des effectifs.'),
    (1, 'Mettre à jour les présences à l''approche du mariage.'),
    (2, 'Calculer l''effectif final à communiquer.'),
    (3, 'Vérifier les quantités contractuelles associées.'),
    (4, 'Envoyer les effectifs définitifs par écrit.'),
    (5, 'Conserver la confirmation du prestataire.'),
    (6, 'Répercuter toute modification exceptionnelle acceptée.')
  ) as v(n, lbl)
  returning id
),
-- m9 — Recenser les contraintes alimentaires (7 items, high)
i9 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl9.id, v.lbl, 'todo', 'high', false, v.n
  from cl9 cross join (values
    (0, 'Recenser les allergies alimentaires déclarées.'),
    (1, 'Recenser les intolérances déclarées.'),
    (2, 'Recenser les régimes alimentaires nécessitant une adaptation.'),
    (3, 'Identifier les contraintes religieuses ou culturelles pertinentes.'),
    (4, 'Distinguer les préférences des contraintes médicales ou impératives.'),
    (5, 'Associer les besoins aux séquences auxquelles les personnes participent.'),
    (6, 'Transmettre uniquement les informations nécessaires aux prestataires concernés.')
  ) as v(n, lbl)
  returning id
),
-- m10 — Repas ou alternatives adaptés (6 items, high)
i10 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl10.id, v.lbl, 'todo', 'high', false, v.n
  from cl10 cross join (values
    (0, 'Vérifier avec le traiteur les alternatives disponibles.'),
    (1, 'Prévoir des portions identifiables pour les personnes concernées.'),
    (2, 'Vérifier les risques de contamination croisée pour les allergies sérieuses.'),
    (3, 'Définir comment les invités concernés récupéreront leur repas.'),
    (4, 'Prévoir des options adaptées aux enfants si nécessaire.'),
    (5, 'Informer les responsables du service des dispositions particulières.')
  ) as v(n, lbl)
  returning id
),
-- m11 — Vérifier l'information sur les allergènes (6 items, high)
i11 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl11.id, v.lbl, 'todo', 'high', false, v.n
  from cl11 cross join (values
    (0, 'Obtenir les informations allergènes auprès des prestataires.'),
    (1, 'Vérifier que les équipes de service savent répondre aux questions essentielles.'),
    (2, 'Prévoir un étiquetage lorsque nécessaire.'),
    (3, 'Identifier clairement les préparations spécifiques.'),
    (4, 'Éviter les mélanges entre plats standards et portions adaptées.'),
    (5, 'Vérifier les dernières modifications avant le service.')
  ) as v(n, lbl)
  returning id
),
-- m12 — Prestation du traiteur principal (9 items, high)
i12 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl12.id, v.lbl, 'todo', 'high', false, v.n
  from cl12 cross join (values
    (0, 'Valider le menu définitif.'),
    (1, 'Valider les quantités et effectifs de référence.'),
    (2, 'Valider le format du cocktail et du buffet.'),
    (3, 'Valider les animations culinaires retenues.'),
    (4, 'Valider le nombre de personnes prévues au service.'),
    (5, 'Valider les horaires d''arrivée, préparation et service.'),
    (6, 'Valider le matériel fourni par le traiteur.'),
    (7, 'Valider les éléments restant à fournir par les mariés ou le lieu.'),
    (8, 'Valider le prix final et les modalités de règlement.')
  ) as v(n, lbl)
  returning id
),
-- m13 — Prestation du glacier (9 items, high)
i13 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl13.id, v.lbl, 'todo', 'high', false, v.n
  from cl13 cross join (values
    (0, 'Valider le créneau d''intervention du glacier.'),
    (1, 'Valider le principe de glaces à volonté.'),
    (2, 'Valider le nombre de parfums proposé.'),
    (3, 'Choisir ou valider les parfums.'),
    (4, 'Valider le nombre de personnes couvertes.'),
    (5, 'Valider les besoins électriques et techniques.'),
    (6, 'Valider l''espace nécessaire au camion ou stand.'),
    (7, 'Valider les horaires d''installation et de départ.'),
    (8, 'Coordonner l''offre avec le dessert du traiteur.')
  ) as v(n, lbl)
  returning id
),
-- m14 — Autres prestataires alimentaires (7 items, normal)
i14 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl14.id, v.lbl, 'todo', 'normal', false, v.n
  from cl14 cross join (values
    (0, 'Identifier les prestations alimentaires non couvertes par le traiteur principal.'),
    (1, 'Vérifier les autorisations du lieu.'),
    (2, 'Définir les horaires d''intervention.'),
    (3, 'Définir les besoins de stockage ou de branchement.'),
    (4, 'Définir le matériel et consommables fournis.'),
    (5, 'Vérifier les quantités commandées.'),
    (6, 'Définir le contact opérationnel du jour.')
  ) as v(n, lbl)
  returning id
),
-- m15 — Offre de boissons par séquence (7 items, high)
i15 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl15.id, v.lbl, 'todo', 'high', false, v.n
  from cl15 cross join (values
    (0, 'Définir les boissons sans alcool nécessaires.'),
    (1, 'Définir les eaux plates et gazeuses.'),
    (2, 'Définir les boissons chaudes lorsque pertinentes.'),
    (3, 'Définir les boissons alcoolisées retenues lorsque prévues.'),
    (4, 'Définir l''offre spécifique des temps d''accueil ou de toast.'),
    (5, 'Adapter l''offre à la durée et au moment de la journée.'),
    (6, 'Vérifier les règles des lieux concernant les boissons extérieures.')
  ) as v(n, lbl)
  returning id
),
-- m16 — Quantités de boissons (7 items, high)
i16 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl16.id, v.lbl, 'todo', 'high', false, v.n
  from cl16 cross join (values
    (0, 'Déterminer les quantités d''eau nécessaires.'),
    (1, 'Déterminer les quantités de boissons sans alcool.'),
    (2, 'Déterminer les quantités de champagne ou vin effervescent si prévu.'),
    (3, 'Déterminer les quantités de vin si prévu.'),
    (4, 'Déterminer les quantités nécessaires au bar de soirée.'),
    (5, 'Prévoir les glaçons et besoins de refroidissement.'),
    (6, 'Prévoir une marge adaptée au nombre d''invités et à la météo.')
  ) as v(n, lbl)
  returning id
),
-- m17 — Achat, livraison et stockage des boissons (8 items, normal)
i17 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl17.id, v.lbl, 'todo', 'normal', false, v.n
  from cl17 cross join (values
    (0, 'Identifier les boissons fournies par les prestataires.'),
    (1, 'Lister les boissons restant à acheter.'),
    (2, 'Comparer les conditions d''achat et de reprise des bouteilles non ouvertes lorsqu''elles existent.'),
    (3, 'Planifier les commandes.'),
    (4, 'Planifier le transport ou la livraison.'),
    (5, 'Prévoir un lieu de stockage adapté.'),
    (6, 'Prévoir la mise au frais progressive des boissons.'),
    (7, 'Identifier les personnes chargées du suivi du stock.')
  ) as v(n, lbl)
  returning id
),
-- m18 — Bar de nuit (8 items, high)
i18 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl18.id, v.lbl, 'todo', 'high', false, v.n
  from cl18 cross join (values
    (0, 'Décider du format du bar de nuit.'),
    (1, 'Définir les boissons proposées.'),
    (2, 'Définir les boissons non alcoolisées disponibles en permanence.'),
    (3, 'Définir qui assure le service.'),
    (4, 'Définir les horaires du bar.'),
    (5, 'Définir le matériel et les consommables nécessaires.'),
    (6, 'Prévoir les quantités et le réassort.'),
    (7, 'Prévoir l''eau accessible jusqu''à la fin de la soirée.')
  ) as v(n, lbl)
  returning id
),
-- m19 — Matériel nécessaire à la restauration (9 items, high)
i19 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl19.id, v.lbl, 'todo', 'high', false, v.n
  from cl19 cross join (values
    (0, 'Lister la vaisselle nécessaire.'),
    (1, 'Lister la verrerie nécessaire.'),
    (2, 'Lister les couverts nécessaires.'),
    (3, 'Lister les éléments de service du buffet.'),
    (4, 'Lister les contenants, plateaux et présentoirs nécessaires.'),
    (5, 'Lister les besoins de maintien au chaud ou au froid.'),
    (6, 'Lister les poubelles et consommables nécessaires.'),
    (7, 'Identifier ce qui est fourni par chaque prestataire.'),
    (8, 'Identifier ce qui doit être loué ou acheté séparément.')
  ) as v(n, lbl)
  returning id
),
-- m20 — Implantation du buffet et boissons à Ostara (8 items, high)
i20 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl20.id, v.lbl, 'todo', 'high', false, v.n
  from cl20 cross join (values
    (0, 'Définir l''emplacement du cocktail ou des pièces apéritives.'),
    (1, 'Définir l''emplacement de l''animation plancha.'),
    (2, 'Définir l''emplacement du buffet principal.'),
    (3, 'Définir l''emplacement des boissons.'),
    (4, 'Définir l''emplacement du dessert et l''articulation avec le glacier.'),
    (5, 'Prévoir suffisamment d''espace pour les files et circulations.'),
    (6, 'Prévoir les accès nécessaires au personnel de service.'),
    (7, 'Éviter les croisements gênants entre invités et réassort.')
  ) as v(n, lbl)
  returning id
),
-- m21 — Réceptionner et contrôler les prestations (6 items, high)
i21 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl21.id, v.lbl, 'todo', 'high', false, v.n
  from cl21 cross join (values
    (0, 'Vérifier l''arrivée des prestataires à l''heure prévue.'),
    (1, 'Vérifier les quantités ou éléments livrés lorsque possible.'),
    (2, 'Vérifier l''état apparent des produits et matériels.'),
    (3, 'Vérifier les besoins de stockage immédiat.'),
    (4, 'Vérifier la conformité avec les commandes principales.'),
    (5, 'Signaler immédiatement les manquants ou écarts critiques.')
  ) as v(n, lbl)
  returning id
),
-- m22 — Installer les espaces de restauration et boissons (8 items, high)
i22 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl22.id, v.lbl, 'todo', 'high', false, v.n
  from cl22 cross join (values
    (0, 'Installer les tables et supports nécessaires au service.'),
    (1, 'Mettre en place la vaisselle et les consommables.'),
    (2, 'Préparer les zones de boissons.'),
    (3, 'Préparer les zones de réassort.'),
    (4, 'Préparer les poubelles et zones de débarrassage.'),
    (5, 'Vérifier les branchements nécessaires.'),
    (6, 'Vérifier que les circulations restent fluides.'),
    (7, 'Effectuer un contrôle final avant ouverture.')
  ) as v(n, lbl)
  returning id
),
-- m23 — Lancement des différents services (6 items, high)
i23 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl23.id, v.lbl, 'todo', 'high', false, v.n
  from cl23 cross join (values
    (0, 'Confirmer avec le coordinateur le moment de lancement.'),
    (1, 'Vérifier que la nourriture est prête avant d''ouvrir le service.'),
    (2, 'Vérifier que les boissons nécessaires sont disponibles.'),
    (3, 'Vérifier que les équipes de service sont en position.'),
    (4, 'Ouvrir le service au moment prévu ou ajusté.'),
    (5, 'Informer rapidement le coordinateur en cas de retard.')
  ) as v(n, lbl)
  returning id
),
-- m24 — Suivre le buffet et les boissons (7 items, high)
i24 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl24.id, v.lbl, 'todo', 'high', false, v.n
  from cl24 cross join (values
    (0, 'Surveiller les niveaux des plats.'),
    (1, 'Organiser le réassort avant rupture.'),
    (2, 'Surveiller les niveaux de boissons.'),
    (3, 'Maintenir les zones de service propres.'),
    (4, 'Retirer les contenants vides ou dégradés.'),
    (5, 'Vérifier que les options spécifiques restent disponibles pour les personnes concernées.'),
    (6, 'Adapter le rythme du réassort à la consommation réelle.')
  ) as v(n, lbl)
  returning id
),
-- m25 — Dessert, glacier et suite de soirée (7 items, high)
i25 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl25.id, v.lbl, 'todo', 'high', false, v.n
  from cl25 cross join (values
    (0, 'Confirmer l''heure réelle du dessert.'),
    (1, 'Prévenir le glacier suffisamment tôt.'),
    (2, 'Vérifier que l''espace glacier est prêt.'),
    (3, 'Éviter un chevauchement incohérent entre dessert et glaces.'),
    (4, 'Prévoir le maintien des boissons pendant ce temps.'),
    (5, 'Coordonner la transition vers le bar de nuit.'),
    (6, 'Vérifier que de l''eau et des boissons sans alcool restent disponibles.')
  ) as v(n, lbl)
  returning id
),
-- m26 — Conservation des aliments et boissons (6 items, high)
i26 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl26.id, v.lbl, 'todo', 'high', false, v.n
  from cl26 cross join (values
    (0, 'Identifier les produits nécessitant une conservation au froid.'),
    (1, 'Vérifier les capacités frigorifiques disponibles.'),
    (2, 'Prévoir les contenants ou glacières nécessaires en complément.'),
    (3, 'Limiter les durées d''exposition des produits sensibles.'),
    (4, 'Définir les zones propres de stockage.'),
    (5, 'Vérifier avec les professionnels leurs procédures de conservation.')
  ) as v(n, lbl)
  returning id
),
-- m27 — Hygiène pendant le service (6 items, high)
i27 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl27.id, v.lbl, 'todo', 'high', false, v.n
  from cl27 cross join (values
    (0, 'Maintenir propres les zones de service.'),
    (1, 'Évacuer régulièrement les déchets.'),
    (2, 'Éviter de laisser inutilement les produits sensibles à température ambiante.'),
    (3, 'Remplacer les ustensiles de service souillés lorsque nécessaire.'),
    (4, 'Protéger les réserves destinées au réassort.'),
    (5, 'Signaler immédiatement toute situation présentant un risque alimentaire.')
  ) as v(n, lbl)
  returning id
),
-- m28 — Gérer les restes (7 items, normal)
i28 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl28.id, v.lbl, 'todo', 'normal', false, v.n
  from cl28 cross join (values
    (0, 'Identifier les aliments pouvant être conservés en sécurité.'),
    (1, 'Écarter les aliments ne pouvant pas être conservés sans risque.'),
    (2, 'Prévoir des contenants adaptés pour les restes conservables.'),
    (3, 'Définir les personnes ou destinations des restes.'),
    (4, 'Inventorier les boissons non consommées.'),
    (5, 'Mettre de côté les bouteilles pouvant être reprises ou conservées.'),
    (6, 'Stocker rapidement les produits nécessitant du froid.')
  ) as v(n, lbl)
  returning id
),
-- m29 — Clôturer les espaces de restauration (7 items, high)
i29 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl29.id, v.lbl, 'todo', 'high', false, v.n
  from cl29 cross join (values
    (0, 'Débarrasser les zones de buffet et de boissons.'),
    (1, 'Regrouper la vaisselle et le matériel selon leur destination.'),
    (2, 'Identifier le matériel loué ou appartenant aux prestataires.'),
    (3, 'Vérifier les zones de stockage et de préparation.'),
    (4, 'Évacuer les déchets selon les règles du lieu.'),
    (5, 'Vérifier qu''aucune denrée ou boisson n''est oubliée.'),
    (6, 'Signaler les pertes, casses ou incidents nécessitant un suivi.')
  ) as v(n, lbl)
  returning id
),

-- ──────────────────────────── Liens mission ↔ séquences ────────────────────────────
-- Groupe A : 6 séquences (toutes sauf Mariage civil)
sq_6 as materialized (
  select id from _20270628_event_sequences
  where name in (
    'Goûter d''honneur','Moment convivial entre amis','Pique-nique partagé',
    'Bénédiction au khane','Bénédiction à l''église','Célébration de mariage'
  )
),
-- Groupe B : 3 séquences (Goûter d'honneur + Moment convivial + Célébration)
sq_3 as materialized (
  select id from _20270628_event_sequences
  where name in ('Goûter d''honneur','Moment convivial entre amis','Célébration de mariage')
),

-- Missions avec groupe A (6 seqs)
sq_m1  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m1.id,  sq_6.id from m1,  sq_6 returning mission_id),
sq_m2  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m2.id,  sq_6.id from m2,  sq_6 returning mission_id),
sq_m6  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m6.id,  sq_6.id from m6,  sq_6 returning mission_id),
sq_m8  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m8.id,  sq_6.id from m8,  sq_6 returning mission_id),
sq_m9  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m9.id,  sq_6.id from m9,  sq_6 returning mission_id),
sq_m10 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m10.id, sq_6.id from m10, sq_6 returning mission_id),
sq_m11 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m11.id, sq_6.id from m11, sq_6 returning mission_id),
sq_m14 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m14.id, sq_6.id from m14, sq_6 returning mission_id),
sq_m15 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m15.id, sq_6.id from m15, sq_6 returning mission_id),
sq_m16 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m16.id, sq_6.id from m16, sq_6 returning mission_id),
sq_m17 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m17.id, sq_6.id from m17, sq_6 returning mission_id),
sq_m26 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m26.id, sq_6.id from m26, sq_6 returning mission_id),
sq_m27 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m27.id, sq_6.id from m27, sq_6 returning mission_id),

-- Missions avec Célébration de mariage uniquement
sq_m3 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m3.id, s.id from m3, _20270628_event_sequences s where s.name = 'Célébration de mariage' returning mission_id
),
sq_m4 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m4.id, s.id from m4, _20270628_event_sequences s where s.name = 'Célébration de mariage' returning mission_id
),
sq_m7 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m7.id, s.id from m7, _20270628_event_sequences s where s.name = 'Célébration de mariage' returning mission_id
),
sq_m12 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m12.id, s.id from m12, _20270628_event_sequences s where s.name = 'Célébration de mariage' returning mission_id
),
sq_m13 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m13.id, s.id from m13, _20270628_event_sequences s where s.name = 'Célébration de mariage' returning mission_id
),
sq_m18 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m18.id, s.id from m18, _20270628_event_sequences s where s.name = 'Célébration de mariage' returning mission_id
),
sq_m20 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m20.id, s.id from m20, _20270628_event_sequences s where s.name = 'Célébration de mariage' returning mission_id
),
sq_m25 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m25.id, s.id from m25, _20270628_event_sequences s where s.name = 'Célébration de mariage' returning mission_id
),

-- m5 — 5 séquences (sans Célébration de mariage)
sq_m5 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m5.id, s.id from m5, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Pique-nique partagé','Bénédiction au khane','Bénédiction à l''église')
  returning mission_id
),

-- Missions avec groupe B (3 seqs : Goûter + Convivial + Célébration)
sq_m19 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m19.id, sq_3.id from m19, sq_3 returning mission_id),
sq_m21 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m21.id, sq_3.id from m21, sq_3 returning mission_id),
sq_m22 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m22.id, sq_3.id from m22, sq_3 returning mission_id),
sq_m23 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m23.id, sq_3.id from m23, sq_3 returning mission_id),
sq_m24 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m24.id, sq_3.id from m24, sq_3 returning mission_id),
sq_m28 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m28.id, sq_3.id from m28, sq_3 returning mission_id),
sq_m29 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m29.id, sq_3.id from m29, sq_3 returning mission_id)

-- ──────────────────────────── Vérification ────────────────────────────
select
  (select count(*) from _20270628_domaines  d join _20270628_poles p on p.id = d.pole_id where p.name = 'Restauration & boissons') as domaines,
  (select count(*) from _20270628_missions  m join _20270628_domaines d on d.id = m.domaine_id join _20270628_poles p on p.id = d.pole_id where p.name = 'Restauration & boissons') as missions,
  (select count(*) from sq_m1) + (select count(*) from sq_m3) + (select count(*) from sq_m5) as seq_liens_spot;
