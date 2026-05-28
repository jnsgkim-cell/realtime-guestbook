import type { Comment } from '@/types/guestbook';
import { supabase } from './client';

export async function listComments(entryId: string): Promise<{ comments: Comment[] } | { error: string }> {
  if (!supabase) {
    return { error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }

  const { data, error } = await supabase
    .from('comments')
    .select('id, entry_id, author_name, content, created_at')
    .eq('entry_id', entryId)
    .order('created_at', { ascending: true });

  if (error) {
    return { error: `댓글을 불러오지 못했습니다: ${error.message}` };
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

  const { data, error } = await supabase
    .from('comments')
    .insert(input)
    .select('id, entry_id, author_name, content, created_at')
    .single();

  if (error) {
    return { error: `댓글 저장에 실패했습니다: ${error.message}` };
  }

  return { comment: data };
}
