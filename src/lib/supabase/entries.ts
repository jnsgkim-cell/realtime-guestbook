import type { GuestbookEntry, MediaType, ModerationStatus } from '@/types/guestbook';
import { supabase } from './client';

const ENTRY_COLUMNS = 'id, user_id, author_name, message, media_url, media_type, created_at, status';

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

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    return { error: `로그인 상태를 확인하지 못했습니다: ${userError.message}` };
  }

  if (!userData.user) {
    return { error: '로그인 후 방명록을 작성할 수 있습니다.' };
  }

  const { data, error } = await supabase
    .from('guestbook_entries')
    .insert({ ...input, user_id: userData.user.id, status: 'visible' })
    .select(ENTRY_COLUMNS)
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
    .select(ENTRY_COLUMNS)
    .eq('status', 'visible')
    .order('created_at', { ascending: false });

  if (error) {
    return { error: `방명록을 불러오지 못했습니다: ${error.message}` };
  }

  return { entries: data ?? [] };
}

export async function listAdminGuestbookEntries(): Promise<{ entries: GuestbookEntry[] } | { error: string }> {
  if (!supabase) {
    return { error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }

  const { data, error } = await supabase
    .from('guestbook_entries')
    .select(ENTRY_COLUMNS)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false });

  if (error) {
    return { error: `관리자 방명록 목록을 불러오지 못했습니다: ${error.message}` };
  }

  return { entries: data ?? [] };
}

export async function updateGuestbookEntryStatus(
  id: string,
  status: Exclude<ModerationStatus, 'deleted'>,
): Promise<{ entry: GuestbookEntry } | { error: string }> {
  if (!supabase) {
    return { error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }

  const { data, error } = await supabase
    .from('guestbook_entries')
    .update({
      status,
      moderated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(ENTRY_COLUMNS)
    .single();

  if (error) {
    return { error: `방명록 상태 변경에 실패했습니다: ${error.message}` };
  }

  return { entry: data };
}
