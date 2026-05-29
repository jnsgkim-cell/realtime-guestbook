-- Realtime Guestbook Supabase schema
-- Run this in the Supabase SQL Editor.

create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null check (length(btrim(author_name)) > 0),
  message text not null check (length(btrim(message)) > 0),
  media_url text not null check (length(btrim(media_url)) > 0),
  media_type text not null check (media_type in ('photo', 'drawing')),
  created_at timestamptz not null default now(),
  position_x numeric,
  position_y numeric,
  note_color text,
  rotation numeric
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.guestbook_entries(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null check (length(btrim(author_name)) > 0),
  content text not null check (length(btrim(content)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.guestbook_entries
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.comments
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.guestbook_entries
  add column if not exists status text not null default 'visible'
  check (status in ('visible', 'hidden', 'deleted'));

alter table public.guestbook_entries
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id);

alter table public.comments
  add column if not exists status text not null default 'visible'
  check (status in ('visible', 'hidden', 'deleted'));

alter table public.comments
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id);

create index if not exists guestbook_entries_created_at_idx
  on public.guestbook_entries (created_at desc);

create index if not exists guestbook_entries_status_created_at_idx
  on public.guestbook_entries (status, created_at desc);

create index if not exists guestbook_entries_user_id_idx
  on public.guestbook_entries (user_id);

create index if not exists comments_entry_id_created_at_idx
  on public.comments (entry_id, created_at);

create index if not exists comments_entry_id_status_created_at_idx
  on public.comments (entry_id, status, created_at);

create index if not exists comments_user_id_idx
  on public.comments (user_id);

alter table public.guestbook_entries enable row level security;
alter table public.comments enable row level security;
alter table public.profiles enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'user')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Anyone can read guestbook entries" on public.guestbook_entries;
drop policy if exists "Anyone can read visible guestbook entries" on public.guestbook_entries;
create policy "Anyone can read visible guestbook entries"
  on public.guestbook_entries
  for select
  to anon, authenticated
  using (status = 'visible' or public.is_admin());

drop policy if exists "Anyone can create guestbook entries" on public.guestbook_entries;
create policy "Anyone can create guestbook entries"
  on public.guestbook_entries
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and
    length(btrim(author_name)) > 0
    and length(btrim(message)) > 0
    and length(btrim(media_url)) > 0
    and media_type in ('photo', 'drawing')
    and status = 'visible'
  );

drop policy if exists "Admins can moderate guestbook entries" on public.guestbook_entries;
create policy "Admins can moderate guestbook entries"
  on public.guestbook_entries
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Anyone can read comments" on public.comments;
drop policy if exists "Anyone can read visible comments" on public.comments;
create policy "Anyone can read visible comments"
  on public.comments
  for select
  to anon, authenticated
  using (status = 'visible' or public.is_admin());

drop policy if exists "Anyone can create comments" on public.comments;
create policy "Anyone can create comments"
  on public.comments
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and
    length(btrim(author_name)) > 0
    and length(btrim(content)) > 0
    and status = 'visible'
  );

drop policy if exists "Admins can moderate comments" on public.comments;
create policy "Admins can moderate comments"
  on public.comments
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'guestbook',
  'guestbook',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read guestbook media" on storage.objects;
create policy "Anyone can read guestbook media"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'guestbook');

drop policy if exists "Anyone can upload guestbook media" on storage.objects;
create policy "Anyone can upload guestbook media"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'guestbook'
    and (
      name like 'photos/%'
      or name like 'drawings/%'
    )
  );

drop policy if exists "Admins can delete guestbook media" on storage.objects;
create policy "Admins can delete guestbook media"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'guestbook' and public.is_admin());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'guestbook_entries'
  ) then
    alter publication supabase_realtime add table public.guestbook_entries;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'comments'
  ) then
    alter publication supabase_realtime add table public.comments;
  end if;
end $$;

-- Admin bootstrap after creating an auth user:
-- update public.profiles set role = 'admin' where id = '<auth-user-id>';
