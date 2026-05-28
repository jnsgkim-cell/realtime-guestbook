# Realtime Guestbook

## Environment

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET=guestbook
```

- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` is used as the target Supabase Storage bucket.
- Current expected bucket name: `guestbook`.

## Current Media Upload Behavior

- Photo mode uploads the selected image file directly to Supabase Storage.
- Drawing mode converts canvas data URL to a PNG `File` and uploads it to Supabase Storage.
- After upload, the returned public URL is saved as `media_url`.
- If Supabase env vars are missing or upload fails, the UI shows a clear error message.
