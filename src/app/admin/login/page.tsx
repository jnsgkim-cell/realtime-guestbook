'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInAdmin } from '@/lib/supabase/auth';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const result = await signInAdmin(email.trim(), password);
    setLoading(false);

    if ('error' in result) {
      setError(result.error);
      return;
    }

    router.push('/admin');
  };

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-100 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border-2 border-zinc-800 bg-white p-5 shadow">
        <h1 className="text-2xl font-bold">관리자 로그인</h1>
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
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button disabled={loading} className="w-full rounded-xl bg-zinc-900 px-3 py-2 font-semibold text-white disabled:opacity-50">
          {loading ? '로그인 중' : '로그인'}
        </button>
      </form>
    </main>
  );
}
