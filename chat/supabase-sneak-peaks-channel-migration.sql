-- Add the public Important-section sneak-peaks announcement channel.
-- Safe to run more than once.

insert into public.channels (name, type, visibility, is_log)
values ('sneak-peaks', 'announcement', 'public', false)
on conflict (name) do update
  set type = 'announcement', visibility = 'public', is_log = false;
