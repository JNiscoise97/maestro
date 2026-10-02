-- seed_finance_administratif_mariage.sql
-- Pôle "Finance & administratif" – script de seed complet (sort_order = 80)

delete from _20270628_poles where name = 'Finance & administratif';

with
-- ─── PÔLE ────────────────────────────────────────────────────────────────────
p as materialized (
  insert into _20270628_poles (id, name, sort_order)
  values (gen_random_uuid(), 'Finance & administratif', 80)
  returning id
),

-- ─── DOMAINES ────────────────────────────────────────────────────────────────
d_budget as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Budget global', 'budget-global', 'avant'
  from p returning id
),
d_devis as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Devis & arbitrages', 'devis-arbitrages', 'avant'
  from p returning id
),
d_contrats as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Contrats & engagements', 'contrats-engagements', 'avant'
  from p returning id
),
d_echeancier as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Échéancier', 'echeancier', 'avant'
  from p returning id
),
d_tresorerie as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Trésorerie', 'tresorerie', 'avant'
  from p returning id
),
d_factures as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Factures & justificatifs', 'factures-justificatifs', null
  from p returning id
),
d_cautions as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Cautions & dépôts', 'cautions-depots', null
  from p returning id
),
d_admin_civil as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Administratif civil', 'administratif-civil', 'avant'
  from p returning id
),
d_admin_reli as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Administratif religieux', 'administratif-religieux', 'avant'
  from p returning id
),
d_assurances as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Assurances & responsabilités', 'assurances-responsabilites', 'avant'
  from p returning id
),
d_achats as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Achats & remboursements', 'achats-remboursements', 'avant'
  from p returning id
),
d_budget_ostara as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Budget réception Ostara', 'budget-reception-ostara', 'avant'
  from p returning id
),
d_ctrl_avant as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Contrôle avant mariage', 'controle-avant-mariage', 'avant'
  from p returning id
),
d_ctrl_pendant as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Contrôle pendant mariage', 'controle-pendant-mariage', 'jour_j'
  from p returning id
),
d_cloture as materialized (
  insert into _20270628_domaines (id, pole_id, name, slug, phase)
  select gen_random_uuid(), p.id,
    'Clôture financière', 'cloture-financiere', 'apres'
  from p returning id
),

-- ─── MISSIONS ────────────────────────────────────────────────────────────────
m1 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_budget.id,
    'Construire le budget global du mariage'
  from d_budget returning id
),
m2 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_budget.id,
    'Ventiler le budget par journée et séquence'
  from d_budget returning id
),
m3 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_budget.id,
    'Suivre le budget prévisionnel et le réalisé'
  from d_budget returning id
),
m4 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_devis.id,
    'Centraliser les devis'
  from d_devis returning id
),
m5 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_devis.id,
    'Comparer financièrement les propositions'
  from d_devis returning id
),
m6 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_contrats.id,
    'Centraliser les contrats et confirmations de réservation'
  from d_contrats returning id
),
m7 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_contrats.id,
    'Contrôler les clauses financières des contrats'
  from d_contrats returning id
),
m8 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_echeancier.id,
    'Construire l''échéancier général des paiements'
  from d_echeancier returning id
),
m9 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_echeancier.id,
    'Suivre les paiements effectués'
  from d_echeancier returning id
),
m10 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_tresorerie.id,
    'Construire le plan de trésorerie jusqu''au mariage'
  from d_tresorerie returning id
),
m11 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_tresorerie.id,
    'Préparer la trésorerie des quatre jours'
  from d_tresorerie returning id
),
m12 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_factures.id,
    'Centraliser les factures et justificatifs'
  from d_factures returning id
),
m13 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_factures.id,
    'Finaliser le dossier financier du mariage'
  from d_factures returning id
),
m14 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_cautions.id,
    'Recenser les cautions et dépôts de garantie'
  from d_cautions returning id
),
m15 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_cautions.id,
    'Suivre la restitution des cautions'
  from d_cautions returning id
),
m16 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_admin_civil.id,
    'Suivre les formalités du mariage civil'
  from d_admin_civil returning id
),
m17 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_admin_civil.id,
    'Préparer les documents nécessaires le jour du mariage civil'
  from d_admin_civil returning id
),
m18 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_admin_reli.id,
    'Suivre les formalités de la bénédiction à l''église'
  from d_admin_reli returning id
),
m19 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_admin_reli.id,
    'Suivre les formalités liées à la bénédiction au khane'
  from d_admin_reli returning id
),
m20 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_assurances.id,
    'Vérifier les besoins d''assurance du mariage'
  from d_assurances returning id
),
m21 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_assurances.id,
    'Vérifier les responsabilités financières en cas de dommage'
  from d_assurances returning id
),
m22 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_achats.id,
    'Organiser les achats effectués pour le mariage'
  from d_achats returning id
),
m23 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_achats.id,
    'Gérer les remboursements entre personnes'
  from d_achats returning id
),
m24 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_budget_ostara.id,
    'Suivre le budget spécifique de la grande réception'
  from d_budget_ostara returning id
),
m25 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_budget_ostara.id,
    'Suivre le coût par invité de la réception'
  from d_budget_ostara returning id
),
m26 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_ctrl_avant.id,
    'Effectuer la revue financière finale avant les quatre jours'
  from d_ctrl_avant returning id
),
m27 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_ctrl_pendant.id,
    'Gérer les paiements et incidents financiers pendant les événements'
  from d_ctrl_pendant returning id
),
m28 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_cloture.id,
    'Établir le bilan financier final du mariage'
  from d_cloture returning id
),
m29 as materialized (
  insert into _20270628_missions (id, domaine_id, title)
  select gen_random_uuid(), d_cloture.id,
    'Archiver les documents administratifs et financiers'
  from d_cloture returning id
),

