create table if not exists public.ai_runs (
  id uuid primary key,
  owner_id uuid not null references public.users(id) on delete cascade,
  project_id uuid null references public.projects(id) on delete set null,
  prompt text not null check (char_length(prompt) between 3 and 2000),
  status text not null check (status in ('awaiting_review', 'awaiting_approval', 'approved', 'rejected')),
  summary text not null,
  commands jsonb not null,
  source_document jsonb not null,
  proposed_document jsonb not null,
  warnings jsonb not null default '[]'::jsonb,
  provider text not null check (provider in ('google', 'openrouter')),
  model text not null,
  visual_review jsonb null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_runs_owner_created_idx on public.ai_runs(owner_id, created_at desc);
create index if not exists ai_runs_project_idx on public.ai_runs(owner_id, project_id) where project_id is not null;

drop trigger if exists ai_runs_set_updated_at on public.ai_runs;
create trigger ai_runs_set_updated_at
before update on public.ai_runs
for each row execute function public.set_updated_at();

alter table public.ai_runs enable row level security;
revoke all on table public.ai_runs from anon, authenticated;
