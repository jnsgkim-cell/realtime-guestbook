'use client';

import { useMemo, useState } from 'react';
import type { GuestbookEntry } from '@/types/guestbook';

export function PostItBoard({ entries }: { entries: GuestbookEntry[] }) {
  const [selected, setSelected] = useState<GuestbookEntry | null>(null);
  const colored = useMemo(() => entries.map((e, i) => ({ ...e, c: ['bg-yellow-200', 'bg-pink-200', 'bg-green-200', 'bg-blue-200'][i % 4] })), [entries]);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {colored.map((entry) => (
          <button key={entry.id} onClick={() => setSelected(entry)} className={`rounded-2xl p-3 text-left shadow ${entry.c}`}>
            <img src={entry.media_url} alt={entry.author_name} className="h-24 w-full rounded-lg object-cover" />
            <p className="mt-2 line-clamp-1 font-bold">{entry.author_name}</p>
            <p className="line-clamp-2 text-sm">{entry.message}</p>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <img src={selected.media_url} alt={selected.author_name} className="h-72 w-full rounded-xl object-contain" />
            <p className="mt-2 font-bold">{selected.author_name}</p>
            <p className="mb-3">{selected.message}</p>
            <MockComments entryId={selected.id} />
          </div>
        </div>
      ) : null}
    </>
  );
}

function MockComments({ entryId }: { entryId: string }) {
  const key = `comments:${entryId}`;
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [comments, setComments] = useState<Array<{ author_name: string; content: string }>>(() => {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !content.trim()) return;
    const next = [...comments, { author_name: author.trim(), content: content.trim() }];
    setComments(next);
    localStorage.setItem(key, JSON.stringify(next));
    setAuthor('');
    setContent('');
  };

  return (
    <div className="space-y-2">
      <div className="max-h-40 space-y-1 overflow-auto rounded-xl border p-2">
        {comments.length === 0 ? <p className="text-sm text-zinc-500">아직 댓글이 없어요.</p> : comments.map((c, i) => <p key={i} className="text-sm"><b>{c.author_name}</b>: {c.content}</p>)}
      </div>
      <form onSubmit={submit} className="grid gap-2 sm:grid-cols-4">
        <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="이름" className="rounded-lg border px-2 py-1 sm:col-span-1" />
        <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="댓글" className="rounded-lg border px-2 py-1 sm:col-span-2" />
        <button className="rounded-lg border bg-zinc-900 px-2 py-1 text-white sm:col-span-1">등록</button>
      </form>
    </div>
  );
}
