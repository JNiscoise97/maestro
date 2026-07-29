-- Ajout de la notion de vague (annonce / invitation) et des champs
-- spécifiques à l'invitation sur la table de réponses RSVP mariage.

alter table _20270628_rsvp_responses
  add column wave                text not null default 'annonce',
  add column city_of_origin      text,
  add column needs_accommodation boolean,
  add column days_attending      text[],
  add column dietary_constraints text;
