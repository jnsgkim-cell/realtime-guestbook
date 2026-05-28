'use client';

import { useEffect, useState } from 'react';
import { PostItBoard } from '@/components/board/PostItBoard';
import { listGuestbookEntries } from '@/lib/supabase/entries';
import { supabase } from '@/lib/supabase/client';
import type { GuestbookEntry } from '@/types/guestbook';

export default function BoardPage() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function load() {
      const result = await listGuestbookEntries();
      if (!mounted) return;

      if ('error' in result) {
        setError(result.error);
        return;
      }

      setEntries(result.entries);
    }

    load();

    const client = supabase;

    if (!client) {
      return () => {
        mounted = false;
      };
    }

    const channel = client
      .channel('guestbook_entries_insert')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'guestbook_entries' },
        (payload) => {
          const entry = payload.new as GuestbookEntry;
          setEntries((current) => (
            current.some((item) => item.id === entry.id) ? current : [entry, ...current]
          ));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      client.removeChannel(channel);
    };
  }, []);

  return (
    <main className="min-h-screen bg-zinc-100 p-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-2xl font-bold">실시간 포스트잇 보드</h1>
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <PostItBoard entries={entries} />
      </div>
    </main>
  );
}
