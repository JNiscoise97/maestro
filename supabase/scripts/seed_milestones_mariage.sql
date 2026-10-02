-- seed_milestones_mariage.sql
-- Insère les 12 jalons maîtres du mariage S&J (25–28 juin 2027).
-- Idempotent : ne crée pas de doublon si le nom existe déjà.

insert into public._20270628_milestones (name, description, target_date, sort_order)
select name, description, target_date::date, sort_order
from (values
  (1,  'Architecture du mariage sécurisée',
       'Les 4 jours ont leur format, les lieux structurants sont sécurisés ou en voie finale, les cérémonies sont cadrées, les principaux besoins et prestataires sont identifiés.',
       '2026-10-31'),
  (2,  'Prestataires critiques sécurisés',
       'Les prestataires à faible disponibilité sont choisis et réservés : traiteur, image, décoration, animation, transports importants.',
       '2026-11-30'),
  (3,  'Budget et organisation générale stabilisés',
       'Budget consolidé, arbitrages majeurs faits, responsabilités principales réparties, organisation des quatre jours suffisamment stable pour arrêter les gros choix.',
       '2026-12-31'),
  (4,  'Identité et expérience du mariage définies',
       'Direction artistique, ambiance, papeterie, grandes animations, expérience invités et principes des cérémonies sont définis.',
       '2027-01-31'),
  (5,  'Invitations et information invités lancées',
       'Supports finalisés, informations suffisamment fiables, invitations envoyées ou lancées, dispositif RSVP opérationnel.',
       '2027-02-28'),
  (6,  'Conception détaillée terminée',
       'Menus, décoration, tenues, cérémonies, spectacle, matériel, transports et organisation pratique ont quitté le stade des idées : les solutions retenues sont définies.',
       '2027-03-31'),
  (7,  'Commandes et réservations verrouillées',
       'Tout ce qui nécessite fabrication, location, achat, réservation ou délai fournisseur est commandé. Les effectifs deviennent suffisamment fiables pour dimensionner.',
       '2027-04-30'),
  (8,  'Effectifs et besoins invités stabilisés',
       'RSVP fortement consolidés, régimes et allergies connus, répartition par séquence fiable, quantités et capacités ajustées.',
       '2027-05-15'),
  (9,  'Organisation opérationnelle verrouillée',
       'Prestataires reconfirmés, quantités finales transmises, rôles affectés, transports et logistique définis, plus aucune décision structurelle ouverte.',
       '2027-05-31'),
  (10, 'Conducteurs et contenus finalisés',
       'Déroulés des 7 séquences finalisés, prises de parole, cérémonies, musique, animations et transitions validées ; responsables informés.',
       '2027-06-07'),
  (11, 'Production finale terminée',
       'Papeterie imprimée, signalétique, éléments décoratifs, cadeaux, kits, accessoires, documents et autres éléments physiques sont disponibles.',
       '2027-06-14'),
  (12, 'Mariage prêt à exécuter',
       'Tout est contrôlé, conditionné par journée et séquence, réparti entre responsables, paiements et documents prêts, plans B connus.',
       '2027-06-23')
) as v(sort_order, name, description, target_date)
where not exists (
  select 1 from public._20270628_milestones m where m.name = v.name
);

-- Contrôle
select sort_order, name, target_date
from public._20270628_milestones
order by sort_order;
