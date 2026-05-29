'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { EntryForm } from '@/components/guestbook/EntryForm';
import { getCurrentUser, signInVisitor, signOutUser, signUpVisitor } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase/client';

type AuthMode = 'login' | 'signup';

export default function HomePage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const result = await getCurrentUser();
      if (!mounted) return;

      if ('user' in result) {
        setUser(result.user);
      }
    }

    loadUser();

    if (!supabase) {
      return () => {
        mounted = false;
      };
    }

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    const result = mode === 'login'
      ? await signInVisitor(email.trim(), password)
      : await signUpVisitor(email.trim(), password);

    setLoading(false);

    if ('error' in result) {
      setError(result.error);
      return;
    }

    if ('needsConfirmation' in result && result.needsConfirmation) {
      setMessage('가입 확인 메일을 보냈습니다. 이메일 확인 후 로그인해 주세요.');
      return;
    }

    setMessage(mode === 'login' ? '로그인되었습니다.' : '회원가입이 완료되었습니다.');
  };

  const logout = async () => {
    setError('');
    setMessage('');
    const result = await signOutUser();

    if ('error' in result) {
      setError(result.error);
      return;
    }

    setUser(null);
  };

  return (
    <main className="min-h-screen p-4 py-8">
      <div className="mx-auto grid w-full max-w-5xl gap-5 lg:grid-cols-[360px_1fr]">
        <section className="space-y-4 rounded-3xl border-2 border-zinc-800 bg-white p-5 shadow-lg">
          <div>
            <p className="text-sm font-semibold text-zinc-500">방문자 인증</p>
            <h1 className="text-2xl font-bold">로그인 후 방명록 작성</h1>
          </div>

          {user ? (
            <div className="space-y-3">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                <p className="font-semibold">로그인됨</p>
                <p className="break-all">{user.email}</p>
              </div>
              <button onClick={logout} className="w-full rounded-xl border bg-white px-3 py-2 font-semibold">로그아웃</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-zinc-100 p-1">
                <button type="button" onClick={() => setMode('login')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === 'login' ? 'bg-zinc-900 text-white' : 'bg-white'}`}>로그인</button>
                <button type="button" onClick={() => setMode('signup')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${mode === 'signup' ? 'bg-zinc-900 text-white' : 'bg-white'}`}>회원가입</button>
              </div>
              <form onSubmit={submit} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="이메일"
                  className="w-full rounded-xl border px-3 py-2"
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="비밀번호"
                  className="w-full rounded-xl border px-3 py-2"
                  required
                />
                <button disabled={loading} className="w-full rounded-xl bg-zinc-900 px-3 py-2 font-semibold text-white disabled:opacity-50">
                  {loading ? '처리 중' : mode === 'login' ? '로그인하고 작성하기' : '가입하고 작성하기'}
                </button>
              </form>
            </>
          )}

          {message ? <p className="rounded-xl bg-green-50 p-3 text-sm text-green-700">{message}</p> : null}
          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        </section>

        <section className={user ? '' : 'pointer-events-none opacity-40'}>
          {!user ? (
            <div className="mb-3 rounded-2xl border border-zinc-300 bg-white p-3 text-sm font-medium text-zinc-600">
              로그인 또는 회원가입 후 방명록을 작성할 수 있습니다.
            </div>
          ) : null}
          <EntryForm />
        </section>
      </div>
    </main>
  );
}
