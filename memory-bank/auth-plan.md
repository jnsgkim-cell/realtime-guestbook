# Authentication And Authorization Plan

## Current State

The app is currently a public realtime guestbook:

- Visitors create guestbook entries without signing in.
- Visitors create comments without signing in.
- Media is uploaded to the public Supabase Storage bucket `guestbook`.
- `guestbook_entries` and `comments` are protected by RLS, but the current policies intentionally allow anonymous select and insert.
- Realtime subscriptions are used for new guestbook entries and comments.

This is appropriate for the first public event prototype, but it does not yet provide administrative moderation or authenticated privileged actions.

## Target Authorization Model

Use a mixed model:

- Public visitors can read the board without signing in.
- Visitors must sign up or sign in before creating guestbook entries, uploading media, or writing comments.
- Admin users authenticate with Supabase Auth.
- Admin privileges are stored in the database and enforced with RLS.

### Visitor Permissions

Anonymous visitors can:

- Read visible guestbook entries.
- Read visible comments.

Authenticated visitors can:

- Create guestbook entries.
- Create comments.
- Upload image media to allowed Storage paths.
- Read public media.

Visitors cannot:

- Update or delete entries.
- Update or delete comments.
- Delete Storage objects.
- See hidden or deleted records.
- Access admin pages.

### Admin Permissions

Admins can:

- Sign in through Supabase Auth.
- Read visible and hidden entries/comments.
- Hide or restore guestbook entries.
- Hide or restore comments.
- Optionally hard-delete entries/comments in a later phase.
- Optionally delete Storage media in a later phase.

## Recommended Schema Additions

Add profiles for roles:

```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);
```

Add moderation status:

```sql
alter table public.guestbook_entries
  add column if not exists status text not null default 'visible'
  check (status in ('visible', 'hidden', 'deleted'));

alter table public.comments
  add column if not exists status text not null default 'visible'
  check (status in ('visible', 'hidden', 'deleted'));
```

Add moderation timestamps if needed:

```sql
alter table public.guestbook_entries
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id);

alter table public.comments
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id);
```

## RLS Policy Direction

Use helper functions so policies stay readable:

```sql
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
```

Entry policies:

- `anon` and `authenticated` can select only rows where `status = 'visible'`.
- `authenticated` can insert valid entries with `status = 'visible'` and `user_id = auth.uid()`.
- Admin can select all entries.
- Admin can update moderation fields.

Comment policies:

- `anon` and `authenticated` can select only rows where `status = 'visible'`.
- `authenticated` can insert valid comments with `status = 'visible'` and `user_id = auth.uid()`.
- Admin can select all comments.
- Admin can update moderation fields.

Storage policies:

- Public read can remain enabled for the public bucket.
- Authenticated upload is allowed only for `photos/%` and `drawings/%`.
- Admin-only delete can be added later.
- Do not expose service-role keys to the browser.

## Application Changes

### Auth Client

Keep using the browser Supabase client for public flows. Add auth helpers for:

- Current session.
- Current user.
- Current profile.
- Admin role check.

Potential files:

```text
src/lib/supabase/auth.ts
src/lib/supabase/admin.ts
```

### Admin Routes

Add:

```text
/admin/login
/admin
```

Initial admin features:

- Sign in.
- Sign out.
- List recent guestbook entries.
- Hide or restore an entry.
- List comments for an entry.
- Hide or restore comments.

Avoid hard-delete in the first admin implementation. Use `status = hidden` first.

### Public Data Access

Update public queries to filter visible records:

```text
guestbook_entries.status = visible
comments.status = visible
```

Realtime handlers should ignore records that are not visible unless the viewer is an admin.

## Migration Plan

### Phase 0: Confirm Baseline

Before auth work:

- Confirm `supabase/schema.sql` has been applied successfully.
- Confirm new entries are inserted into `guestbook_entries`.
- Confirm comments are inserted into `comments`.
- Confirm Realtime works across two browser windows.
- Confirm media uploads to `guestbook/photos` and `guestbook/drawings`.

### Phase 1: Add Auth Tables And Role Model

Create:

- `profiles` table.
- `is_admin()` helper.
- Trigger to create a profile after a new user is created.
- RLS policies for `profiles`.

Manual admin bootstrap:

1. Create/sign in a user through Supabase Auth.
2. Find the user id in `auth.users`.
3. Update that user's profile role to `admin`.

### Phase 2: Add Moderation Columns

Add:

- `status` to `guestbook_entries`.
- `status` to `comments`.
- Optional `moderated_at` and `moderated_by`.

Backfill existing rows to `visible`.

### Phase 3: Tighten RLS

Replace broad select policies:

- Public users see only `visible` rows.
- Admin users see all rows.

Add update policies:

- Admins can update only moderation fields.

Keep public insert policies for event usability.

### Phase 4: Build Admin UI

Add login and admin pages:

- `/admin/login`
- `/admin`

Use Supabase Auth session state and profile role check.

Admin actions:

- Hide entry.
- Restore entry.
- Hide comment.
- Restore comment.

### Phase 5: Storage Moderation

Add admin-only Storage delete policy only if hard-delete is needed.

For the first moderation pass, prefer hiding DB records and leaving media in Storage to avoid broken references.

### Phase 6: Verification

Manual tests:

1. Anonymous visitor can create an entry.
2. Anonymous visitor can comment.
3. Anonymous visitor sees only visible entries/comments.
4. Admin can sign in.
5. Admin can see hidden and visible records.
6. Admin can hide an entry.
7. Hidden entry disappears from public board without exposing privileged data.
8. Admin can restore the entry.
9. Realtime still works for public visible comments.

Automated checks:

- `npm run typecheck`
- `npm run build`
- Data access function tests if a test runner is added.

## Security Notes

- Never put service role keys in `.env.local` variables exposed to the browser.
- Any variable prefixed with `NEXT_PUBLIC_` is public to the client.
- RLS must enforce admin permissions even if a client calls Supabase directly.
- Public anonymous insert is acceptable for the event prototype, but production should consider rate limiting, moderation, and abuse handling.

## Open Decisions

- Which auth provider should admins use first: email/password, magic link, or Google?
- Should visitors remain anonymous forever, or should authenticated visitor mode be introduced later?
- Should moderation use soft hide only, or support hard delete?
- Should future versions support multiple events with `event_id` or `board_id`?

## Implementation Update 2026-05-29

- Extended `supabase/schema.sql` with `profiles`, admin role support, `status` moderation fields, admin helper functions, RLS policy changes, and admin Storage delete policy.
- Added browser auth helpers in `src/lib/supabase/auth.ts`.
- Added `/admin/login` for Supabase email/password sign-in.
- Added `/admin` for admin-only moderation of guestbook entries and comments.
- Updated public entry/comment reads to return only `visible` records.
- Updated public realtime handlers to ignore non-visible inserted records.
- Current moderation behavior is soft hide/restore. Hard delete remains deferred.
- Admin bootstrap still requires creating a Supabase Auth user and setting that user's `public.profiles.role` to `admin` in SQL.
- Updated visitor flow so guestbook entry creation, comment creation, and media uploads require Supabase Auth.
