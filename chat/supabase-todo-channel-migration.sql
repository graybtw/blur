-- Add the public sneak-peaks and to-do announcement channels to Important.
-- Safe to run more than once because channel names are unique.
insert into public.channels (name, type, visibility, is_log)
values ('sneak-peaks', 'announcement', 'public', false)
on conflict (name) do update
  set type = 'announcement', visibility = 'public', is_log = false;

insert into public.channels (name, type, visibility, is_log)
values ('to-do', 'announcement', 'public', false)
on conflict (name) do update
  set type = 'announcement', visibility = 'public', is_log = false;
