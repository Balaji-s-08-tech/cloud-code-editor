create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  github_repo_owner text,
  github_repo_name text,
  github_branch text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_id uuid references public.files(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  type text not null check (type in ('file', 'folder')),
  language text check (language is null or char_length(language) <= 40),
  content text,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint files_parent_not_self check (parent_id is null or parent_id <> id),
  constraint files_folder_content_empty check (
    (type = 'folder' and content is null and language is null)
    or type = 'file'
  )
);

create table if not exists public.github_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  github_user_id text not null,
  username text not null,
  avatar_url text,
  access_token text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists projects_user_name_unique
  on public.projects (user_id, lower(name));

create index if not exists projects_user_updated_idx
  on public.projects (user_id, updated_at desc);

create index if not exists files_project_parent_idx
  on public.files (project_id, parent_id);

create index if not exists files_project_type_idx
  on public.files (project_id, type);

create index if not exists files_project_updated_idx
  on public.files (project_id, updated_at desc);

create unique index if not exists files_project_parent_name_unique
  on public.files (
    project_id,
    coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(name)
  );

create index if not exists github_connections_user_idx
  on public.github_connections (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row
execute function public.set_updated_at();

drop trigger if exists files_set_updated_at on public.files;
create trigger files_set_updated_at
before update on public.files
for each row
execute function public.set_updated_at();

drop trigger if exists github_connections_set_updated_at on public.github_connections;
create trigger github_connections_set_updated_at
before update on public.github_connections
for each row
execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.files enable row level security;
alter table public.github_connections enable row level security;

drop policy if exists "Users can read own projects" on public.projects;
create policy "Users can read own projects"
on public.projects for select
using (user_id = auth.uid());

drop policy if exists "Users can create own projects" on public.projects;
create policy "Users can create own projects"
on public.projects for insert
with check (user_id = auth.uid());

drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects"
on public.projects for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects"
on public.projects for delete
using (user_id = auth.uid());

drop policy if exists "Users can read project files" on public.files;
create policy "Users can read project files"
on public.files for select
using (
  exists (
    select 1
    from public.projects
    where projects.id = files.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can create project files" on public.files;
create policy "Users can create project files"
on public.files for insert
with check (
  exists (
    select 1
    from public.projects
    where projects.id = files.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can update project files" on public.files;
create policy "Users can update project files"
on public.files for update
using (
  exists (
    select 1
    from public.projects
    where projects.id = files.project_id
      and projects.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = files.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete project files" on public.files;
create policy "Users can delete project files"
on public.files for delete
using (
  exists (
    select 1
    from public.projects
    where projects.id = files.project_id
      and projects.user_id = auth.uid()
  )
);

drop policy if exists "Users can read own github connection" on public.github_connections;
create policy "Users can read own github connection"
on public.github_connections for select
using (user_id = auth.uid());

drop policy if exists "Users can manage own github connection" on public.github_connections;
create policy "Users can manage own github connection"
on public.github_connections for all
using (user_id = auth.uid())
with check (user_id = auth.uid());
