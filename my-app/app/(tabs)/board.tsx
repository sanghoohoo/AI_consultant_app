import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { useColorScheme } from '../../components/useColorScheme';

// 타입 정의
interface Category {
  id: number;
  name: string;
  description: string;
  icon: string;
  sort_order: number;
}

interface Post {
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
}

interface Comment {
  id: string;
  content: string;
  author_name: string;
  author_id: string;
  like_count: number;
  created_at: string;
  post_id: string;
  parent_comment_id?: string;
}

export default function BoardScreen() {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [showMyPosts, setShowMyPosts] = useState(false);

  // 다크모드 대응 색상 정의
  const themeColors = {
    background: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
    cardBackground: colorScheme === 'dark' ? '#2d2d2d' : '#fff',
    text: colorScheme === 'dark' ? '#fff' : '#333',
    secondaryText: colorScheme === 'dark' ? '#ccc' : '#666',
    border: colorScheme === 'dark' ? '#444' : '#e1e1e1',
    inputBackground: colorScheme === 'dark' ? '#3d3d3d' : '#fff',
    inputBorder: colorScheme === 'dark' ? '#555' : '#ddd',
    categoryActive: '#007AFF',
    categoryInactive: colorScheme === 'dark' ? '#3d3d3d' : '#e1e1e1',
    categoryActiveText: '#fff',
    categoryInactiveText: colorScheme === 'dark' ? '#ccc' : '#666',
    modalBackground: colorScheme === 'dark' ? '#2d2d2d' : '#fff',
    modalOverlay: 'rgba(0, 0, 0, 0.5)',
    likeActive: '#ff3b30',
    likeInactive: colorScheme === 'dark' ? '#666' : '#ccc',
  };

  // 카테고리 목록 가져오기
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('board_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
      
      // 첫 번째 카테고리를 기본 선택 (내가 쓴 글 모드가 아니고 아직 선택된 카테고리가 없을 때)
      if (data && data.length > 0 && !selectedCategory && !showMyPosts) {
        const firstCategoryId = data[0].id;
        setSelectedCategory(firstCategoryId);
      }
    } catch (error) {
      console.error('카테고리 가져오기 오류:', error);
    }
  };

  // 게시글 목록 가져오기
  const fetchPosts = async (categoryId?: number) => {
    if (!categoryId && !showMyPosts) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('board_posts')
        .select('*')
        .eq('is_hidden', false);

      if (showMyPosts) {
        // 내가 쓴 글만 가져오기
        query = query.eq('author_id', user?.id);
      } else {
        // 특정 카테고리 글 가져오기
        query = query.eq('category_id', categoryId);
      }

      query = query
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('게시글 가져오기 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 새 게시글 작성
  const createPost = async () => {
    if (!user || !selectedCategory) {
      Alert.alert('오류', '로그인이 필요합니다.');
      return;
    }

    if (!newPost.title.trim() || !newPost.content.trim()) {
      Alert.alert('오류', '제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      const { error } = await supabase
        .from('board_posts')
        .insert({
          title: newPost.title.trim(),
          content: newPost.content.trim(),
          category_id: selectedCategory,
          author_id: user.id,
          author_name: user.email?.split('@')[0] || '익명'
        });

      if (error) throw error;

      Alert.alert('성공', '게시글이 작성되었습니다.');
      setShowWriteModal(false);
      setNewPost({ title: '', content: '' });
      fetchPosts(selectedCategory);
    } catch (error) {
      console.error('게시글 작성 오류:', error);
      Alert.alert('오류', '게시글 작성에 실패했습니다.');
    }
  };

  // 조회수 증가
  const incrementViewCount = async (postId: string) => {
    try {
      await supabase
        .from('board_views')
        .insert({
          post_id: postId,
          user_id: user?.id,
          ip_address: null // 실제 앱에서는 IP 주소를 가져올 수 없으므로 null
        });
    } catch (error) {
      // 중복 조회는 무시
      console.log('조회수 증가:', error);
    }
  };

  // 게시글 상세보기
  const openPostDetail = async (post: Post) => {
    setSelectedPost(post);
    setShowDetailModal(true);
    incrementViewCount(post.id);
    await fetchComments(post.id);
    await checkUserLikes(post.id);
  };

  // 댓글 목록 가져오기
  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('board_comments')
        .select('*')
        .eq('post_id', postId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('댓글 가져오기 오류:', error);
    }
  };

  // 댓글 작성
  const createComment = async () => {
    if (!user || !selectedPost || !newComment.trim()) {
      Alert.alert('오류', '댓글 내용을 입력해주세요.');
      return;
    }

    try {
      const { error } = await supabase
        .from('board_comments')
        .insert({
          content: newComment.trim(),
          post_id: selectedPost.id,
          author_id: user.id,
          author_name: user.email?.split('@')[0] || '익명'
        });

      if (error) throw error;

      setNewComment('');
      await fetchComments(selectedPost.id);
      // 게시글의 댓글 수 업데이트
      await fetchPosts(selectedCategory!);
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      Alert.alert('오류', '댓글 작성에 실패했습니다.');
    }
  };

  // 사용자 좋아요 상태 확인
  const checkUserLikes = async (postId: string) => {
    if (!user) return;

    try {
      // 게시글 좋아요 상태
      const { data: postLikes } = await supabase
        .from('board_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .not('post_id', 'is', null);

      // 댓글 좋아요 상태
      const { data: commentLikes } = await supabase
        .from('board_likes')
        .select('comment_id')
        .eq('user_id', user.id)
        .not('comment_id', 'is', null);

      setLikedPosts(new Set(postLikes?.map(like => like.post_id) || []));
      setLikedComments(new Set(commentLikes?.map(like => like.comment_id) || []));
    } catch (error) {
      console.error('좋아요 상태 확인 오류:', error);
    }
  };

  // 게시글 좋아요/취소
  const togglePostLike = async (postId: string) => {
    if (!user) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }

    const isLiked = likedPosts.has(postId);

    try {
      if (isLiked) {
        // 좋아요 취소
        const { error } = await supabase
          .from('board_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (error) throw error;

        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });
      } else {
        // 좋아요 추가
        const { error } = await supabase
          .from('board_likes')
          .insert({
            user_id: user.id,
            post_id: postId,
            comment_id: null
          });

        if (error) throw error;

        setLikedPosts(prev => new Set(prev).add(postId));
      }

      // 게시글 목록 새로고침
      await fetchPosts(selectedCategory!);
      
      // 상세보기에서 선택된 게시글 업데이트
      if (selectedPost && selectedPost.id === postId) {
        const { data: updatedPost } = await supabase
          .from('board_posts')
          .select('*')
          .eq('id', postId)
          .single();
        
        if (updatedPost) {
          setSelectedPost(updatedPost);
        }
      }
    } catch (error) {
      console.error('좋아요 처리 오류:', error);
      Alert.alert('오류', '좋아요 처리에 실패했습니다.');
    }
  };

  // 댓글 좋아요/취소
  const toggleCommentLike = async (commentId: string) => {
    if (!user) {
      Alert.alert('알림', '로그인이 필요합니다.');
      return;
    }

    const isLiked = likedComments.has(commentId);

    try {
      if (isLiked) {
        // 좋아요 취소
        const { error } = await supabase
          .from('board_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('comment_id', commentId);

        if (error) throw error;

        setLikedComments(prev => {
          const newSet = new Set(prev);
          newSet.delete(commentId);
          return newSet;
        });
      } else {
        // 좋아요 추가
        const { error } = await supabase
          .from('board_likes')
          .insert({
            user_id: user.id,
            post_id: null,
            comment_id: commentId
          });

        if (error) throw error;

        setLikedComments(prev => new Set(prev).add(commentId));
      }

      // 댓글 목록 새로고침
      if (selectedPost) {
        await fetchComments(selectedPost.id);
      }
    } catch (error) {
      console.error('댓글 좋아요 처리 오류:', error);
      Alert.alert('오류', '좋아요 처리에 실패했습니다.');
    }
  };

  // 게시글 삭제
  const deletePost = async (postId: string, authorId: string) => {
    if (!user || user.id !== authorId) {
      Alert.alert('오류', '본인이 작성한 게시글만 삭제할 수 있습니다.');
      return;
    }

    Alert.alert(
      '게시글 삭제',
      '정말로 이 게시글을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('board_posts')
                .update({ is_hidden: true })
                .eq('id', postId);

              if (error) throw error;

              Alert.alert('성공', '게시글이 삭제되었습니다.');
              
              // 상세 모달이 열려있다면 닫기
              if (showDetailModal && selectedPost?.id === postId) {
                setShowDetailModal(false);
                setSelectedPost(null);
                setComments([]);
                setNewComment('');
              }
              
              // 목록 새로고침
              if (showMyPosts) {
                await fetchPosts();
              } else {
                await fetchPosts(selectedCategory!);
              }
            } catch (error) {
              console.error('게시글 삭제 오류:', error);
              Alert.alert('오류', '게시글 삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  // 댓글 삭제
  const deleteComment = async (commentId: string, authorId: string) => {
    if (!user || user.id !== authorId) {
      Alert.alert('오류', '본인이 작성한 댓글만 삭제할 수 있습니다.');
      return;
    }

    Alert.alert(
      '댓글 삭제',
      '정말로 이 댓글을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('board_comments')
                .update({ is_hidden: true })
                .eq('id', commentId);

              if (error) throw error;

              Alert.alert('성공', '댓글이 삭제되었습니다.');
              
              // 댓글 목록 새로고침
              if (selectedPost) {
                await fetchComments(selectedPost.id);
              }
              
              // 게시글 목록도 새로고침 (댓글 수 업데이트)
              if (showMyPosts) {
                await fetchPosts();
              } else {
                await fetchPosts(selectedCategory!);
              }
            } catch (error) {
              console.error('댓글 삭제 오류:', error);
              Alert.alert('오류', '댓글 삭제에 실패했습니다.');
            }
          }
        }
      ]
    );
  };

  // 새로고침
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCategories();
    if (selectedCategory || showMyPosts) {
      await fetchPosts(selectedCategory || undefined);
    }
    setRefreshing(false);
  };

  // 사용자의 모든 좋아요 상태 로드
  const loadUserLikes = async () => {
    if (!user) return;

    try {
      const { data: likes } = await supabase
        .from('board_likes')
        .select('post_id, comment_id')
        .eq('user_id', user.id);

      if (likes) {
        const postLikes = new Set(
          likes.filter(like => like.post_id !== null).map(like => like.post_id)
        );
        const commentLikes = new Set(
          likes.filter(like => like.comment_id !== null).map(like => like.comment_id)
        );
        
        setLikedPosts(postLikes);
        setLikedComments(commentLikes);
      }
    } catch (error) {
      console.error('좋아요 상태 로드 오류:', error);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await fetchCategories();
      if (user) {
        await loadUserLikes();
      }
    };
    initializeData();
  }, [user]);

  useEffect(() => {
    if (selectedCategory || showMyPosts) {
      fetchPosts(selectedCategory || undefined);
    }
  }, [selectedCategory, showMyPosts]);

  // 게시글 아이템 렌더링
  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity
      style={[
        styles.postItem, 
        { backgroundColor: themeColors.cardBackground, borderBottomColor: themeColors.border },
        item.is_pinned && styles.pinnedPost
      ]}
      onPress={() => openPostDetail(item)}
      activeOpacity={0.7}
    >
      <View style={styles.postHeader}>
        <View style={styles.postTitleContainer}>
          {item.is_pinned && (
            <Text style={styles.pinnedBadge}>📌</Text>
          )}
          <Text style={[styles.postTitle, { color: themeColors.text }]} numberOfLines={2}>{item.title}</Text>
        </View>
      </View>
      <Text style={[styles.postContentText, { color: themeColors.secondaryText }]} numberOfLines={3}>{item.content}</Text>
      <View style={styles.postFooter}>
        <Text style={[styles.postAuthor, { color: themeColors.secondaryText }]}>{item.author_name}</Text>
        <View style={styles.postStats}>
          <Text style={[styles.postStat, { marginLeft: 0, color: themeColors.secondaryText }]}>👁 {item.view_count}</Text>
          <Text style={[styles.postStat, { color: themeColors.secondaryText }]}>💬 {item.comment_count}</Text>
          <Text style={[styles.postStat, { color: themeColors.secondaryText }]}>❤️ {item.like_count}</Text>
        </View>
      </View>
      <Text style={[styles.postDate, { color: themeColors.secondaryText }]}>
        {new Date(item.created_at).toLocaleString('ko-KR')}
      </Text>
    </TouchableOpacity>
  );



  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* 카테고리 탭 */}
      <View style={[styles.categoryContainer, { backgroundColor: themeColors.cardBackground, borderBottomColor: themeColors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.categoryList}>
            {/* 내가 쓴 글 토글 */}
            <TouchableOpacity
              style={[
                styles.categoryTab,
                styles.myPostsTab,
                { 
                  backgroundColor: showMyPosts ? themeColors.categoryActive : themeColors.categoryInactive,
                  borderColor: themeColors.border 
                }
              ]}
              onPress={() => {
                setShowMyPosts(!showMyPosts);
                if (!showMyPosts) {
                  setSelectedCategory(null);
                }
              }}
            >
              <Text style={styles.categoryIcon}>📝</Text>
              <Text style={[
                styles.categoryName,
                { color: showMyPosts ? themeColors.categoryActiveText : themeColors.categoryInactiveText }
              ]}>
                내가 쓴 글
              </Text>
            </TouchableOpacity>
            
            {/* 카테고리 목록 */}
            {categories.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.categoryTab,
                  { 
                    backgroundColor: (selectedCategory === item.id && !showMyPosts) ? themeColors.categoryActive : themeColors.categoryInactive,
                    borderColor: themeColors.border 
                  }
                ]}
                onPress={() => {
                  setSelectedCategory(item.id);
                  setShowMyPosts(false);
                }}
              >
                <Text style={styles.categoryIcon}>{item.icon}</Text>
                <Text style={[
                  styles.categoryName,
                  { color: (selectedCategory === item.id && !showMyPosts) ? themeColors.categoryActiveText : themeColors.categoryInactiveText }
                ]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 게시글 목록 */}
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.postList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: themeColors.text }]}>
              {showMyPosts ? '작성한 게시글이 없습니다.' : '게시글이 없습니다.'}
            </Text>
            <Text style={[styles.emptySubText, { color: themeColors.secondaryText }]}>
              {showMyPosts ? '첫 번째 게시글을 작성해보세요!' : '첫 번째 게시글을 작성해보세요!'}
            </Text>
          </View>
        )}
      />

      {/* 글쓰기 버튼 */}
      <TouchableOpacity
        style={styles.writeButton}
        onPress={() => setShowWriteModal(true)}
      >
        <Text style={styles.writeButtonText}>✏️</Text>
      </TouchableOpacity>

      {/* 글쓰기 모달 */}
      <Modal
        visible={showWriteModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.modalBackground }]}>
          <View style={[styles.modalHeader, { backgroundColor: themeColors.modalBackground, borderBottomColor: themeColors.border }]}>
            <TouchableOpacity
              onPress={() => setShowWriteModal(false)}
              style={styles.modalButton}
            >
              <Text style={[styles.modalButtonText, { color: themeColors.text }]}>취소</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>새 게시글</Text>
            <TouchableOpacity
              onPress={createPost}
              style={styles.modalButton}
            >
              <Text style={[styles.modalButtonText, styles.submitButton]}>등록</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={[styles.modalContent, { backgroundColor: themeColors.modalBackground }]}>
            <TextInput
              style={[
                styles.titleInput,
                { 
                  backgroundColor: themeColors.inputBackground,
                  borderColor: themeColors.inputBorder,
                  color: themeColors.text
                }
              ]}
              placeholder="제목을 입력하세요"
              placeholderTextColor={themeColors.secondaryText}
              value={newPost.title}
              onChangeText={(text) => setNewPost(prev => ({ ...prev, title: text }))}
              multiline={false}
            />
            <TextInput
              style={[
                styles.contentInput,
                { 
                  backgroundColor: themeColors.inputBackground,
                  borderColor: themeColors.inputBorder,
                  color: themeColors.text
                }
              ]}
              placeholder="내용을 입력하세요"
              placeholderTextColor={themeColors.secondaryText}
              value={newPost.content}
              onChangeText={(text) => setNewPost(prev => ({ ...prev, content: text }))}
              multiline
              textAlignVertical="top"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* 게시글 상세보기 모달 */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: themeColors.modalBackground }]}>
          <View style={[styles.modalHeader, { backgroundColor: themeColors.modalBackground, borderBottomColor: themeColors.border }]}>
            <TouchableOpacity
              onPress={() => {
                setShowDetailModal(false);
                setSelectedPost(null);
                setComments([]);
                setNewComment('');
              }}
              style={styles.modalButton}
            >
              <Text style={[styles.modalButtonText, { color: themeColors.text }]}>닫기</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>게시글</Text>
            {selectedPost && user?.id === selectedPost.author_id ? (
              <TouchableOpacity
                onPress={() => deletePost(selectedPost.id, selectedPost.author_id)}
                style={styles.modalButton}
              >
                <Text style={[styles.modalButtonText, styles.deleteText]}>삭제</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.modalButton} />
            )}
          </View>

          {selectedPost && (
            <ScrollView style={[styles.modalContent, { backgroundColor: themeColors.modalBackground }]}>
              <View style={styles.postDetailContainer}>
                {selectedPost.is_pinned && (
                  <Text style={styles.pinnedBadge}>📌 공지</Text>
                )}
                <Text style={[styles.postDetailTitle, { color: themeColors.text }]}>{selectedPost.title}</Text>
                
                <View style={styles.postDetailInfo}>
                  <Text style={[styles.postDetailAuthor, { color: themeColors.secondaryText }]}>{selectedPost.author_name}</Text>
                  <Text style={[styles.postDetailDate, { color: themeColors.secondaryText }]}>
                    {new Date(selectedPost.created_at).toLocaleString('ko-KR')}
                  </Text>
                </View>

                <View style={styles.postDetailStats}>
                  <Text style={[styles.postDetailStat, { color: themeColors.secondaryText }]}>👁 {selectedPost.view_count}</Text>
                  <Text style={[styles.postDetailStat, { color: themeColors.secondaryText }]}>💬 {selectedPost.comment_count}</Text>
                  <Text style={[styles.postDetailStat, { color: themeColors.secondaryText }]}>❤️ {selectedPost.like_count}</Text>
                </View>

                <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                
                <Text style={[styles.postDetailContent, { color: themeColors.text }]}>{selectedPost.content}</Text>

                {/* 댓글 섹션 */}
                <View style={styles.commentsSection}>
                  {/* 좋아요 버튼 */}
                  <View style={styles.postActions}>
                    <TouchableOpacity 
                      onPress={() => togglePostLike(selectedPost.id)}
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: likedPosts.has(selectedPost.id) 
                            ? (colorScheme === 'dark' ? '#4a0e0e' : '#FFE8E8')
                            : themeColors.inputBackground,
                          borderColor: likedPosts.has(selectedPost.id) 
                            ? (colorScheme === 'dark' ? '#dc2626' : '#FFB6B6')
                            : themeColors.inputBorder
                        }
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.actionButtonIcon,
                        likedPosts.has(selectedPost.id) && styles.likeActionButtonIconActive
                      ]}>
                        {likedPosts.has(selectedPost.id) ? '❤️' : '🤍'}
                      </Text>
                      <Text style={[
                        styles.actionButtonText,
                        { color: themeColors.text },
                        likedPosts.has(selectedPost.id) && styles.likeActionButtonTextActive
                      ]}>
                        좋아요
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  {/* 댓글 작성 */}
                  <View style={[styles.commentInputContainer, { backgroundColor: themeColors.modalBackground }]}>
                    <TextInput
                      style={[
                        styles.commentInput,
                        { 
                          backgroundColor: themeColors.inputBackground,
                          borderColor: themeColors.inputBorder,
                          color: themeColors.text
                        }
                      ]}
                      placeholder="댓글을 입력하세요..."
                      placeholderTextColor={themeColors.secondaryText}
                      value={newComment}
                      onChangeText={setNewComment}
                      multiline
                    />
                    <TouchableOpacity
                      style={[
                        styles.commentSubmitButton,
                        !newComment.trim() && { backgroundColor: themeColors.border }
                      ]}
                      onPress={createComment}
                      disabled={!newComment.trim()}
                    >
                      <Text style={[
                        styles.commentSubmitText,
                        !newComment.trim() && { color: themeColors.secondaryText }
                      ]}>
                        등록
                      </Text>
                    </TouchableOpacity>
                  </View>

                                     {/* 댓글 목록 */}
                   {comments.map((comment) => (
                     <View key={comment.id} style={[styles.commentItem, { backgroundColor: themeColors.cardBackground }]}>
                       <View style={styles.commentHeader}>
                         <Text style={[styles.commentAuthor, { color: themeColors.text }]}>{comment.author_name}</Text>
                         <View style={styles.commentActions}>
                           <Text style={[styles.commentDate, { color: themeColors.secondaryText }]}>
                             {new Date(comment.created_at).toLocaleString('ko-KR')}
                           </Text>
                           {user?.id === comment.author_id && (
                             <TouchableOpacity
                               onPress={() => deleteComment(comment.id, comment.author_id)}
                               style={[styles.commentDeleteButton, { backgroundColor: themeColors.likeActive }]}
                             >
                               <Text style={styles.commentDeleteText}>삭제</Text>
                             </TouchableOpacity>
                           )}
                         </View>
                       </View>
                       <Text style={[styles.commentContent, { color: themeColors.text }]}>{comment.content}</Text>
                       <View style={styles.commentFooter}>
                         <TouchableOpacity
                           onPress={() => toggleCommentLike(comment.id)}
                           style={styles.commentLikeButton}
                           activeOpacity={0.7}
                         >
                           <Text style={[
                             styles.commentLikeCount,
                             { color: themeColors.secondaryText },
                             likedComments.has(comment.id) && { color: themeColors.likeActive, fontWeight: '600' }
                           ]}>
                             {likedComments.has(comment.id) ? '❤️' : '🤍'} {comment.like_count}
                           </Text>
                         </TouchableOpacity>
                       </View>
                     </View>
                   ))}

                  {comments.length === 0 && (
                    <Text style={[styles.noComments, { color: themeColors.secondaryText }]}>첫 번째 댓글을 작성해보세요!</Text>
                  )}
                </View>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  categoryContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  categoryList: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  selectedCategoryTab: {
    backgroundColor: '#007AFF',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  selectedCategoryName: {
    color: 'white',
  },
  postList: {
    padding: 16,
  },
  postItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pinnedPost: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pinnedBadge: {
    fontSize: 14,
    marginRight: 6,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  postContentText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  postAuthor: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStat: {
    fontSize: 12,
    color: '#999',
    marginLeft: 12,
  },
  postDate: {
    fontSize: 11,
    color: '#bbb',
    textAlign: 'right',
  },
  writeButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  writeButtonText: {
    fontSize: 24,
    color: 'white',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  modalButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  modalButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  submitButton: {
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  contentInput: {
    fontSize: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    minHeight: 200,
  },
  postDetailContainer: {
    padding: 16,
  },
  postDetailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    lineHeight: 32,
  },
  postDetailInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  postDetailAuthor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  postDetailDate: {
    fontSize: 14,
    color: '#666',
  },
  postDetailStats: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  postDetailStat: {
    fontSize: 14,
    color: '#666',
    marginRight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 16,
  },
  postDetailContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 24,
  },
  postActions: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  likeActionButton: {
    backgroundColor: '#f8f8f8',
  },
  likeActionButtonActive: {
    backgroundColor: '#FFE8E8',
    borderColor: '#FFB6B6',
  },
  actionButtonIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  likeActionButtonIconActive: {
    // 아이콘 스타일은 이모지로 처리되므로 추가 스타일 불필요
  },
  likeActionButtonTextActive: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  commentsSection: {
    marginTop: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  commentInputContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    maxHeight: 100,
    backgroundColor: '#f8f8f8',
  },
  commentSubmitButton: {
    marginLeft: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  commentSubmitText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  commentSubmitDisabled: {
    color: '#ccc',
  },
  commentSubmitButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
  commentItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
  },
  commentContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 8,
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  commentLikeButton: {
    padding: 4,
  },
  commentLikeCount: {
    fontSize: 12,
    color: '#666',
  },
  commentLikeCountActive: {
    color: '#FF6B6B',
    fontWeight: '600',
  },
  noComments: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 20,
    marginBottom: 20,
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF6B6B',
    borderRadius: 16,
    marginLeft: 8,
    opacity: 0.8,
  },
  deleteButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  deleteText: {
    color: '#FF6B6B',
  },
  myPostsTab: {
    backgroundColor: '#E8F4FD',
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentDeleteButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    opacity: 0.8,
  },
  commentDeleteText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
    emptySubText: {
    fontSize: 14,
    color: '#999',
  },
});