-- ─── CHECKLISTS ──────────────────────────────────────────────────────────────
cl1 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m1.id,
    'Construire le budget global du mariage'
  from m1 returning id
),
cl2 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m2.id,
    'Ventiler le budget par journée et séquence'
  from m2 returning id
),
cl3 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m3.id,
    'Suivre le budget prévisionnel et le réalisé'
  from m3 returning id
),
cl4 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m4.id,
    'Centraliser les devis'
  from m4 returning id
),
cl5 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m5.id,
    'Comparer financièrement les propositions'
  from m5 returning id
),
cl6 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m6.id,
    'Centraliser les contrats et confirmations de réservation'
  from m6 returning id
),
cl7 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m7.id,
    'Contrôler les clauses financières des contrats'
  from m7 returning id
),
cl8 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m8.id,
    'Construire l''échéancier général des paiements'
  from m8 returning id
),
cl9 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m9.id,
    'Suivre les paiements effectués'
  from m9 returning id
),
cl10 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m10.id,
    'Construire le plan de trésorerie jusqu''au mariage'
  from m10 returning id
),
cl11 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m11.id,
    'Préparer la trésorerie des quatre jours'
  from m11 returning id
),
cl12 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m12.id,
    'Centraliser les factures et justificatifs'
  from m12 returning id
),
cl13 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m13.id,
    'Finaliser le dossier financier du mariage'
  from m13 returning id
),
cl14 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m14.id,
    'Recenser les cautions et dépôts de garantie'
  from m14 returning id
),
cl15 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m15.id,
    'Suivre la restitution des cautions'
  from m15 returning id
),
cl16 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m16.id,
    'Suivre les formalités du mariage civil'
  from m16 returning id
),
cl17 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m17.id,
    'Préparer les documents nécessaires le jour du mariage civil'
  from m17 returning id
),
cl18 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m18.id,
    'Suivre les formalités de la bénédiction à l''église'
  from m18 returning id
),
cl19 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m19.id,
    'Suivre les formalités liées à la bénédiction au khane'
  from m19 returning id
),
cl20 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m20.id,
    'Vérifier les besoins d''assurance du mariage'
  from m20 returning id
),
cl21 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m21.id,
    'Vérifier les responsabilités financières en cas de dommage'
  from m21 returning id
),
cl22 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m22.id,
    'Organiser les achats effectués pour le mariage'
  from m22 returning id
),
cl23 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m23.id,
    'Gérer les remboursements entre personnes'
  from m23 returning id
),
cl24 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m24.id,
    'Suivre le budget spécifique de la grande réception'
  from m24 returning id
),
cl25 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m25.id,
    'Suivre le coût par invité de la réception'
  from m25 returning id
),
cl26 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m26.id,
    'Effectuer la revue financière finale avant les quatre jours'
  from m26 returning id
),
cl27 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m27.id,
    'Gérer les paiements et incidents financiers pendant les événements'
  from m27 returning id
),
cl28 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m28.id,
    'Établir le bilan financier final du mariage'
  from m28 returning id
),
cl29 as materialized (
  insert into _20270628_checklists (id, owner_type, owner_id, title)
  select gen_random_uuid(), 'mission', m29.id,
    'Archiver les documents administratifs et financiers'
  from m29 returning id
),

