'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listAdminComments, updateCommentStatus } from '@/lib/supabase/comments';
import { listAdminGuestbookEntries, updateGuestbookEntryStatus } from '@/lib/supabase/entries';
import { getCurrentProfile, signOutAdmin } from '@/lib/supabase/auth';
import type { Comment, GuestbookEntry, ModerationStatus } from '@/types/guestbook';

export default function AdminPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [commentsByEntry, setCommentsByEntry] = useState<Record<string, Comment[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const profileResult = await getCurrentProfile();

      if ('error' in profileResult) {
        setError(profileResult.error);
        setLoading(false);
        return;
      }

      if (profileResult.profile?.role !== 'admin') {
        router.replace('/admin/login');
        return;
      }

      const entriesResult = await listAdminGuestbookEntries();

      if ('error' in entriesResult) {
        setError(entriesResult.error);
        setLoading(false);
        return;
      }

      setEntries(entriesResult.entries);

      const pairs = await Promise.all(
        entriesResult.entries.map(async (entry) => {
          const result = await listAdminComments(entry.id);
          return [entry.id, 'comments' in result ? result.comments : []] as const;
        }),
      );

      setCommentsByEntry(Object.fromEntries(pairs));
      setLoading(false);
    }

    load();
  }, [router]);

  const changeEntryStatus = async (id: string, status: Exclude<ModerationStatus, 'deleted'>) => {
    const result = await updateGuestbookEntryStatus(id, status);

    if ('error' in result) {
      setError(result.error);
      return;
    }

    setEntries((current) => current.map((entry) => (entry.id === id ? result.entry : entry)));
  };

  const changeCommentStatus = async (entryId: string, commentId: string, status: Exclude<ModerationStatus, 'deleted'>) => {
    const result = await updateCommentStatus(commentId, status);

    if ('error' in result) {
      setError(result.error);
      return;
    }

    setCommentsByEntry((current) => ({
      ...current,
      [entryId]: (current[entryId] ?? []).map((comment) => (comment.id === commentId ? result.comment : comment)),
    }));
  };

  const logout = async () => {
    await signOutAdmin();
    router.push('/admin/login');
  };

  if (loading) {
    return <main className="min-h-screen bg-zinc-100 p-6">관리자 정보를 확인하는 중입니다.</main>;
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-4">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">방명록 관리자</h1>
          <button onClick={logout} className="rounded-xl border bg-white px-3 py-2">로그아웃</button>
        </div>
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <div className="space-y-3">
          {entries.length === 0 ? <p className="rounded-xl bg-white p-4 text-sm text-zinc-500">관리할 방명록이 없습니다.</p> : null}
          {entries.map((entry) => (
            <section key={entry.id} className="rounded-2xl border bg-white p-4 shadow-sm">
              <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                <img src={entry.media_url} alt={entry.author_name} className="h-40 w-full rounded-xl object-cover" />
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-bold">{entry.author_name}</p>
                      <p className="text-sm text-zinc-500">{entry.status ?? 'visible'} · {new Date(entry.created_at).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => changeEntryStatus(entry.id, 'hidden')} className="rounded-lg border px-3 py-1 text-sm">숨김</button>
                      <button onClick={() => changeEntryStatus(entry.id, 'visible')} className="rounded-lg border px-3 py-1 text-sm">복구</button>
                    </div>
                  </div>
                  <p>{entry.message}</p>
                  <div className="space-y-2 rounded-xl border bg-zinc-50 p-3">
                    <p className="text-sm font-semibold">댓글</p>
                    {(commentsByEntry[entry.id] ?? []).length === 0 ? <p className="text-sm text-zinc-500">댓글이 없습니다.</p> : null}
                    {(commentsByEntry[entry.id] ?? []).map((comment) => (
                      <div key={comment.id} className="flex items-start justify-between gap-3 rounded-lg bg-white p-2 text-sm">
                        <p><b>{comment.author_name}</b>: {comment.content} <span className="text-zinc-400">({comment.status ?? 'visible'})</span></p>
                        <div className="flex shrink-0 gap-1">
                          <button onClick={() => changeCommentStatus(entry.id, comment.id, 'hidden')} className="rounded border px-2 py-1">숨김</button>
                          <button onClick={() => changeCommentStatus(entry.id, comment.id, 'visible')} className="rounded border px-2 py-1">복구</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
