'use client';

import { useEffect, useState } from 'react';
import { PostItBoard } from '@/components/board/PostItBoard';
import type { GuestbookEntry } from '@/types/guestbook';

export default function BoardPage() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('entries');
    setEntries(raw ? JSON.parse(raw) : []);
  }, []);

  return (
    <main className="min-h-screen bg-zinc-100 p-4">
      <div className="mx-auto max-w-6xl space-y-4">
        <h1 className="text-2xl font-bold">실시간 포스트잇 보드</h1>
        <PostItBoard entries={entries} />
      </div>
    </main>
  );
}
