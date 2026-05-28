import type { MediaType } from '@/types/guestbook';
import { supabase } from './client';

const DEFAULT_BUCKET = 'guestbook';

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function dataUrlToPngFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: 'image/png' });
}

export async function uploadMediaToStorage(params: {
  file: File;
  mediaType: MediaType;
  entryId: string;
}): Promise<{ publicUrl: string } | { error: string }> {
  if (!supabase) {
    return { error: 'Supabase URL과 anon key를 .env.local에 설정해 주세요.' };
  }

  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
  const now = Date.now();
  const safeFileName = sanitizeFileName(params.file.name || `${now}.png`);
  const folder = params.mediaType === 'photo' ? 'photos' : 'drawings';
  const path = `${folder}/${params.entryId}/${now}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, params.file, {
      contentType: params.file.type || 'image/png',
      upsert: false,
    });

  if (uploadError) {
    return { error: `이미지 업로드에 실패했습니다: ${uploadError.message}` };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  if (!data.publicUrl) {
    return { error: '업로드된 이미지 URL을 만들지 못했습니다.' };
  }

  return { publicUrl: data.publicUrl };
}
