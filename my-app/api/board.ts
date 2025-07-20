
import { supabase } from '../lib/supabaseClient';
import { Post, Comment } from '../types/board';

// 카테고리 목록 가져오기
export const fetchCategoriesAPI = async () => {
  const { data, error } = await supabase
    .from('board_categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data || [];
};

// 게시글 목록 가져오기
export const fetchPostsAPI = async (categoryId: number | null, userId?: string) => {
  let query = supabase
    .from('board_posts')
    .select('*')
    .eq('is_hidden', false);

  if (userId) {
    query = query.eq('author_id', userId);
  } else if (categoryId) {
    query = query.eq('category_id', categoryId);
  } else {
    return []; // 카테고리나 유저 ID가 없으면 빈 배열 반환
  }

  const { data, error } = await query
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

// 게시글 작성하기
export const createPostAPI = async (post: Omit<Post, 'id' | 'created_at' | 'view_count' | 'like_count' | 'comment_count'>) => {
  const { error } = await supabase.from('board_posts').insert(post);
  if (error) throw error;
};

// 댓글 목록 가져오기
export const fetchCommentsAPI = async (postId: string) => {
  const { data, error } = await supabase
    .from('board_comments')
    .select('*')
    .eq('post_id', postId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

// 댓글 작성하기
export const createCommentAPI = async (comment: Omit<Comment, 'id' | 'created_at' | 'like_count'>) => {
  const { error } = await supabase.from('board_comments').insert(comment);
  if (error) throw error;
};

// 게시글 또는 댓글 좋아요 토글
export const toggleLikeAPI = async (userId: string, postId?: string, commentId?: string) => {
  const existingLike = await supabase
    .from('board_likes')
    .select('id')
    .eq('user_id', userId)
    .or(`post_id.eq.${postId},comment_id.eq.${commentId}`)
    .single();

  if (existingLike.data) {
    // 좋아요 취소
    const { error } = await supabase.from('board_likes').delete().eq('id', existingLike.data.id);
    if (error) throw error;
  } else {
    // 좋아요 추가
    const { error } = await supabase.from('board_likes').insert({ user_id: userId, post_id: postId, comment_id: commentId });
    if (error) throw error;
  }
};

// 게시글 삭제 (숨김 처리)
export const deletePostAPI = async (postId: string) => {
  const { error } = await supabase.from('board_posts').update({ is_hidden: true }).eq('id', postId);
  if (error) throw error;
};

// 댓글 삭제 (숨김 처리)
export const deleteCommentAPI = async (commentId: string) => {
  const { error } = await supabase.from('board_comments').update({ is_hidden: true }).eq('id', commentId);
  if (error) throw error;
};
