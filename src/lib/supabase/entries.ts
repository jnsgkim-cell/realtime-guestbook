import type { GuestbookEntry, MediaType } from '@/types/guestbook';
import { supabase } from './client';

export async function createGuestbookEntry(input: {
  id: string;
  author_name: string;
  message: string;
  media_url: string;
  media_type: MediaType;
}): Promise<{ entry: GuestbookEntry } | { error: string }> {
  if (!supabase) {
    return { error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }

  const { data, error } = await supabase
    .from('guestbook_entries')
    .insert(input)
    .select('id, author_name, message, media_url, media_type, created_at')
    .single();

  if (error) {
    return { error: `방명록 저장에 실패했습니다: ${error.message}` };
  }

  return { entry: data };
}

export async function listGuestbookEntries(): Promise<{ entries: GuestbookEntry[] } | { error: string }> {
  if (!supabase) {
    return { error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }

  const { data, error } = await supabase
    .from('guestbook_entries')
    .select('id, author_name, message, media_url, media_type, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return { error: `방명록을 불러오지 못했습니다: ${error.message}` };
  }

  return { entries: data ?? [] };
}
