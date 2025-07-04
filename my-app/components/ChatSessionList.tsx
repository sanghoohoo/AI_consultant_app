import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { supabase } from '../lib/supabaseClient';

interface ChatSessionListProps {
  userId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewSession: () => void;
  onDelete?: (id: string) => void;
  drawerOpen?: boolean;
}

export default function ChatSessionList({ userId, selectedId, onSelect, onNewSession, onDelete, drawerOpen }: ChatSessionListProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  // 세션 삭제 함수
  const deleteSession = async (sessionId: string) => {
    try {
      console.log('세션 삭제 시작:', sessionId);
      
      // 1. 해당 세션의 모든 메시지 삭제
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId);

      if (messagesError) {
        console.error('메시지 삭제 오류:', messagesError);
        throw messagesError;
      }

      // 2. 세션 삭제
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (sessionError) {
        console.error('세션 삭제 오류:', sessionError);
        throw sessionError;
      }

      console.log('세션 삭제 완료:', sessionId);
      
      // 3. 로컬 상태에서도 제거
      setSessions(prev => prev.filter(session => session.id !== sessionId));
      
      // 4. 부모 컴포넌트에 삭제 알림
      onDelete?.(sessionId);
      
    } catch (error) {
      console.error('세션 삭제 실패:', error);
      Alert.alert('오류', '세션 삭제에 실패했습니다.');
    }
  };

  // 모든 스와이프를 닫는 함수
  const closeAllSwipeables = () => {
    swipeableRefs.current.forEach((swipeable) => {
      swipeable?.close();
    });
  };

  // 특정 스와이프를 닫는 함수
  const closeSwipeable = (sessionId: string) => {
    const swipeable = swipeableRefs.current.get(sessionId);
    swipeable?.close();
  };

  // 삭제 확인 함수
  const confirmDelete = (sessionId: string, sessionTitle: string) => {
    Alert.alert(
      '대화 삭제',
      `"${sessionTitle || '제목 없음'}" 대화를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`,
      [
        {
          text: '취소',
          style: 'cancel',
          onPress: () => closeSwipeable(sessionId),
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            deleteSession(sessionId);
            closeSwipeable(sessionId);
          },
        },
      ]
    );
  };

  // 스와이프 시 나타날 삭제 버튼 렌더링
  const renderLeftActions = (sessionId: string, sessionTitle: string) => {
    return (
      <View style={styles.deleteActionContainer}>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => confirmDelete(sessionId, sessionTitle)}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteActionText}>삭제</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 세션 목록 로드
  const loadSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
        setSessions(data || []);
    } catch (error) {
      console.error('세션 로드 오류:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return `오늘 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 2) {
      return `어제 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `${date.getMonth() + 1}월 ${date.getDate()}일 ${date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  useEffect(() => {
    if (userId) {
    loadSessions();
    }
  }, [userId]);

  // drawer가 닫힐 때 모든 스와이프 닫기
  useEffect(() => {
    if (drawerOpen === false) {
      closeAllSwipeables();
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!userId) return;

    // 실시간 구독 설정
    const subscription = supabase
      .channel('chat_sessions_changes')
      .on('postgres_changes', {
        event: '*',
          schema: 'public',
          table: 'chat_sessions',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        console.log('세션 변경 감지:', payload);
        loadSessions(); // 변경 시 목록 새로고침
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [userId]);

  const renderSessionItem = ({ item }: { item: any }) => (
    <Swipeable
      ref={(ref) => {
        if (ref) {
          swipeableRefs.current.set(item.id, ref);
        } else {
          swipeableRefs.current.delete(item.id);
        }
      }}
      renderLeftActions={() => renderLeftActions(item.id, item.summary || item.title || '새 대화')}
      leftThreshold={80}
      friction={1.5}
      overshootLeft={false}
      overshootFriction={8}
      enableTrackpadTwoFingerGesture={false}
      shouldCancelWhenOutside={true}
      onSwipeableWillOpen={() => {
        // 다른 스와이프가 열릴 때 기존 열린 것들을 닫기
        swipeableRefs.current.forEach((swipeable, id) => {
          if (id !== item.id) {
            swipeable?.close();
          }
        });
      }}
    >
      <Pressable
        style={({ pressed }) => [
          styles.sessionItem,
          selectedId === item.id && styles.selectedItem,
          pressed && styles.pressedItem,
        ]}
        onPress={() => {
          closeAllSwipeables();
          onSelect(item.id);
        }}
      >
        <View style={styles.sessionContent}>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {item.summary || item.title || '새 대화'}
          </Text>
          <Text style={styles.sessionDate}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </Pressable>
    </Swipeable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>대화 기록</Text>
        <TouchableOpacity style={styles.newChatButton} onPress={onNewSession}>
          <Text style={styles.newChatButtonText}>+ 새 대화</Text>
        </TouchableOpacity>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>대화 기록이 없습니다</Text>
        </View>
      ) : (
      <FlatList
        data={sessions}
        renderItem={renderSessionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={loadSessions}
        onScrollBeginDrag={closeAllSwipeables}
        scrollEventThrottle={16}
        directionalLockEnabled={true}
        alwaysBounceVertical={false}
        keyboardShouldPersistTaps="handled"
      />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  newChatButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  newChatButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 8,
  },
  sessionItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 4,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedItem: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  pressedItem: {
    transform: [{ scale: 0.98 }],
  },
  sessionContent: {
    padding: 16,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  sessionDate: {
    fontSize: 14,
    color: '#666',
  },
  deleteActionContainer: {
    width: 90,
    marginVertical: 4,
    marginLeft: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  deleteAction: {
    backgroundColor: '#ff4757',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
    paddingHorizontal: 12,
  },
  deleteActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
}); 