import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types/guestbook';
import { supabase } from './client';

export async function signUpVisitor(email: string, password: string): Promise<{ user: User | null; needsConfirmation: boolean } | { error: string }> {
  if (!supabase) {
    return { error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return { error: `회원가입에 실패했습니다: ${error.message}` };
  }

  return {
    user: data.user,
    needsConfirmation: Boolean(data.user && !data.session),
  };
}

export async function signInVisitor(email: string, password: string): Promise<{ user: User } | { error: string }> {
  if (!supabase) {
    return { error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: `로그인에 실패했습니다: ${error.message}` };
  }

  if (!data.user) {
    return { error: '로그인 사용자를 확인하지 못했습니다.' };
  }

  return { user: data.user };
}

export async function signInAdmin(email: string, password: string): Promise<{ ok: true } | { error: string }> {
  const result = await signInVisitor(email, password);

  if ('error' in result) {
    return result;
  }

  return { ok: true };
}

export async function signOutUser(): Promise<{ ok: true } | { error: string }> {
  if (!supabase) {
    return { error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: `로그아웃에 실패했습니다: ${error.message}` };
  }

  return { ok: true };
}

export const signOutAdmin = signOutUser;

export async function getCurrentUser(): Promise<{ user: User | null } | { error: string }> {
  if (!supabase) {
    return { error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return { error: `사용자 정보를 확인하지 못했습니다: ${error.message}` };
  }

  return { user: data.user };
}

export async function getCurrentProfile(): Promise<{ profile: Profile | null } | { error: string }> {
  if (!supabase) {
    return { error: 'Supabase 환경변수가 설정되지 않았습니다.' };
  }

  const userResult = await getCurrentUser();

  if ('error' in userResult) {
    return userResult;
  }

  if (!userResult.user) {
    return { profile: null };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, created_at')
    .eq('id', userResult.user.id)
    .single();

  if (error) {
    return { error: `프로필을 불러오지 못했습니다: ${error.message}` };
  }

  return { profile: data };
}
