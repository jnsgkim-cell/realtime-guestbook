import { supabase } from './client';
import type { MediaType } from '@/types/guestbook';

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function uploadMediaToStorage(params: {
  file: File;
  mediaType: MediaType;
  entryId: string;
}): Promise<{ publicUrl: string } | { error: string }> {
  if (!supabase) {
    return { error: 'Supabase 환경변수가 설정되지 않았습니다. .env.local 값을 확인해 주세요.' };
  }

  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET || 'guestbook';

  const now = Date.now();
  const safeFileName = sanitizeFileName(params.file.name || `${now}.png`);
  const pathPrefix = params.mediaType === 'photo' ? 'entries' : 'drawings';
  const path = `${pathPrefix}/${params.entryId}/${now}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, params.file, {
      upsert: false,
      contentType: params.file.type || 'image/png',
    });

  if (uploadError) {
    return { error: `업로드에 실패했습니다: ${uploadError.message}` };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  if (!data.publicUrl) {
    return { error: '업로드 후 public URL 생성에 실패했습니다.' };
  }

  return { publicUrl: data.publicUrl };
}

export async function dataUrlToPngFile(dataUrl: string, fileName: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], fileName, { type: 'image/png' });
}
