-- Realtime Guestbook Supabase schema
-- Run this in the Supabase SQL Editor for a fresh project.

create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
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
  author_name text not null check (length(btrim(author_name)) > 0),
  content text not null check (length(btrim(content)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists guestbook_entries_created_at_idx
  on public.guestbook_entries (created_at desc);

create index if not exists comments_entry_id_created_at_idx
  on public.comments (entry_id, created_at);

alter table public.guestbook_entries enable row level security;
alter table public.comments enable row level security;

drop policy if exists "Anyone can read guestbook entries" on public.guestbook_entries;
create policy "Anyone can read guestbook entries"
  on public.guestbook_entries
  for select
  to anon
  using (true);

drop policy if exists "Anyone can create guestbook entries" on public.guestbook_entries;
create policy "Anyone can create guestbook entries"
  on public.guestbook_entries
  for insert
  to anon
  with check (
    length(btrim(author_name)) > 0
    and length(btrim(message)) > 0
    and length(btrim(media_url)) > 0
    and media_type in ('photo', 'drawing')
  );

drop policy if exists "Anyone can read comments" on public.comments;
create policy "Anyone can read comments"
  on public.comments
  for select
  to anon
  using (true);

drop policy if exists "Anyone can create comments" on public.comments;
create policy "Anyone can create comments"
  on public.comments
  for insert
  to anon
  with check (
    length(btrim(author_name)) > 0
    and length(btrim(content)) > 0
  );

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
  to anon
  using (bucket_id = 'guestbook');

drop policy if exists "Anyone can upload guestbook media" on storage.objects;
create policy "Anyone can upload guestbook media"
  on storage.objects
  for insert
  to anon
  with check (
    bucket_id = 'guestbook'
    and (
      name like 'photos/%'
      or name like 'drawings/%'
    )
  );

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
