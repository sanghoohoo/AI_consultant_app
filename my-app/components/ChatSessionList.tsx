import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabaseClient';

interface ChatSessionListProps {
  userId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewSession: () => void;
}

export default function ChatSessionList({ userId, selectedId, onSelect, onNewSession }: ChatSessionListProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadSessions = async () => {
    if (!userId) {
      console.log('ChatSessionList: userId가 없음');
      return;
    }
    
    try {
      console.log('ChatSessionList: 세션 목록 로딩 중... userId:', userId);
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
        
      if (error) {
        console.error('ChatSessionList: 세션 로딩 오류:', error);
        setSessions([]);
      } else {
        console.log('ChatSessionList: 로딩된 세션 수:', data?.length || 0);
        setSessions(data || []);
      }
    } catch (error) {
      console.error('ChatSessionList: 예외 발생:', error);
      setSessions([]);
    }
  };

  // 수동 새로고침 함수
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  };

  useEffect(() => {
    loadSessions();

    // 실시간 세션 업데이트 구독
    console.log('ChatSessionList: 실시간 구독 설정 중... userId:', userId);
    const subscription = supabase
      .channel(`chat_sessions_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_sessions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('ChatSessionList: 새 세션 추가됨', payload.new);
          setSessions(prev => {
            const updated = [payload.new, ...prev];
            console.log('ChatSessionList: 세션 목록 업데이트됨, 총 개수:', updated.length);
            return updated;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_sessions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('ChatSessionList: 세션 업데이트됨', payload.new);
          setSessions(prev => 
            prev.map(session => 
              session.id === payload.new.id ? payload.new : session
            )
          );
        }
      )
      .subscribe();

    console.log('ChatSessionList: 구독 상태:', subscription);

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 영역 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>채팅 목록</Text>
        <TouchableOpacity 
          style={styles.newChatButton} 
          onPress={() => {
            console.log('새 대화 버튼 클릭됨');
            onNewSession();
          }}
        >
          <Text style={styles.newChatButtonText}>+ 새 대화</Text>
        </TouchableOpacity>
      </View>

      {/* 세션 목록 */}
      <FlatList
        data={sessions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.sessionItem,
              selectedId === item.id && styles.selectedSessionItem
            ]}
            onPress={() => onSelect(item.id)}
          >
            <Text style={styles.sessionTitle} numberOfLines={2}>
              {item.summary || item.title || '새로운 대화'}
            </Text>
            <Text style={styles.sessionDate}>
              {new Date(item.updated_at).toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
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
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
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
  listContent: {
    padding: 16,
  },
  sessionItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedSessionItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  sessionDate: {
    fontSize: 12,
    color: '#666',
  },
}); 