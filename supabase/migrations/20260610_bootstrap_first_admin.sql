create or replace function public.bootstrap_first_admin(full_name text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  created_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Debe iniciar sesion para crear el primer administrador.';
  end if;

  if exists (select 1 from public.profiles) then
    select * into created_profile from public.profiles where id = auth.uid();
    if created_profile.id is null then
      raise exception 'El bootstrap solo esta permitido cuando no existen perfiles.';
    end if;
    return created_profile;
  end if;

  insert into public.profiles (id, full_name, role, active)
  values (auth.uid(), coalesce(nullif(full_name, ''), 'Administrador Rebagliati'), 'admin_sistema', true)
  returning * into created_profile;

  return created_profile;
end;
$$;

grant execute on function public.bootstrap_first_admin(text) to authenticated;
