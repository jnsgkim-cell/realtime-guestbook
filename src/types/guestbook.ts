export type MediaType = 'photo' | 'drawing';

export interface GuestbookEntry {
  id: string;
  author_name: string;
  message: string;
  media_url: string;
  media_type: MediaType;
  created_at: string;
}

export interface Comment {
  id: string;
  entry_id: string;
  author_name: string;
  content: string;
  created_at: string;
}
