create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_normalized check (email = lower(trim(email)))
);

create unique index if not exists users_email_unique
  on public.users (lower(email));

alter table public.users enable row level security;

-- Aucune politique publique : la table est accessible uniquement au serveur
-- avec SUPABASE_SECRET_KEY. Ne jamais exposer cette clé dans Vite/React.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute function public.set_updated_at();