-- ─── CHECKLIST ITEMS ─────────────────────────────────────────────────────────
_cl1_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl1.id, v.label, 'todo', false
  from cl1 cross join (values
    ('Lister tous les postes de dépenses connus.'),
    ('Regrouper les dépenses par pôle et par grande catégorie.'),
    ('Définir un budget cible pour chaque poste.'),
    ('Identifier les postes déjà contractualisés.'),
    ('Identifier les postes encore estimatifs.'),
    ('Calculer le budget total prévisionnel.'),
    ('Prévoir une réserve pour les imprévus.'),
    ('Distinguer les dépenses indispensables des options.')
  ) as v(label) returning id
),
_cl2_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl2.id, v.label, 'todo', false
  from cl2 cross join (values
    ('Identifier les dépenses propres au vendredi 25 juin.'),
    ('Identifier les dépenses propres au samedi 26 juin.'),
    ('Identifier les dépenses propres au dimanche 27 juin.'),
    ('Identifier les dépenses propres au lundi 28 juin.'),
    ('Identifier les dépenses transversales aux quatre jours.'),
    ('Associer les principales dépenses aux séquences concernées.'),
    ('Vérifier qu''aucune dépense multi-jours n''est comptée plusieurs fois.')
  ) as v(label) returning id
),
_cl3_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl3.id, v.label, 'todo', false
  from cl3 cross join (values
    ('Enregistrer chaque nouvelle dépense engagée.'),
    ('Mettre à jour le montant prévisionnel après chaque devis retenu.'),
    ('Enregistrer les montants réellement payés.'),
    ('Calculer les écarts entre budget et dépenses réelles.'),
    ('Identifier les dépassements significatifs.'),
    ('Identifier les économies réalisées.'),
    ('Réallouer les marges uniquement après validation.'),
    ('Mettre à jour régulièrement le reste à engager.')
  ) as v(label) returning id
),
_cl4_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl4.id, v.label, 'todo', false
  from cl4 cross join (values
    ('Recenser tous les devis reçus.'),
    ('Associer chaque devis au bon prestataire et au bon poste.'),
    ('Enregistrer le montant TTC.'),
    ('Enregistrer la durée de validité du devis.'),
    ('Identifier les options incluses et optionnelles.'),
    ('Identifier les frais supplémentaires potentiels.'),
    ('Conserver une copie de chaque version reçue.'),
    ('Archiver les devis refusés sans les confondre avec les devis retenus.')
  ) as v(label) returning id
),
_cl5_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl5.id, v.label, 'todo', false
  from cl5 cross join (values
    ('Comparer les prestations à périmètre équivalent.'),
    ('Identifier les éléments inclus dans chaque prix.'),
    ('Identifier les frais de déplacement.'),
    ('Identifier les frais de livraison ou retrait.'),
    ('Identifier les heures supplémentaires éventuelles.'),
    ('Identifier les coûts liés au personnel.'),
    ('Identifier les options susceptibles de devenir nécessaires.'),
    ('Documenter l''arbitrage financier final.')
  ) as v(label) returning id
),
_cl6_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl6.id, v.label, 'todo', false
  from cl6 cross join (values
    ('Lister les prestations nécessitant un contrat.'),
    ('Vérifier qu''un document confirme chaque réservation importante.'),
    ('Conserver la version signée de chaque contrat.'),
    ('Associer le contrat au devis correspondant.'),
    ('Enregistrer la date de signature.'),
    ('Enregistrer les coordonnées contractuelles du prestataire.'),
    ('Identifier les engagements particuliers pris par Sarah et Jordan.')
  ) as v(label) returning id
),
_cl7_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl7.id, v.label, 'todo', false
  from cl7 cross join (values
    ('Vérifier le montant total contractuel.'),
    ('Vérifier le montant et la date de l''acompte.'),
    ('Vérifier les échéances intermédiaires.'),
    ('Vérifier la date limite de paiement du solde.'),
    ('Vérifier les conditions d''annulation.'),
    ('Vérifier les conditions de report.'),
    ('Vérifier les frais liés aux dépassements horaires.'),
    ('Vérifier les conditions de remboursement.'),
    ('Vérifier les conditions liées aux cautions.')
  ) as v(label) returning id
),
_cl8_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl8.id, v.label, 'todo', false
  from cl8 cross join (values
    ('Lister tous les acomptes restant à payer.'),
    ('Lister tous les paiements intermédiaires.'),
    ('Lister tous les soldes.'),
    ('Associer une date d''échéance à chaque paiement.'),
    ('Associer le moyen de paiement prévu.'),
    ('Identifier les paiements exigés avant juin 2027.'),
    ('Identifier les paiements exigés pendant les quatre jours.'),
    ('Identifier les paiements pouvant intervenir après le mariage.'),
    ('Créer des marges avant les échéances critiques.')
  ) as v(label) returning id
),
_cl9_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl9.id, v.label, 'todo', false
  from cl9 cross join (values
    ('Enregistrer la date de chaque paiement.'),
    ('Enregistrer le montant effectivement payé.'),
    ('Conserver le justificatif de paiement.'),
    ('Vérifier la réception du paiement par le prestataire lorsque nécessaire.'),
    ('Mettre à jour le solde restant dû.'),
    ('Identifier immédiatement les écarts avec le contrat.'),
    ('Éviter les doubles paiements.')
  ) as v(label) returning id
),
_cl10_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl10.id, v.label, 'todo', false
  from cl10 cross join (values
    ('Lister les ressources disponibles pour financer le mariage.'),
    ('Lister les dépenses déjà payées.'),
    ('Projeter les sorties d''argent mois par mois jusqu''en juin 2027.'),
    ('Identifier les mois comportant les plus grosses échéances.'),
    ('Calculer le besoin de trésorerie avant chaque échéance importante.'),
    ('Intégrer la réserve pour imprévus.'),
    ('Mettre à jour la projection après chaque nouvel engagement.'),
    ('Vérifier que les dépenses prévues restent finançables à leur date réelle.')
  ) as v(label) returning id
),
_cl11_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl11.id, v.label, 'todo', false
  from cl11 cross join (values
    ('Lister les paiements devant être réalisés entre le 25 et le 28 juin.'),
    ('Identifier les prestataires devant recevoir un solde sur place.'),
    ('Définir le moyen de paiement prévu pour chacun.'),
    ('Préparer les éventuelles enveloppes uniquement lorsque nécessaires.'),
    ('Étiqueter clairement les paiements préparés.'),
    ('Désigner la personne autorisée à effectuer les paiements en l''absence des mariés.'),
    ('Prévoir une solution de paiement de secours.'),
    ('Éviter de conserver des sommes importantes sans nécessité.')
  ) as v(label) returning id
),
_cl12_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl12.id, v.label, 'todo', false
  from cl12 cross join (values
    ('Demander une facture lorsque nécessaire.'),
    ('Associer chaque facture au paiement correspondant.'),
    ('Conserver les factures d''acompte.'),
    ('Conserver les factures de solde.'),
    ('Conserver les justificatifs des achats importants.'),
    ('Classer les documents de façon homogène.'),
    ('Identifier les factures encore manquantes.')
  ) as v(label) returning id
),
_cl13_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl13.id, v.label, 'todo', false
  from cl13 cross join (values
    ('Récupérer les dernières factures.'),
    ('Vérifier que chaque paiement important dispose d''un justificatif.'),
    ('Classer les contrats, devis et factures définitifs.'),
    ('Identifier les dépenses sans justificatif.'),
    ('Archiver les preuves de paiement.'),
    ('Conserver le dossier financier complet.')
  ) as v(label) returning id
),
_cl14_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl14.id, v.label, 'todo', false
  from cl14 cross join (values
    ('Lister toutes les cautions demandées.'),
    ('Identifier leur montant.'),
    ('Identifier leur mode de versement ou d''autorisation.'),
    ('Identifier les conditions de retenue.'),
    ('Identifier la date prévue de restitution.'),
    ('Associer chaque caution au contrat correspondant.'),
    ('Prévoir la trésorerie nécessaire sans la confondre avec une dépense définitive.')
  ) as v(label) returning id
),
_cl15_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl15.id, v.label, 'todo', false
  from cl15 cross join (values
    ('Vérifier l''état des lieux ou contrôle de restitution lorsque prévu.'),
    ('Confirmer la restitution du matériel concerné.'),
    ('Noter la date de remboursement attendue.'),
    ('Vérifier le remboursement effectif.'),
    ('Demander le détail de toute retenue.'),
    ('Clôturer la caution uniquement après remboursement ou justification.')
  ) as v(label) returning id
),
_cl16_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl16.id, v.label, 'todo', false
  from cl16 cross join (values
    ('Lister les documents demandés par la mairie.'),
    ('Vérifier les dates de validité des documents.'),
    ('Vérifier les informations d''état civil de Sarah et Jordan.'),
    ('Vérifier les informations relatives aux témoins.'),
    ('Respecter les délais de dépôt du dossier.'),
    ('Conserver une copie des documents transmis.'),
    ('Noter les rendez-vous ou validations administratives.'),
    ('Vérifier que le dossier est considéré complet par la mairie.')
  ) as v(label) returning id
),
_cl17_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl17.id, v.label, 'todo', false
  from cl17 cross join (values
    ('Identifier les pièces devant être apportées physiquement.'),
    ('Vérifier les pièces d''identité nécessaires.'),
    ('Informer les témoins des documents qu''ils doivent avoir avec eux.'),
    ('Préparer une pochette dédiée.'),
    ('Désigner la personne responsable de la pochette.'),
    ('Effectuer un contrôle final avant le départ pour la mairie.')
  ) as v(label) returning id
),
_cl18_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl18.id, v.label, 'todo', false
  from cl18 cross join (values
    ('Lister les documents demandés par la paroisse.'),
    ('Suivre les rendez-vous de préparation.'),
    ('Conserver les documents transmis ou reçus.'),
    ('Identifier les éventuels frais ou dons liés à la célébration.'),
    ('Noter les dates limites communiquées.'),
    ('Vérifier que toutes les formalités sont terminées avant juin 2027.')
  ) as v(label) returning id
),
_cl19_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl19.id, v.label, 'todo', false
  from cl19 cross join (values
    ('Identifier les démarches demandées pour la bénédiction.'),
    ('Identifier les personnes de contact.'),
    ('Lister les informations ou documents à transmettre.'),
    ('Noter les éventuelles échéances.'),
    ('Identifier les éventuels frais ou contributions.'),
    ('Confirmer que les formalités nécessaires sont terminées.')
  ) as v(label) returning id
),
_cl20_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl20.id, v.label, 'todo', false
  from cl20 cross join (values
    ('Identifier les assurances éventuellement exigées par les lieux.'),
    ('Vérifier les garanties de responsabilité civile utiles.'),
    ('Vérifier les assurances incluses dans les contrats de prestataires lorsque pertinent.'),
    ('Identifier les risques nécessitant une couverture particulière.'),
    ('Conserver les attestations nécessaires.'),
    ('Transmettre les attestations aux lieux si elles sont demandées.')
  ) as v(label) returning id
),
_cl21_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl21.id, v.label, 'todo', false
  from cl21 cross join (values
    ('Identifier les responsabilités prévues par les contrats de location.'),
    ('Identifier les responsabilités concernant le mobilier et le matériel.'),
    ('Identifier les règles relatives aux dommages causés dans les lieux.'),
    ('Informer les responsables opérationnels des points sensibles.'),
    ('Prévoir la procédure de signalement d''un dommage.'),
    ('Conserver des preuves de l''état des biens lorsque cela est pertinent.')
  ) as v(label) returning id
),
_cl22_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl22.id, v.label, 'todo', false
  from cl22 cross join (values
    ('Définir qui est autorisé à engager des dépenses.'),
    ('Définir les dépenses nécessitant une validation préalable.'),
    ('Conserver les tickets et factures.'),
    ('Associer chaque achat au bon poste budgétaire.'),
    ('Éviter les achats en doublon entre responsables.'),
    ('Enregistrer rapidement les dépenses réalisées.'),
    ('Suivre les commandes non encore reçues.')
  ) as v(label) returning id
),
_cl23_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl23.id, v.label, 'todo', false
  from cl23 cross join (values
    ('Identifier les achats avancés par un proche.'),
    ('Conserver le justificatif correspondant.'),
    ('Valider le montant à rembourser.'),
    ('Enregistrer le remboursement effectué.'),
    ('Éviter de mélanger remboursement personnel et paiement prestataire.'),
    ('Clôturer régulièrement les avances plutôt que d''attendre après le mariage.')
  ) as v(label) returning id
),
_cl24_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl24.id, v.label, 'todo', false
  from cl24 cross join (values
    ('Suivre le coût du Domaine Ostara.'),
    ('Suivre le coût de la restauration.'),
    ('Suivre le coût des boissons.'),
    ('Suivre le coût de la décoration.'),
    ('Suivre le coût du nappage et de la vaisselle.'),
    ('Suivre le coût du glacier.'),
    ('Suivre le coût des animations et du spectacle.'),
    ('Suivre le coût photo et vidéo imputable au lundi.'),
    ('Suivre les coûts techniques et logistiques.'),
    ('Comparer régulièrement le total de la réception à l''enveloppe prévue.')
  ) as v(label) returning id
),
_cl25_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl25.id, v.label, 'todo', false
  from cl25 cross join (values
    ('Définir l''effectif de référence utilisé pour les calculs.'),
    ('Calculer le coût restauration par personne.'),
    ('Identifier les coûts variables dépendant réellement du nombre d''invités.'),
    ('Identifier les coûts fixes indépendants de l''effectif.'),
    ('Mettre à jour les estimations après évolution du nombre d''invités.'),
    ('Vérifier les seuils de facturation des prestataires.'),
    ('Anticiper l''effet financier des confirmations finales.')
  ) as v(label) returning id
),
_cl26_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl26.id, v.label, 'todo', false
  from cl26 cross join (values
    ('Vérifier les soldes restant dus.'),
    ('Vérifier les dates et moyens de paiement.'),
    ('Vérifier les cautions à prévoir.'),
    ('Vérifier les paiements déjà effectués.'),
    ('Vérifier les coordonnées des prestataires à payer.'),
    ('Préparer les justificatifs utiles.'),
    ('Identifier les éventuels litiges ou montants non validés.'),
    ('Éviter de laisser une question financière non clarifiée pour le jour même.')
  ) as v(label) returning id
),
_cl27_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl27.id, v.label, 'todo', false
  from cl27 cross join (values
    ('Effectuer uniquement les paiements prévus et validés.'),
    ('Conserver une preuve de chaque paiement réalisé.'),
    ('Noter toute dépense imprévue.'),
    ('Faire valider les suppléments importants avant engagement.'),
    ('Documenter les heures supplémentaires facturables si elles surviennent.'),
    ('Ne pas régler un montant contesté sans vérification.'),
    ('Centraliser les justificatifs immédiatement après chaque paiement.')
  ) as v(label) returning id
),
_cl28_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl28.id, v.label, 'todo', false
  from cl28 cross join (values
    ('Enregistrer toutes les dépenses définitives.'),
    ('Intégrer les remboursements et restitutions de cautions.'),
    ('Calculer le coût total réel du mariage.'),
    ('Calculer le coût réel par grande catégorie.'),
    ('Comparer le total réel au budget initial.'),
    ('Identifier les principaux écarts.'),
    ('Vérifier qu''aucun solde prestataire ne reste dû.'),
    ('Vérifier qu''aucun remboursement attendu n''est oublié.'),
    ('Clôturer le suivi budgétaire.')
  ) as v(label) returning id
),
_cl29_items as materialized (
  insert into _20270628_checklist_items (id, checklist_id, label, status, is_done)
  select gen_random_uuid(), cl29.id, v.label, 'todo', false
  from cl29 cross join (values
    ('Archiver les contrats définitifs.'),
    ('Archiver les factures.'),
    ('Archiver les justificatifs de paiement.'),
    ('Archiver les attestations et documents administratifs utiles.'),
    ('Archiver le bilan budgétaire final.'),
    ('Conserver les coordonnées des prestataires.'),
    ('Supprimer uniquement les doublons inutiles après vérification des sauvegardes.')
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
-- m2 → all 7
_ms2 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m2.id, sq_all_7.id from m2 cross join sq_all_7
  returning mission_id
),
-- m11 → all 7
_ms11 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m11.id, sq_all_7.id from m11 cross join sq_all_7
  returning mission_id
),
-- m16 → Mariage civil
_ms16 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m16.id, s.id
  from m16
  cross join (select id from _20270628_event_sequences where name = 'Mariage civil') s
  returning mission_id
),
-- m17 → Mariage civil
_ms17 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m17.id, s.id
  from m17
  cross join (select id from _20270628_event_sequences where name = 'Mariage civil') s
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
-- m19 → Bénédiction au khane
_ms19 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m19.id, s.id
  from m19
  cross join (select id from _20270628_event_sequences where name = 'Bénédiction au khane') s
  returning mission_id
),
-- m24 → Célébration de mariage
_ms24 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m24.id, sq_celebr.id from m24 cross join sq_celebr
  returning mission_id
),
-- m25 → Célébration de mariage
_ms25 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m25.id, sq_celebr.id from m25 cross join sq_celebr
  returning mission_id
),
-- m26 → all 7
_ms26 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m26.id, sq_all_7.id from m26 cross join sq_all_7
  returning mission_id
),
-- m27 → all 7
_ms27 as materialized (
  insert into _20270628_mission_sequences (mission_id, sequence_id)
  select m27.id, sq_all_7.id from m27 cross join sq_all_7
  returning mission_id
)
-- m1,m3,m4,m5,m6,m7,m8,m9,m10,m12,m13,m14,m15,m20,m21,m22,m23,m28,m29 → aucune séquence

select
  (select count(*) from p)                       as poles,
  (select count(*) from d_budget)
  + (select count(*) from d_devis)
  + (select count(*) from d_contrats)
  + (select count(*) from d_echeancier)
  + (select count(*) from d_tresorerie)
  + (select count(*) from d_factures)
  + (select count(*) from d_cautions)
  + (select count(*) from d_admin_civil)
  + (select count(*) from d_admin_reli)
  + (select count(*) from d_assurances)
  + (select count(*) from d_achats)
  + (select count(*) from d_budget_ostara)
  + (select count(*) from d_ctrl_avant)
  + (select count(*) from d_ctrl_pendant)
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
  + (select count(*) from m28)
  + (select count(*) from m29)                   as missions,
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
  + (select count(*) from _cl29_items)           as checklist_items,
  (select count(*) from _ms2)
  + (select count(*) from _ms11)
  + (select count(*) from _ms16)
  + (select count(*) from _ms17)
  + (select count(*) from _ms18)
  + (select count(*) from _ms19)
  + (select count(*) from _ms24)
  + (select count(*) from _ms25)
  + (select count(*) from _ms26)
  + (select count(*) from _ms27)                 as mission_sequences;
