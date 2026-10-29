-- 0169_budget_seconde_passe.sql
-- Budget : seconde passe d'arbitrage. Chaque ligne (poste ou sous-poste) reçoit 6 notes de 0 à 2
-- (souvenir, signature, absence, confort, trace, duree) et une remarque libre.
-- Un sous-poste sans notes reprend celles de son poste (comme la priorité MoSCoW).
-- Seules des colonnes sont ajoutées : RLS et policy anon_all de la table restent celles d'origine.
-- Pour chaque déploiement ayant un budget. Réexécutable sans risque.

do $$
declare p text; t text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    t := p || 'budget_items';
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I add column if not exists review_scores jsonb', t);
    execute format('alter table public.%I add column if not exists review_note text', t);
    execute format($c$comment on column public.%I.review_scores is
      'Seconde passe : {"souvenir":0-2,"signature":0-2,"absence":0-2,"confort":0-2,"trace":0-2,"duree":0-2} ; null = pas encore notée.'$c$, t);
  end loop;
end;
$$;
