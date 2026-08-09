-- Nouveau statut RSVP : confirmé mais absent le jour J.
-- L'enum Postgres ne supporte pas DROP VALUE, donc on ajoute simplement.
alter type rsvp_status add value if not exists 'no_show';
