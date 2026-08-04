-- Rattrapage 0076 pour _20270628_app_settings : colonnes event_type + plages horaires

alter table _20270628_app_settings
  add column if not exists event_type   text not null default 'mariage',
  add column if not exists main_end     date,
  add column if not exists main_time    time,
  add column if not exists setup_start  date,
  add column if not exists setup_end    date,
  add column if not exists setup_time   time,
  add column if not exists cleanup_start date,
  add column if not exists cleanup_end  date,
  add column if not exists cleanup_time time;
