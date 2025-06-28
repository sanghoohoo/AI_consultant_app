import React, { useEffect, useState, useRef } from 'react';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Keyboard
} from 'react-native';
import { supabase } from '../../lib/supabaseClient';
import ChatSessionList from '../../components/ChatSessionList';

const Drawer = createDrawerNavigator();

interface Message {
  id: string;
  session_id: string;
  content: string;
  sender: 'user' | 'assistant';
  created_at: string;
  timestamp?: number;
}

interface CustomDrawerContentProps extends DrawerContentComponentProps {
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string | null) => void;
  userId: string | null;
}

function CustomDrawerContent({
  navigation,
  selectedSessionId,
  setSelectedSessionId,
  userId,
}: CustomDrawerContentProps) {
  return (
    <View style={{ flex: 1 }}>
      <ChatSessionList
        userId={userId ?? ''}
        selectedId={selectedSessionId}
        onSelect={(id) => {
          setSelectedSessionId(id);
          navigation.closeDrawer();
        }}
        onNewSession={async () => {
          try {
            console.log('새 세션 생성 시작... userId:', userId);
            const { data, error } = await supabase
              .from('chat_sessions')
              .insert([{ user_id: userId ?? '' }])
              .select()
              .single();
              
            if (error) {
              console.error('새 세션 생성 오류:', error);
              return;
            }
            
            if (data) {
              console.log('새 세션 생성 성공:', data.id);
              setSelectedSessionId(data.id);
              navigation.closeDrawer();
            }
          } catch (error) {
            console.error('새 세션 생성 예외:', error);
          }
        }}
      />
    </View>
  );
}

