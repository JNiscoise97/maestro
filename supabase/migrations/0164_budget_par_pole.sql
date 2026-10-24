-- 0164_budget_par_pole.sql
-- Budget regroupé par pôle (les mêmes pôles que les missions) au lieu des catégories libres.
--   1. Ajoute budget_items.pole_id (pôle du même événement), pour chaque déploiement.
--   2. Mariage : répartit les lignes existantes à partir de leur ancienne catégorie.
--   3. Les sous-dépenses prennent le pôle de leur ligne parente.
-- L'ancienne colonne « category » est conservée (non affichée) : rien n'est perdu.
-- Réexécutable sans risque (ne remplace pas un pôle déjà choisi).

begin;

do $$
declare p text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    if to_regclass('public.' || p || 'budget_items') is not null and to_regclass('public.' || p || 'poles') is not null then
      execute format(
        'alter table public.%I add column if not exists pole_id uuid references public.%I(id) on delete set null',
        p || 'budget_items', p || 'poles');
    end if;
  end loop;
end $$;

-- Répartition des catégories du budget du mariage vers les pôles.
update public._20270628_budget_items b
set pole_id = po.id
from (values
  ('Tenues',                               'Tenues & préparation personnelle'),
  ('Tenues et accessoires',                'Tenues & préparation personnelle'),
  ('Mise en beauté',                       'Tenues & préparation personnelle'),
  ('Bagues',                               'Tenues & préparation personnelle'),
  ('',                                     'Tenues & préparation personnelle'),
  ('Sans catégorie',                       'Tenues & préparation personnelle'),
  ('Décoration',                           'Décoration & ambiance'),
  ('Fleurs et décoration',                 'Décoration & ambiance'),
  ('Papeterie',                            'Communication & papeterie'),
  ('Animation',                            'Cérémonies & animation'),
  ('Animation de la sortie de mairie',     'Cérémonies & animation'),
  ('Animation de la sortie de l''église',  'Cérémonies & animation'),
  ('Cérémonie traditionnelle',             'Cérémonies & animation'),
  ('Cadeaux et souvenirs',                 'Invités & accueil'),
  ('Dépenses souvent oubliées',            'Matériel & logistique'),
  ('Photographie et vidéo',                'Image & souvenirs'),
  ('Lieu de réception',                    'Lieu & prestataires'),
  ('Restauration',                         'Restauration & boissons'),
  ('Boissons',                             'Restauration & boissons'),
  ('Transport et déplacements',            'Transport & déplacements')
) as m(category, pole_name)
join public._20270628_poles po on po.name = m.pole_name
where coalesce(b.category, '') = m.category
  and b.pole_id is null;

-- Sous-dépenses : même pôle que leur ligne parente.
update public._20270628_budget_items c
set pole_id = p.pole_id
from public._20270628_budget_items p
where c.parent_id = p.id and c.pole_id is distinct from p.pole_id;

commit;

-- Contrôle : lignes par pôle (attendu : aucune ligne « Sans pôle »)
select coalesce(po.name, 'Sans pôle') as pole, count(*) as lignes
from public._20270628_budget_items b
left join public._20270628_poles po on po.id = b.pole_id
group by po.name, po.sort_order
order by po.sort_order nulls last;
