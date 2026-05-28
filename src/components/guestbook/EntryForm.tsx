'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DrawingCanvas } from './DrawingCanvas';
import { validateMessageLength, validateRequired } from '@/lib/validation';
import { dataUrlToPngFile, uploadMediaToStorage } from '@/lib/supabase/storage';
import type { MediaType } from '@/types/guestbook';

export function EntryForm() {
  const router = useRouter();
  const [author, setAuthor] = useState('');
  const [message, setMessage] = useState('');
  const [mode, setMode] = useState<MediaType>('drawing');
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const hasMedia = mode === 'photo' ? Boolean(photoFile) : Boolean(drawingDataUrl);

  const valid = useMemo(
    () => validateRequired(author) && validateMessageLength(message) && hasMedia,
    [author, message, hasMedia],
  );

  const onPhoto = (file: File | null) => {
    if (!file) {
      setPhotoFile(null);
      setPhotoPreviewUrl(null);
      return;
    }
    if (!file.type.startsWith('image/')) return setError('이미지 파일만 업로드할 수 있어요.');
    if (file.size > 5 * 1024 * 1024) return setError('이미지는 5MB 이하만 가능합니다.');
    setError('');
    setPhotoFile(file);
    setPhotoPreviewUrl(URL.createObjectURL(file));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!valid) {
      setError('이름, 메시지, 사진/그림을 모두 입력해 주세요.');
      return;
    }

    const hasEnv =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET);

    if (!hasEnv) {
      setError('Supabase 환경변수가 누락되었습니다. .env.local에 URL, ANON KEY, STORAGE BUCKET을 설정해 주세요.');
      return;
    }

    setSaving(true);
    try {
      const entryId = crypto.randomUUID();
      let uploadFile: File;

      if (mode === 'photo') {
        if (!photoFile) throw new Error('사진 파일이 없습니다.');
        uploadFile = photoFile;
      } else {
        if (!drawingDataUrl) throw new Error('그림 데이터가 없습니다.');
        uploadFile = await dataUrlToPngFile(drawingDataUrl, `${entryId}.png`);
      }

      const uploadResult = await uploadMediaToStorage({
        file: uploadFile,
        mediaType: mode,
        entryId,
      });

      if ('error' in uploadResult) {
        setError(uploadResult.error);
        return;
      }

      const payload = {
        id: entryId,
        author_name: author.trim(),
        message: message.trim(),
        media_url: uploadResult.publicUrl,
        media_type: mode,
        created_at: new Date().toISOString(),
      };

      const prev = localStorage.getItem('entries');
      const entries = prev ? JSON.parse(prev) : [];
      localStorage.setItem('entries', JSON.stringify([payload, ...entries]));
      router.push('/board');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '업로드 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-xl space-y-4 rounded-3xl border-2 border-zinc-800 bg-amber-100 p-5 shadow-lg">
      <h1 className="text-center text-3xl font-bold">전자 방명록</h1>
      <input className="w-full rounded-xl border bg-white px-4 py-2" placeholder="이름 또는 닉네임" value={author} onChange={(e) => setAuthor(e.target.value)} />
      <textarea className="w-full rounded-xl border bg-white px-4 py-2" placeholder="짧은 메시지" rows={3} maxLength={200} value={message} onChange={(e) => setMessage(e.target.value)} />
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode('drawing')} className={`flex-1 rounded-xl border px-3 py-2 ${mode === 'drawing' ? 'bg-zinc-900 text-white' : 'bg-white'}`}>그림</button>
        <button type="button" onClick={() => setMode('photo')} className={`flex-1 rounded-xl border px-3 py-2 ${mode === 'photo' ? 'bg-zinc-900 text-white' : 'bg-white'}`}>사진</button>
      </div>
      {mode === 'drawing' ? (
        <DrawingCanvas onChange={setDrawingDataUrl} />
      ) : (
        <div className="space-y-2 rounded-2xl border-2 border-zinc-400 bg-white p-4">
          <input type="file" accept="image/*" onChange={(e) => onPhoto(e.target.files?.[0] ?? null)} />
          {photoPreviewUrl ? <img src={photoPreviewUrl} alt="preview" className="max-h-64 w-full rounded-xl object-contain" /> : <p className="text-sm text-zinc-500">사진을 첨부해 주세요.</p>}
        </div>
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button disabled={!valid || saving} className="w-full rounded-xl border-2 border-zinc-800 bg-white px-3 py-3 font-semibold disabled:opacity-50">{saving ? '업로드/저장 중...' : '등록하고 보드로 이동'}</button>
    </form>
  );
}
