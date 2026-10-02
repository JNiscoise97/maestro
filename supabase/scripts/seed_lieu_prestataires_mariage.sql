-- ============================================================
-- Seed : Pôle "Lieu & prestataires" — portail mariage
-- Remplace intégralement le pôle existant (delete + insert).
-- Lancer dans l'éditeur SQL Supabase (rôle service_role).
-- ============================================================

delete from _20270628_poles where name = 'Lieu & prestataires';

with

-- ──────────────────────────── Pôle ────────────────────────────
pole as materialized (
  insert into _20270628_poles (id, name, sort_order)
  values (gen_random_uuid(), 'Lieu & prestataires', 40)
  returning id
),

-- ──────────────────────────── Domaines ────────────────────────────
d_recherche as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Recherche & sélection', 'recherche-selection', 1, 'avant'
  from pole returning id
),
d_contrats as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Contrats & réservations', 'contrats-reservations', 2, 'avant'
  from pole returning id
),
d_contraintes as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Contraintes des lieux', 'contraintes-lieux', 3, 'avant'
  from pole returning id
),
d_ostara as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Domaine Ostara', 'domaine-ostara', 4, 'avant'
  from pole returning id
),
d_cadrage as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Cadrage des prestataires', 'cadrage-prestataires', 5, 'avant'
  from pole returning id
),
d_acces as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Accès & installation prestataires', 'acces-installation-prestataires', 6, null
  from pole returning id
),
d_technique as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Technique & ressources des lieux', 'technique-ressources-lieux', 7, 'avant'
  from pole returning id
),
d_fin as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, sort_order, phase)
  select gen_random_uuid(), pole.id, 'Fin de prestation & restitution', 'fin-prestation-restitution', 8, null
  from pole returning id
),

-- ──────────────────────────── Missions ────────────────────────────
-- d_recherche
m1  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_recherche.id,  'Formaliser les besoins pour chaque lieu ou prestation',           'todo', 1 from d_recherche  returning id),
m2  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_recherche.id,  'Rechercher et comparer les lieux ou prestataires manquants',      'todo', 2 from d_recherche  returning id),
m3  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_recherche.id,  'Valider le choix d''un lieu ou prestataire',                      'todo', 3 from d_recherche  returning id),
-- d_contrats
m4  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_contrats.id,   'Formaliser chaque réservation ou engagement',                     'todo', 1 from d_contrats   returning id),
m5  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_contrats.id,   'Suivre les acomptes et échéances contractuelles',                 'todo', 2 from d_contrats   returning id),
m6  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_contrats.id,   'Centraliser les documents des lieux et prestataires',             'todo', 3 from d_contrats   returning id),
-- d_contraintes
m7  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_contraintes.id,'Recenser les contraintes de chaque lieu',                         'todo', 1 from d_contraintes returning id),
m8  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_contraintes.id,'Documenter les accès et circulations de chaque lieu',             'todo', 2 from d_contraintes returning id),
m9  as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_contraintes.id,'Organiser une visite technique lorsque nécessaire',               'todo', 3 from d_contraintes returning id),
-- d_ostara
m10 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_ostara.id,     'Finaliser les conditions d''utilisation du Domaine Ostara',       'todo', 1 from d_ostara     returning id),
m11 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_ostara.id,     'Planifier l''installation du Domaine Ostara le lundi matin',      'todo', 2 from d_ostara     returning id),
m12 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_ostara.id,     'Valider le plan d''utilisation du Domaine Ostara',                'todo', 3 from d_ostara     returning id),
-- d_cadrage
m13 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_cadrage.id,    'Formaliser la fiche opérationnelle de chaque prestataire',        'todo', 1 from d_cadrage    returning id),
m14 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_cadrage.id,    'Vérifier les interfaces entre prestataires',                      'todo', 2 from d_cadrage    returning id),
m15 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_cadrage.id,    'Confirmer les prestations avant le mariage',                      'todo', 3 from d_cadrage    returning id),
-- d_acces
m16 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_acces.id,      'Préparer l''arrivée des prestataires',                            'todo', 1 from d_acces      returning id),
m17 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_acces.id,      'Accueillir les prestataires sur site',                            'todo', 2 from d_acces      returning id),
m18 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_acces.id,      'Contrôler la conformité des installations prestataires',          'todo', 3 from d_acces      returning id),
-- d_technique
m19 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_technique.id,  'Recenser les ressources techniques disponibles',                  'todo', 1 from d_technique  returning id),
m20 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_technique.id,  'Valider les besoins techniques des prestations',                  'todo', 2 from d_technique  returning id),
-- d_fin
m21 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_fin.id,        'Préparer les modalités de fin de prestation',                     'todo', 1 from d_fin        returning id),
m22 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_fin.id,        'Contrôler la fin d''intervention des prestataires',               'todo', 2 from d_fin        returning id),
m23 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_fin.id,        'Restituer les lieux',                                             'todo', 3 from d_fin        returning id),
m24 as materialized (insert into _20270628_missions (id, domaine_id, title, status, sort_order) select gen_random_uuid(), d_fin.id,        'Clôturer administrativement les prestations',                     'todo', 4 from d_fin        returning id),

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

