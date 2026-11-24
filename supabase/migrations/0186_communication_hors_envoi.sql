-- Invités › Communications : « Ne pas envoyer » (hors envoi), invité par invité et communication par communication.
-- Pour les personnes ciblées qui ne peuvent pas recevoir la communication (pas de téléphone ni d'ordinateur,
-- personnes très âgées…) : elles sortent de la liste « À envoyer » et du total, sans être notées « envoyé ».
--   · excluded : hors envoi pour cette communication ;
-- Les inséparables reçoivent la même valeur (fait par l'appli).
-- Les deux déploiements (fiançailles _20260725_ et mariage _20270628_), si la table existe (0184). Réexécutable.

do $$
declare
  p text;
begin
  foreach p in array array['_20260725_', '_20270628_'] loop
    if to_regclass(format('public.%scommunication_prep', p)) is null then
      continue;
    end if;
    execute format('alter table public.%scommunication_prep add column if not exists excluded boolean not null default false', p);
  end loop;
end
$$;
