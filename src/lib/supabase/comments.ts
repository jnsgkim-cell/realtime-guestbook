import type { Comment, ModerationStatus } from '@/types/guestbook';
import { supabase } from './client';

const COMMENT_COLUMNS = 'id, entry_id, user_id, author_name, content, created_at, status';

export async function listComments(entryId: string): Promise<{ comments: Comment[] } | { error: string }> {
  if (!supabase) {
    return { error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }

  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_COLUMNS)
    .eq('entry_id', entryId)
    .eq('status', 'visible')
    .order('created_at', { ascending: true });

  if (error) {
    return { error: `댓글을 불러오지 못했습니다: ${error.message}` };
  }

  return { comments: data ?? [] };
}

export async function listAdminComments(entryId: string): Promise<{ comments: Comment[] } | { error: string }> {
  if (!supabase) {
    return { error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }

  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_COLUMNS)
    .eq('entry_id', entryId)
    .neq('status', 'deleted')
    .order('created_at', { ascending: true });

  if (error) {
    return { error: `관리자 댓글 목록을 불러오지 못했습니다: ${error.message}` };
  }

  return { comments: data ?? [] };
}

export async function createComment(input: {
  entry_id: string;
  author_name: string;
  content: string;
}): Promise<{ comment: Comment } | { error: string }> {
  if (!supabase) {
    return { error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    return { error: `로그인 상태를 확인하지 못했습니다: ${userError.message}` };
  }

  if (!userData.user) {
    return { error: '로그인 후 댓글을 작성할 수 있습니다.' };
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({ ...input, user_id: userData.user.id, status: 'visible' })
    .select(COMMENT_COLUMNS)
    .single();

  if (error) {
    return { error: `댓글 저장에 실패했습니다: ${error.message}` };
  }

  return { comment: data };
}

export async function updateCommentStatus(
  id: string,
  status: Exclude<ModerationStatus, 'deleted'>,
): Promise<{ comment: Comment } | { error: string }> {
  if (!supabase) {
    return { error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }

  const { data, error } = await supabase
    .from('comments')
    .update({
      status,
      moderated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select(COMMENT_COLUMNS)
    .single();

  if (error) {
    return { error: `댓글 상태 변경에 실패했습니다: ${error.message}` };
  }

  return { comment: data };
}
