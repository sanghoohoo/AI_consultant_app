
// types/board.ts

export interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface Post {
  id: string;
  title: string;
  content: string;
  author_name: string;
  author_id: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  created_at: string;
  category_id: number;
  is_hidden: boolean;
}

export interface Comment {
  id: string;
  content: string;
  author_name: string;
  author_id: string;
  like_count: number;
  created_at: string;
  post_id: string;
  parent_comment_id?: string;
  is_hidden: boolean;
}
