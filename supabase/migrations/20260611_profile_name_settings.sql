create or replace function public.update_current_profile_name(profile_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Debe iniciar sesion para actualizar el perfil.';
  end if;

  update public.profiles
  set full_name = coalesce(nullif(trim(profile_name), ''), public.profiles.full_name)
  where id = auth.uid()
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'No existe un perfil asociado a este usuario.';
  end if;

  return updated_profile;
end;
$$;

grant execute on function public.update_current_profile_name(text) to authenticated;

create or replace function public.ensure_admin_test_profile(full_name text default 'Administrador Rebagliati')
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
  ensured_profile public.profiles;
begin
  select email into current_email
  from auth.users
  where id = auth.uid();

  if auth.uid() is null or current_email <> 'admin@test.com' then
    raise exception 'Solo admin@test.com puede ejecutar esta inicializacion.';
  end if;

  insert into public.profiles (id, full_name, role, active)
  values (auth.uid(), coalesce(nullif(trim(full_name), ''), 'Administrador Rebagliati'), 'admin_sistema', true)
  on conflict (id) do update
    set full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
        role = 'admin_sistema',
        active = true
  returning * into ensured_profile;

  return ensured_profile;
end;
$$;

grant execute on function public.ensure_admin_test_profile(text) to authenticated;
