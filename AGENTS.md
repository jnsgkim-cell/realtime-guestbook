# AGENTS.md

## Project

Realtime electronic guestbook web app.

Visitors at events, exhibitions, pop-ups, graduations, weddings, and similar venues can upload a photo or draw on a canvas to leave a guestbook entry. Entries appear on a realtime post-it style board, and each post-it can show realtime comments.

## Required Memory Bank

Before starting work, read the relevant files in `memory-bank` and keep them updated when decisions or implementation details change.

- `memory-bank/architecture.md`: System structure, data model, stack choices, component boundaries.
- `memory-bank/implementation-plan.md`: Implementation order, task phases, verification checklist, future extension plan.
- `memory-bank/auth-plan.md`: Authentication, authorization, admin moderation, RLS policy, and migration plan.

## Development Rules

- Use Next.js, React, and TypeScript.
- Use Tailwind CSS for styling.
- Use Supabase for database, Storage, and Realtime behavior.
- Use HTML Canvas for drawing.
- `/` is the entry creation page.
- `/board` is the realtime post-it board.
- Post-it details should be handled inside `/board` through a modal or detail panel.
- Keep data access and realtime subscription logic separate from presentational UI where practical.
- Validate required name, message, and media inputs before submission.
- Show clear loading, saving, uploading, and error states.
- Prioritize mobile event-use ergonomics.

## Current Product Scope

Core features:

- Name or nickname input.
- Short message input.
- Photo upload or canvas drawing mode.
- Drawing tools such as color, line width, eraser/clear.
- Supabase Storage upload for media.
- Supabase `guestbook_entries` persistence.
- Supabase `comments` persistence.
- Realtime board updates.
- Realtime comment updates inside the selected post-it modal.

Deferred features:

- Admin moderation UI.
- Authenticated admin role management.
- Event-specific boards.
- Image optimization pipeline.
- Abuse reporting and moderation workflow.

## Authentication And Authorization Direction

- Keep the public guestbook flow low-friction: visitors may create entries and comments without signing in.
- Require Supabase Auth for administrative features such as hiding entries, hiding comments, deleting media, or viewing moderation queues.
- Treat Row Level Security policies as the real authorization boundary, not only UI-level checks.
- Store admin authorization in a database role/profile table rather than hardcoding emails in client code.
- Prefer soft moderation (`status = hidden`) before hard delete, so accidental moderation actions can be reversed.
- Before implementing auth changes, read `memory-bank/auth-plan.md` and update it when decisions or schema details change.

## Update Log

- 2026-05-28: Initial Next.js/Tailwind UI implemented for `/` and `/board`.
- 2026-05-28: Supabase Storage upload helpers added.
- 2026-05-29: Guestbook entries and comments moved from localStorage to Supabase DB with Realtime subscriptions.
- 2026-05-29: Authentication and authorization planning added.