function ChatScreen({ sessionId }: { sessionId: string | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // 메시지 로드
  const loadMessages = async () => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('메시지 로드 오류:', error);
    }
  };

  // 세션 변경 시 메시지 로드
  useEffect(() => {
    loadMessages();
  }, [sessionId]);

  // 실시간 메시지 업데이트 구독
  useEffect(() => {
    if (!sessionId) return;

    const subscription = supabase
      .channel(`chat_messages:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);

  // 키보드 이벤트 처리
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      // 키보드가 나타나면 스크롤을 맨 아래로
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // 새 메시지가 추가되면 스크롤을 맨 아래로
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // WebSocket을 통한 스트리밍 메시지 전송
  const sendStreamingMessage = () => {
    if (!inputText.trim() || !sessionId || isLoading) return;

    const userMessage = inputText.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      session_id: sessionId,
      content: userMessage,
      sender: 'user',
      created_at: new Date().toISOString(),
      timestamp: Date.now(),
    };

    // 사용자 메시지를 즉시 표시
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    // 사용자 메시지를 DB에 저장
    supabase
      .from('chat_messages')
      .insert([{
        session_id: sessionId,
        content: userMessage,
        sender: 'user'
      }])
      .then(() => {
                          // WebSocket 연결 시도
          const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
          const WS_URL = API_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/chat';
        
        try {
          let aiMsg = '';
          wsRef.current = new WebSocket(WS_URL);
          
          wsRef.current.onopen = () => {
            console.log('WebSocket 연결 성공:', WS_URL);
            const payload = {
              sessionId: sessionId,
              messages: [...messages.slice(-10), userMsg].map(msg => ({
                id: msg.id,
                content: msg.content,
                sender: msg.sender,
                timestamp: new Date(msg.created_at).getTime()
              })),
            };
            console.log('WebSocket으로 전송할 데이터:', payload);
            wsRef.current?.send(JSON.stringify(payload));
          };

          wsRef.current.onmessage = (e) => {
            const data = e.data;
            
            // 스트리밍 완료 신호 확인
            if (data === "[STREAM_END]") {
              console.log('스트리밍 완료, 최종 응답:', aiMsg);
              // 최종 AI 응답을 DB에 저장
              if (aiMsg) {
                supabase
                  .from('chat_messages')
                  .insert([{
                    session_id: sessionId,
                    content: aiMsg,
                    sender: 'assistant'
                  }]);
              }
              setIsLoading(false);
              return;
            }
            
            aiMsg += data;
            console.log('스트리밍 데이터 수신:', data);
            
            setMessages(prev => {
              const lastMessage = prev[prev.length - 1];
              
              if (lastMessage && lastMessage.sender === 'assistant' && lastMessage.timestamp) {
                // 기존 AI 메시지 업데이트 (임시 메시지)
                return [...prev.slice(0, -1), { 
                  ...lastMessage, 
                  content: aiMsg 
                }];
              } else {
                // 새 AI 메시지 추가 (임시 메시지, timestamp로 구분)
                return [...prev, { 
                  id: `temp-${Date.now()}`, 
                  session_id: sessionId,
                  sender: 'assistant', 
                  content: aiMsg, 
                  created_at: new Date().toISOString(),
                  timestamp: Date.now() 
                }];
              }
            });
          };

                wsRef.current.onerror = (error) => {
            console.error('WebSocket 오류:', error);
            // WebSocket 실패 시 기본 응답
            handleFallbackResponse(userMessage, sessionId);
          };

          wsRef.current.onclose = () => {
            console.log('WebSocket 연결 종료');
            setIsLoading(false);
          };

                          } catch (error) {
           console.error('WebSocket 연결 오류:', error);
           handleFallbackResponse(userMessage, sessionId);
         }
      });
  };

  // Fallback 응답 처리
  const handleFallbackResponse = async (userMessage: string, sessionId: string) => {
    let fallbackResponse = '';
    if (userMessage.includes('안녕') || userMessage.includes('hello')) {
      fallbackResponse = '안녕하세요! AI 교육 상담사입니다. 대학 입시와 관련된 질문이 있으시면 언제든지 물어보세요.';
    } else if (userMessage.includes('대학') || userMessage.includes('입시')) {
      fallbackResponse = `"${userMessage}"에 대한 질문이군요. 현재 백엔드 서버와 연결할 수 없어서 자세한 입시 정보를 제공할 수 없습니다. 서버 연결 후 다시 질문해주시면 더 정확한 정보를 드릴 수 있습니다.`;
    } else {
      fallbackResponse = '죄송합니다. 현재 AI 서비스에 연결할 수 없습니다. 네트워크를 확인하고 잠시 후 다시 시도해주세요.';
    }

    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      session_id: sessionId,
      content: fallbackResponse,
      sender: 'assistant',
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, aiMessage]);
    
    // DB에도 저장
    await supabase
      .from('chat_messages')
      .insert([{
        session_id: sessionId,
        content: fallbackResponse,
        sender: 'assistant'
      }]);
    
    setIsLoading(false);
  };

  // 메시지 렌더링
  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageWrapper,
        item.sender === 'user' ? styles.userMessageWrapper : styles.aiMessageWrapper
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          item.sender === 'user' ? styles.userMessage : styles.aiMessage
        ]}
      >
        <Text style={[
          styles.messageText,
          item.sender === 'user' ? styles.userMessageText : styles.aiMessageText
        ]}>
          {item.content}
        </Text>
      </View>
    </View>
  );

  // 컴포넌트 언마운트 시 WebSocket 정리
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  if (!sessionId) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          왼쪽 메뉴에서 채팅 세션을 선택하거나{'\n'}새 대화를 시작하세요.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      {/* 메시지 목록 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesContainer}
        contentContainerStyle={[
          styles.messagesContent,
          Platform.OS === 'android' && keyboardHeight > 0 && { paddingBottom: 20 }
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      {/* 로딩 표시 */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>AI가 응답을 생성중입니다...</Text>
        </View>
      )}

      {/* 입력창 */}
      <View style={[
        styles.inputContainer,
        Platform.OS === 'android' && keyboardHeight > 0 && { marginBottom: keyboardHeight - 50 }
      ]}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="메시지를 입력하세요..."
          multiline
          maxLength={1000}
          editable={!isLoading}
          onSubmitEditing={sendStreamingMessage}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={sendStreamingMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>전송</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function Main() {
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeUser = async () => {
      try {
        console.log('사용자 정보 로딩 중...');
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('사용자 로딩 오류:', error);
          setUserId(null);
        } else {
          console.log('로딩된 사용자:', data?.user?.id);
          setUserId(data?.user?.id ?? null);
        }
      } catch (error) {
        console.error('사용자 초기화 오류:', error);
        setUserId(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  // 처음 진입 시 자동으로 새 세션 생성
  useEffect(() => {
    const loadOrCreateSession = async () => {
      if (!userId || selectedSessionId) return;
      
      try {
        console.log('세션 로딩 중... userId:', userId);
        
        // 기존 세션 확인
        const { data: existingSessions, error: fetchError } = await supabase
          .from('chat_sessions')
          .select('id')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1);

        if (fetchError) {
          console.error('세션 로딩 오류:', fetchError);
          return;
        }

        if (existingSessions && existingSessions.length > 0) {
          console.log('기존 세션 발견:', existingSessions[0].id);
          setSelectedSessionId(existingSessions[0].id);
        } else {
          console.log('새 세션 생성 중...');
          const { data: newSession, error: createError } = await supabase
            .from('chat_sessions')
            .insert([{ user_id: userId }])
            .select()
            .single();
          
          if (createError) {
            console.error('새 세션 생성 오류:', createError);
          } else if (newSession) {
            console.log('새 세션 생성됨:', newSession.id);
            setSelectedSessionId(newSession.id);
          }
        }
      } catch (error) {
        console.error('세션 초기화 오류:', error);
      }
    };

    loadOrCreateSession();
  }, [userId, selectedSessionId]);

  // 로딩 중일 때 로딩 화면 표시
  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>앱을 초기화하는 중...</Text>
      </View>
    );
  }

  // 사용자가 로그인되지 않은 경우
  if (!userId) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>로그인이 필요합니다.</Text>
      </View>
    );
  }

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawerContent
          {...props}
          selectedSessionId={selectedSessionId}
          setSelectedSessionId={setSelectedSessionId}
          userId={userId}
        />
      )}
      screenOptions={{
        headerShown: true,
        drawerType: 'slide',
      }}
    >
      <Drawer.Screen 
        name="ChatMain"
        options={{
          title: '채팅',
        }}
      >
        {() => <ChatScreen sessionId={selectedSessionId} />}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  aiMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
  },
  userMessage: {
    backgroundColor: '#007AFF',
  },
  aiMessage: {
    backgroundColor: '#E5E5E7',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: 'black',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    color: '#666',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
}); 