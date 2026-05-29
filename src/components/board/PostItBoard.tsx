'use client';

import { useEffect, useMemo, useState } from 'react';
import { createComment, listComments } from '@/lib/supabase/comments';
import { supabase } from '@/lib/supabase/client';
import type { Comment, GuestbookEntry } from '@/types/guestbook';

export function PostItBoard({ entries }: { entries: GuestbookEntry[] }) {
  const [selected, setSelected] = useState<GuestbookEntry | null>(null);
  const colored = useMemo(
    () => entries.map((e, i) => ({ ...e, c: ['bg-yellow-200', 'bg-pink-200', 'bg-green-200', 'bg-blue-200'][i % 4] })),
    [entries],
  );

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
            <RealtimeComments entryId={selected.id} />
          </div>
        </div>
      ) : null}
    </>
  );
}

function RealtimeComments({ entryId }: { entryId: string }) {
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const result = await listComments(entryId);
      if (!mounted) return;

      if ('error' in result) {
        setError(result.error);
        return;
      }

      setComments(result.comments);
    }

    load();

    const client = supabase;

    if (!client) {
      return () => {
        mounted = false;
      };
    }

    const channel = client
      .channel(`comments:${entryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `entry_id=eq.${entryId}`,
        },
        (payload) => {
          const comment = payload.new as Comment;
          if (comment.status && comment.status !== 'visible') return;
          setComments((current) => (
            current.some((item) => item.id === comment.id) ? current : [...current, comment]
          ));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      client.removeChannel(channel);
    };
  }, [entryId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!author.trim() || !content.trim()) return;

    setSaving(true);
    const result = await createComment({
      entry_id: entryId,
      author_name: author.trim(),
      content: content.trim(),
    });
    setSaving(false);

    if ('error' in result) {
      setError(result.error);
      return;
    }

    setComments((current) => (
      current.some((item) => item.id === result.comment.id) ? current : [...current, result.comment]
    ));
    setAuthor('');
    setContent('');
  };

  return (
    <div className="space-y-2">
      <div className="max-h-40 space-y-1 overflow-auto rounded-xl border p-2">
        {comments.length === 0 ? (
          <p className="text-sm text-zinc-500">아직 댓글이 없어요.</p>
        ) : (
          comments.map((c) => (
            <p key={c.id} className="text-sm">
              <b>{c.author_name}</b>: {c.content}
            </p>
          ))
        )}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <form onSubmit={submit} className="grid gap-2 sm:grid-cols-4">
        <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="이름" className="rounded-lg border px-2 py-1 sm:col-span-1" />
        <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="댓글" className="rounded-lg border px-2 py-1 sm:col-span-2" />
        <button disabled={saving} className="rounded-lg border bg-zinc-900 px-2 py-1 text-white disabled:opacity-50 sm:col-span-1">{saving ? '저장 중' : '등록'}</button>
      </form>
    </div>
  );
}
