export type MediaType = 'photo' | 'drawing';
export type ModerationStatus = 'visible' | 'hidden' | 'deleted';
export type UserRole = 'user' | 'admin';

export interface GuestbookEntry {
  id: string;
  user_id?: string | null;
  author_name: string;
  message: string;
  media_url: string;
  media_type: MediaType;
  created_at: string;
  status?: ModerationStatus;
}

export interface Comment {
  id: string;
  entry_id: string;
  user_id?: string | null;
  author_name: string;
  content: string;
  created_at: string;
  status?: ModerationStatus;
}

export interface Profile {
  id: string;
  role: UserRole;
  created_at: string;
}