-- ──────────────────────────── Items ────────────────────────────
-- m1 — Formaliser les besoins
i1 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl1.id, v.lbl, 'todo', v.prio, false, v.n
  from cl1 cross join (values
    (0, 'Définir précisément le besoin à couvrir.',                                      'normal'),
    (1, 'Identifier la ou les séquences concernées.',                                    'normal'),
    (2, 'Définir la capacité ou le volume nécessaire.',                                  'normal'),
    (3, 'Lister les contraintes indispensables et les critères souhaitables.',           'normal'),
    (4, 'Définir le budget cible.',                                                      'normal'),
    (5, 'Identifier les horaires et contraintes d''accès nécessaires.',                 'normal'),
    (6, 'Formaliser les questions à poser avant toute validation.',                      'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m2 — Rechercher et comparer
i2 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl2.id, v.lbl, 'todo', v.prio, false, v.n
  from cl2 cross join (values
    (0, 'Identifier plusieurs options lorsque cela est pertinent.',                                        'normal'),
    (1, 'Vérifier la disponibilité à la date concernée.',                                                  'normal'),
    (2, 'Comparer les prestations réellement incluses.',                                                   'normal'),
    (3, 'Comparer les tarifs et éventuels frais additionnels.',                                            'normal'),
    (4, 'Comparer les contraintes d''accès, d''installation et de démontage.',                            'normal'),
    (5, 'Vérifier les conditions d''annulation ou de modification.',                                      'normal'),
    (6, 'Documenter les raisons du choix final.',                                                          'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m3 — Valider le choix
i3 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl3.id, v.lbl, 'todo', v.prio, false, v.n
  from cl3 cross join (values
    (0, 'Vérifier que le besoin fonctionnel est couvert.',                                     'high'),
    (1, 'Vérifier que le budget est compatible avec l''enveloppe prévue.',                    'high'),
    (2, 'Vérifier les horaires et contraintes opérationnelles.',                               'high'),
    (3, 'Vérifier les prestations incluses et exclues.',                                       'high'),
    (4, 'Vérifier les conditions de paiement.',                                                'high'),
    (5, 'Valider le choix avant engagement définitif.',                                        'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m4 — Formaliser chaque réservation
i4 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl4.id, v.lbl, 'todo', v.prio, false, v.n
  from cl4 cross join (values
    (0, 'Obtenir un devis ou document contractuel écrit.',                                          'high'),
    (1, 'Vérifier l''identité et les coordonnées du cocontractant.',                              'high'),
    (2, 'Vérifier la date, les horaires et le lieu prévus.',                                       'high'),
    (3, 'Vérifier le détail des prestations incluses.',                                            'high'),
    (4, 'Vérifier les quantités ou capacités prévues.',                                            'high'),
    (5, 'Vérifier les frais supplémentaires éventuels.',                                           'high'),
    (6, 'Vérifier les conditions d''annulation, de report et de remboursement.',                  'high'),
    (7, 'Conserver une copie du document validé.',                                                 'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m5 — Suivre les acomptes
i5 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl5.id, v.lbl, 'todo', v.prio, false, v.n
  from cl5 cross join (values
    (0, 'Enregistrer les montants des acomptes demandés.',                                               'high'),
    (1, 'Enregistrer les dates limites de paiement.',                                                    'high'),
    (2, 'Identifier les échéances conditionnant le maintien d''une réservation.',                       'high'),
    (3, 'Conserver les justificatifs de paiement.',                                                      'high'),
    (4, 'Vérifier la réception des paiements par le prestataire lorsque nécessaire.',                   'high'),
    (5, 'Signaler les échéances à venir au pôle Finance & administratif.',                              'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m6 — Centraliser les documents (priorité Normale)
i6 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl6.id, v.lbl, 'todo', v.prio, false, v.n
  from cl6 cross join (values
    (0, 'Centraliser les devis acceptés.',                                                                         'normal'),
    (1, 'Centraliser les contrats et conditions générales.',                                                       'normal'),
    (2, 'Centraliser les factures et échéanciers utiles.',                                                         'normal'),
    (3, 'Centraliser les plans, fiches techniques et règlements des lieux.',                                       'normal'),
    (4, 'Centraliser les attestations ou documents obligatoires demandés.',                                        'normal'),
    (5, 'Vérifier que les documents importants sont accessibles aux responsables concernés.',                      'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m7 — Recenser les contraintes de chaque lieu
i7 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl7.id, v.lbl, 'todo', v.prio, false, v.n
  from cl7 cross join (values
    (0, 'Confirmer les horaires d''accès et de libération du lieu.',                           'high'),
    (1, 'Confirmer les capacités et espaces réellement accessibles.',                          'high'),
    (2, 'Identifier les règles concernant le mobilier et les installations.',                  'high'),
    (3, 'Identifier les restrictions concernant la décoration.',                               'high'),
    (4, 'Identifier les règles concernant la nourriture et les boissons extérieures.',        'high'),
    (5, 'Identifier les contraintes sonores ou horaires.',                                     'high'),
    (6, 'Identifier les règles de nettoyage et remise en état.',                              'high'),
    (7, 'Identifier les éventuelles cautions ou responsabilités particulières.',              'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m8 — Documenter les accès et circulations
i8 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl8.id, v.lbl, 'todo', v.prio, false, v.n
  from cl8 cross join (values
    (0, 'Identifier l''adresse et l''entrée à utiliser.',                                     'normal'),
    (1, 'Identifier les accès prestataires.',                                                 'normal'),
    (2, 'Identifier les zones de livraison et de déchargement.',                              'normal'),
    (3, 'Identifier les possibilités de stationnement.',                                      'normal'),
    (4, 'Identifier les accès pour les personnes à mobilité réduite lorsque nécessaire.',    'normal'),
    (5, 'Identifier les circulations à préserver pendant l''installation.',                  'normal'),
    (6, 'Conserver les plans ou indications utiles.',                                         'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m9 — Organiser une visite technique
i9 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl9.id, v.lbl, 'todo', v.prio, false, v.n
  from cl9 cross join (values
    (0, 'Identifier les lieux nécessitant une visite avant l''événement.',                   'normal'),
    (1, 'Inviter les prestataires concernés lorsque leur présence est utile.',               'normal'),
    (2, 'Vérifier les accès et dimensions importantes.',                                     'normal'),
    (3, 'Vérifier les emplacements des installations prévues.',                              'normal'),
    (4, 'Vérifier les prises électriques et contraintes techniques utiles.',                 'normal'),
    (5, 'Photographier ou documenter les zones importantes.',                                'normal'),
    (6, 'Consigner les décisions prises pendant la visite.',                                 'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m10 — Finaliser les conditions du Domaine Ostara
i10 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl10.id, v.lbl, 'todo', v.prio, false, v.n
  from cl10 cross join (values
    (0, 'Confirmer les horaires exacts d''accès le lundi 28 juin 2027.',                        'high'),
    (1, 'Confirmer l''heure à laquelle la salle doit être libérée.',                           'high'),
    (2, 'Confirmer les espaces compris dans la location.',                                      'high'),
    (3, 'Confirmer le mobilier fourni par le domaine.',                                         'high'),
    (4, 'Confirmer les quantités et caractéristiques des tables et chaises disponibles.',       'high'),
    (5, 'Confirmer les conditions d''utilisation des espaces extérieurs.',                     'high'),
    (6, 'Confirmer les règles concernant les prestataires extérieurs.',                        'high'),
    (7, 'Confirmer les règles de nettoyage, rangement et restitution du lieu.',               'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m11 — Planifier l'installation du Domaine Ostara
i11 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl11.id, v.lbl, 'todo', v.prio, false, v.n
  from cl11 cross join (values
    (0, 'Déterminer l''heure à laquelle la première équipe peut entrer sur le domaine.',                                            'high'),
    (1, 'Lister les installations devant impérativement être réalisées avant l''arrivée des invités.',                             'high'),
    (2, 'Estimer le temps nécessaire pour chaque installation importante.',                                                         'high'),
    (3, 'Identifier les installations pouvant être réalisées simultanément.',                                                       'high'),
    (4, 'Identifier les dépendances entre décoration, mobilier, nappage, vaisselle, traiteur et technique.',                       'high'),
    (5, 'Déterminer l''ordre d''intervention des prestataires.',                                                                   'high'),
    (6, 'Vérifier que le planning est réalisable dans la fenêtre d''accès disponible.',                                           'high'),
    (7, 'Prévoir une marge avant l''ouverture de la réception.',                                                                  'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m12 — Valider le plan d'utilisation du Domaine Ostara
i12 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl12.id, v.lbl, 'todo', v.prio, false, v.n
  from cl12 cross join (values
    (0, 'Valider l''emplacement des tables et principales zones de réception.',           'high'),
    (1, 'Valider la circulation des invités et du personnel.',                            'high'),
    (2, 'Valider l''emplacement du buffet.',                                              'high'),
    (3, 'Valider l''emplacement du glacier.',                                             'high'),
    (4, 'Valider les zones prévues pour les animations et le spectacle.',                 'high'),
    (5, 'Valider l''espace nécessaire à la première danse et à la soirée.',             'high'),
    (6, 'Valider les zones techniques et de stockage temporaire.',                        'high'),
    (7, 'Transmettre le plan final aux prestataires concernés.',                          'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m13 — Formaliser la fiche opérationnelle de chaque prestataire
i13 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl13.id, v.lbl, 'todo', v.prio, false, v.n
  from cl13 cross join (values
    (0, 'Identifier le contact principal du prestataire.',                                                      'normal'),
    (1, 'Préciser la prestation commandée.',                                                                    'normal'),
    (2, 'Préciser les séquences concernées.',                                                                   'normal'),
    (3, 'Préciser les horaires attendus.',                                                                      'normal'),
    (4, 'Préciser les besoins d''accès et d''installation.',                                                  'normal'),
    (5, 'Préciser ce que le prestataire fournit.',                                                             'normal'),
    (6, 'Préciser ce qui doit être fourni par les mariés ou un autre prestataire.',                           'normal'),
    (7, 'Préciser les conditions de fin de prestation et de retrait.',                                        'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m14 — Vérifier les interfaces entre prestataires
i14 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl14.id, v.lbl, 'todo', v.prio, false, v.n
  from cl14 cross join (values
    (0, 'Identifier les prestations dépendant d''un autre prestataire.',                         'high'),
    (1, 'Vérifier la compatibilité des horaires d''installation.',                               'high'),
    (2, 'Vérifier les responsabilités sur les fournitures partagées.',                           'high'),
    (3, 'Éviter les zones de responsabilité non couvertes.',                                     'high'),
    (4, 'Identifier les éventuels besoins techniques communs.',                                  'high'),
    (5, 'Faire confirmer les interfaces critiques aux prestataires concernés.',                  'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m15 — Confirmer les prestations avant le mariage
i15 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl15.id, v.lbl, 'todo', v.prio, false, v.n
  from cl15 cross join (values
    (0, 'Reconfirmer la date et les horaires.',                                                               'high'),
    (1, 'Reconfirmer le lieu et les accès.',                                                                  'high'),
    (2, 'Reconfirmer la prestation et les quantités finales.',                                                'high'),
    (3, 'Reconfirmer le contact opérationnel du jour.',                                                      'high'),
    (4, 'Reconfirmer les besoins restant à fournir.',                                                        'high'),
    (5, 'Signaler les modifications intervenues depuis la contractualisation.',                               'high'),
    (6, 'Obtenir une confirmation finale du prestataire.',                                                    'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m16 — Préparer l'arrivée des prestataires
i16 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl16.id, v.lbl, 'todo', v.prio, false, v.n
  from cl16 cross join (values
    (0, 'Établir la liste des prestataires attendus sur chaque lieu.',                        'normal'),
    (1, 'Définir leur heure d''arrivée.',                                                    'normal'),
    (2, 'Définir leur point d''accès.',                                                      'normal'),
    (3, 'Définir la zone de déchargement si nécessaire.',                                    'normal'),
    (4, 'Identifier la personne chargée de les accueillir.',                                 'normal'),
    (5, 'Préparer les consignes spécifiques du lieu.',                                       'normal'),
    (6, 'Éviter les arrivées simultanées incompatibles lorsque possible.',                   'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m17 — Accueillir les prestataires sur site
i17 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl17.id, v.lbl, 'todo', v.prio, false, v.n
  from cl17 cross join (values
    (0, 'Vérifier l''arrivée du prestataire.',                                                              'normal'),
    (1, 'Orienter le prestataire vers son emplacement.',                                                    'normal'),
    (2, 'Rappeler les contraintes utiles du lieu.',                                                         'normal'),
    (3, 'Mettre le prestataire en relation avec son référent.',                                             'normal'),
    (4, 'Vérifier qu''il dispose des éléments nécessaires à son installation.',                           'normal'),
    (5, 'Signaler rapidement toute difficulté empêchant l''installation.',                                 'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m18 — Contrôler la conformité des installations
i18 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl18.id, v.lbl, 'todo', v.prio, false, v.n
  from cl18 cross join (values
    (0, 'Vérifier que l''installation correspond à ce qui a été convenu.',                                             'high'),
    (1, 'Vérifier que les zones de circulation restent accessibles.',                                                  'high'),
    (2, 'Vérifier que les règles du lieu sont respectées.',                                                            'high'),
    (3, 'Vérifier que les éléments visibles sont correctement présentés.',                                             'high'),
    (4, 'Faire corriger les écarts importants avant l''arrivée des invités.',                                         'high'),
    (5, 'Signaler au coordinateur toute non-conformité ne pouvant être résolue immédiatement.',                       'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m19 — Recenser les ressources techniques disponibles
i19 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl19.id, v.lbl, 'todo', v.prio, false, v.n
  from cl19 cross join (values
    (0, 'Identifier les prises et alimentations électriques utiles.',                                      'normal'),
    (1, 'Identifier les équipements sonores disponibles.',                                                  'normal'),
    (2, 'Identifier les équipements d''éclairage disponibles.',                                           'normal'),
    (3, 'Identifier les connexions ou accès internet nécessaires lorsqu''ils sont utiles.',               'normal'),
    (4, 'Identifier le mobilier technique disponible.',                                                    'normal'),
    (5, 'Identifier les équipements de cuisine ou d''office accessibles aux prestataires.',               'normal'),
    (6, 'Identifier les besoins techniques restant à couvrir.',                                            'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m20 — Valider les besoins techniques des prestations
i20 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl20.id, v.lbl, 'todo', v.prio, false, v.n
  from cl20 cross join (values
    (0, 'Recueillir les besoins techniques de chaque prestataire concerné.',                        'high'),
    (1, 'Comparer les besoins aux ressources disponibles sur le lieu.',                             'high'),
    (2, 'Identifier les incompatibilités ou besoins complémentaires.',                              'high'),
    (3, 'Attribuer clairement la responsabilité de fournir chaque équipement manquant.',           'high'),
    (4, 'Vérifier les besoins spécifiques du spectacle et de la première danse.',                  'high'),
    (5, 'Prévoir les tests nécessaires avant utilisation.',                                         'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m21 — Préparer les modalités de fin de prestation
i21 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl21.id, v.lbl, 'todo', v.prio, false, v.n
  from cl21 cross join (values
    (0, 'Confirmer l''heure de fin prévue de chaque prestation.',                                  'normal'),
    (1, 'Identifier les prestataires devant récupérer du matériel.',                               'normal'),
    (2, 'Confirmer les modalités de démontage et de retrait.',                                     'normal'),
    (3, 'Identifier ce qui peut rester temporairement sur place.',                                 'normal'),
    (4, 'Vérifier les contraintes horaires du lieu.',                                              'normal'),
    (5, 'Définir les responsabilités en matière de nettoyage et de remise en état.',              'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m22 — Contrôler la fin d'intervention des prestataires
i22 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl22.id, v.lbl, 'todo', v.prio, false, v.n
  from cl22 cross join (values
    (0, 'Vérifier que les prestations nécessitant une clôture sont terminées.',           'normal'),
    (1, 'Vérifier que le matériel devant repartir est identifié.',                        'normal'),
    (2, 'Signaler les dégradations ou incidents constatés.',                               'normal'),
    (3, 'Vérifier que les zones utilisées sont laissées dans l''état attendu.',           'normal'),
    (4, 'Confirmer les retraits différés restant à effectuer.',                            'normal'),
    (5, 'Transmettre les éventuelles réserves au responsable concerné.',                  'normal')
  ) as v(n, lbl, prio)
  returning id
),
-- m23 — Restituer les lieux
i23 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl23.id, v.lbl, 'todo', v.prio, false, v.n
  from cl23 cross join (values
    (0, 'Effectuer un contrôle des espaces utilisés.',                                                      'high'),
    (1, 'Vérifier que les effets personnels et matériels du mariage ont été récupérés.',                   'high'),
    (2, 'Vérifier que les déchets et éléments à évacuer sont pris en charge.',                            'high'),
    (3, 'Vérifier les exigences de nettoyage prévues.',                                                    'high'),
    (4, 'Effectuer l''état des lieux de sortie lorsque nécessaire.',                                      'high'),
    (5, 'Restituer les clés, badges ou moyens d''accès.',                                                 'high'),
    (6, 'Documenter les éventuelles réserves ou dégradations.',                                            'high')
  ) as v(n, lbl, prio)
  returning id
),
-- m24 — Clôturer administrativement les prestations
i24 as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, priority, is_done, sort_order)
  select gen_random_uuid(), cl24.id, v.lbl, 'todo', v.prio, false, v.n
  from cl24 cross join (values
    (0, 'Vérifier que la prestation facturée correspond à la prestation réalisée.',                          'normal'),
    (1, 'Identifier les soldes restant à régler.',                                                           'normal'),
    (2, 'Transmettre les éléments de paiement au pôle Finance & administratif.',                            'normal'),
    (3, 'Traiter les éventuelles cautions à récupérer.',                                                    'normal'),
    (4, 'Traiter les réclamations ou ajustements nécessaires.',                                              'normal'),
    (5, 'Archiver les documents finaux et preuves utiles.',                                                  'normal')
  ) as v(n, lbl, prio)
  returning id
),

-- ──────────────────────────── Liens mission ↔ séquences ────────────────────────────
-- Toutes les 7 séquences
sq_all_7 as materialized (
  select id, name from _20270628_event_sequences
  where name in ('Mariage civil','Goûter d''honneur','Moment convivial entre amis','Pique-nique partagé','Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
),

-- m1-m8 : toutes les 7
sq_m1  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m1.id,  sq_all_7.id from m1,  sq_all_7 returning mission_id),
sq_m2  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m2.id,  sq_all_7.id from m2,  sq_all_7 returning mission_id),
sq_m3  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m3.id,  sq_all_7.id from m3,  sq_all_7 returning mission_id),
sq_m4  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m4.id,  sq_all_7.id from m4,  sq_all_7 returning mission_id),
sq_m5  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m5.id,  sq_all_7.id from m5,  sq_all_7 returning mission_id),
sq_m6  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m6.id,  sq_all_7.id from m6,  sq_all_7 returning mission_id),
sq_m7  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m7.id,  sq_all_7.id from m7,  sq_all_7 returning mission_id),
sq_m8  as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m8.id,  sq_all_7.id from m8,  sq_all_7 returning mission_id),
-- m13-m16, m21, m24 : toutes les 7
sq_m13 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m13.id, sq_all_7.id from m13, sq_all_7 returning mission_id),
sq_m14 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m14.id, sq_all_7.id from m14, sq_all_7 returning mission_id),
sq_m15 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m15.id, sq_all_7.id from m15, sq_all_7 returning mission_id),
sq_m16 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m16.id, sq_all_7.id from m16, sq_all_7 returning mission_id),
sq_m21 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m21.id, sq_all_7.id from m21, sq_all_7 returning mission_id),
sq_m24 as materialized (insert into _20270628_mission_sequences (mission_id, sequence_id) select m24.id, sq_all_7.id from m24, sq_all_7 returning mission_id),

-- m9, m17, m18, m22, m23 — Goûter d'honneur | Moment convivial entre amis | Célébration de mariage
sq_m9 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m9.id, s.id from m9, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Célébration de mariage')
  returning mission_id
),
sq_m17 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m17.id, s.id from m17, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Célébration de mariage')
  returning mission_id
),
sq_m18 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m18.id, s.id from m18, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Célébration de mariage')
  returning mission_id
),
sq_m22 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m22.id, s.id from m22, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Célébration de mariage')
  returning mission_id
),
sq_m23 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m23.id, s.id from m23, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Célébration de mariage')
  returning mission_id
),

-- m10, m11, m12 — Célébration de mariage uniquement
sq_m10 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m10.id, s.id from m10, _20270628_event_sequences s where s.name = 'Célébration de mariage'
  returning mission_id
),
sq_m11 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m11.id, s.id from m11, _20270628_event_sequences s where s.name = 'Célébration de mariage'
  returning mission_id
),
sq_m12 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m12.id, s.id from m12, _20270628_event_sequences s where s.name = 'Célébration de mariage'
  returning mission_id
),

-- m19 — Goûter d'honneur | Moment convivial | Bénédiction au khane | Bénédiction à l'église | Célébration de mariage
sq_m19 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m19.id, s.id from m19, _20270628_event_sequences s
  where s.name in ('Goûter d''honneur','Moment convivial entre amis','Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
  returning mission_id
),

-- m20 — Moment convivial | Bénédiction au khane | Bénédiction à l'église | Célébration de mariage
sq_m20 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m20.id, s.id from m20, _20270628_event_sequences s
  where s.name in ('Moment convivial entre amis','Bénédiction au khane','Bénédiction à l''église','Célébration de mariage')
  returning mission_id
)

-- ──────────────────────────── Vérification ────────────────────────────
select
  (select count(*) from _20270628_domaines d join _20270628_poles p on p.id = d.pole_id where p.name = 'Lieu & prestataires') as domaines,
  (select count(*) from _20270628_missions m join _20270628_domaines d on d.id = m.domaine_id join _20270628_poles p on p.id = d.pole_id where p.name = 'Lieu & prestataires') as missions,
  (select count(*) from sq_m1) + (select count(*) from sq_m10) + (select count(*) from sq_m19) + (select count(*) from sq_m20) as seq_liens_spot;
