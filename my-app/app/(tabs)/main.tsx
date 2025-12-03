import React, { useEffect, useState, useRef } from 'react';
import { createDrawerNavigator, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useDrawerStatus } from '@react-navigation/drawer';
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
  Keyboard,
  ActivityIndicator
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../../lib/supabaseClient';
import ChatSessionList from '../../components/ChatSessionList';
import { useColorScheme } from '../../components/useColorScheme';
import MarkdownDisplay from 'react-native-markdown-display';

const Drawer = createDrawerNavigator();

interface Message {
  id: string;
  session_id: string;
  content: string;
  sender: 'user' | 'assistant';
  created_at: string;
  timestamp?: number;
  pending_id?: string | null;
  cache_id?: string | null;
  feedback?: 'like' | 'dislike' | null;
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
  const drawerStatus = useDrawerStatus();
  const isDrawerOpen = drawerStatus === 'open';
  const colorScheme = useColorScheme();

  const themeColors = {
    background: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
  };

  const handleDeleteSession = (deletedSessionId: string) => {
    if (selectedSessionId === deletedSessionId) {
      setSelectedSessionId(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <ChatSessionList
        userId={userId ?? ''}
        selectedId={selectedSessionId}
        onSelect={(id) => {
          setSelectedSessionId(id);
          navigation.closeDrawer();
        }}
        onDelete={handleDeleteSession}
        drawerOpen={isDrawerOpen}
        onNewSession={() => {
          setSelectedSessionId(null);
          navigation.closeDrawer();
        }}
      />
    </View>
  );
}

function ChatScreen({
  sessionId, 
  userId, 
  setSelectedSessionId 
}: { 
  sessionId: string | null;
  userId: string;
  setSelectedSessionId: (id: string) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [botStreaming, setBotStreaming] = useState(false);
  const [streamedBotMessage, setStreamedBotMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [userProfile, setUserProfile] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const colorScheme = useColorScheme();

  const themeColors = {
    background: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
    cardBackground: colorScheme === 'dark' ? '#2d2d2d' : '#fff',
    text: colorScheme === 'dark' ? '#fff' : '#333',
    secondaryText: colorScheme === 'dark' ? '#ccc' : '#666',
    inputBackground: colorScheme === 'dark' ? '#3d3d3d' : '#fff',
    inputBorder: colorScheme === 'dark' ? '#555' : '#ddd',
    border: colorScheme === 'dark' ? '#444' : '#eee',
    userMessageBg: '#007AFF',
    aiMessageBg: colorScheme === 'dark' ? '#3d3d3d' : '#E5E5E7',
    aiMessageText: colorScheme === 'dark' ? '#fff' : '#000',
    codeBackground: colorScheme === 'dark' ? '#2d2d2d' : '#f6f8fa',
    codeText: colorScheme === 'dark' ? '#e6db74' : '#d73a49',
    quoteBorder: colorScheme === 'dark' ? '#555' : '#dfe2e5',
    featureCardBg: colorScheme === 'dark' ? '#2d2d2d' : '#fff',
    loadingBg: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
  };

  const markdownStyles = {
    body: { color: themeColors.aiMessageText, fontSize: 16, lineHeight: 24 },
    heading1: { color: themeColors.aiMessageText, marginTop: 8, marginBottom: 8, fontSize: 24 },
    heading2: { color: themeColors.aiMessageText, marginTop: 6, marginBottom: 6, fontSize: 20 },
    heading3: { color: themeColors.aiMessageText, marginTop: 4, marginBottom: 4, fontSize: 18 },
    code_block: {
      backgroundColor: themeColors.codeBackground,
      color: themeColors.codeText,
      borderColor: themeColors.border,
      borderWidth: 1,
      borderRadius: 6,
      padding: 12,
      fontFamily: 'monospace',
    },
    fence: {
        backgroundColor: themeColors.codeBackground,
        color: themeColors.codeText,
        borderColor: themeColors.border,
        borderWidth: 1,
        borderRadius: 6,
        padding: 12,
        fontFamily: 'monospace',
    },
    blockquote: {
      backgroundColor: themeColors.codeBackground,
      borderLeftColor: themeColors.quoteBorder,
      borderLeftWidth: 4,
      paddingLeft: 12,
      marginLeft: 0,
    },
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user?.id) return;
        
        const { data, error } = await supabase
          .from('user_profile')
          .select('*')
          .eq('id', userData.user.id)
          .single();
          
        if (data) {
          setUserProfile(data);
        }
      } catch (error) {
        console.error('프로필 로드 오류:', error);
      }
    };
    
    fetchProfile();
  }, []);

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

  useEffect(() => {
    loadMessages();
  }, [sessionId]);

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

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
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

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const summarizeSession = async (sessionId: string, messages: Message[]) => {
    if (messages.length < 1) return;
    
    try {
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            sender: msg.sender,
            timestamp: new Date(msg.created_at).getTime()
          })),
          sessionId: sessionId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const summary = result.summary;
        
        await supabase
          .from('chat_sessions')
          .update({ summary: summary })
          .eq('id', sessionId);
      }
    } catch (error) {
      console.error('세션 요약 오류:', error);
    }
  };

  const handleFeedback = async (message: Message, feedbackType: 'like' | 'dislike') => {
    if (message.feedback) {
      // 이미 피드백을 제공한 경우
      Alert.alert('안내', '이미 피드백을 제공한 메시지입니다.');
      return;
    }

    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

    try {
      const response = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          type: feedbackType,
        }),
      });

      if (response.ok) {
        // 로컬 상태 업데이트
        setMessages(prevMessages =>
          prevMessages.map(msg =>
            msg.id === message.id
              ? { ...msg, feedback: feedbackType }
              : msg
          )
        );

        // 성공 메시지 (간단하게)
        // Alert.alert('감사합니다', '피드백이 반영되었습니다.');
      } else {
        Alert.alert('오류', '피드백 전송에 실패했습니다.');
      }
    } catch (error) {
      console.error('피드백 전송 오류:', error);
      Alert.alert('오류', '네트워크 오류가 발생했습니다.');
    }
  };

  const sendStreamingMessage = async () => {
    if (!inputText.trim() || botStreaming) return;

    const userMessage = inputText.trim();
    setInputText('');
    setBotStreaming(true);
    setStreamedBotMessage("");

    let currentSessionId = sessionId;

    if (!currentSessionId) {
      try {
        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert([{ user_id: userId }])
          .select()
          .single();
        
        if (createError) {
          setBotStreaming(false);
          Alert.alert('오류', '세션 생성에 실패했습니다.');
          return;
        }
        
        if (newSession) {
          currentSessionId = newSession.id;
          setSelectedSessionId(newSession.id);
        }
      } catch (error) {
        setBotStreaming(false);
        Alert.alert('오류', '세션 생성 중 문제가 발생했습니다.');
        return;
      }
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      session_id: currentSessionId!,
      content: userMessage,
      sender: 'user',
      created_at: new Date().toISOString(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMsg]);

    supabase
      .from('chat_messages')
      .insert([{
        session_id: currentSessionId!,
        content: userMessage,
        sender: 'user'
      }])
      .then(async () => {
        const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
        const WS_URL = API_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/chat';
        
        try {
          let botText = '';
          wsRef.current = new WebSocket(WS_URL);
          
          wsRef.current.onopen = () => {
            const payload = {
              sessionId: currentSessionId,
              messages: [...messages.slice(-10), userMsg].map(msg => ({
                id: msg.id,
                content: msg.content,
                sender: msg.sender,
                timestamp: new Date(msg.created_at).getTime()
              })),
              userId: userId,
              attachments: [],
              profile: userProfile,
            };
            wsRef.current?.send(JSON.stringify(payload));
          };

          let pendingId: string | null = null;
          let cacheId: string | null = null;

          wsRef.current.onmessage = (e) => {
            try {
              const data = JSON.parse(e.data);

              // 타입별 처리
              if (data.type === 'thinking' || data.type === 'searching' || data.type === 'generating') {
                // 상태 메시지 표시
                setStatusMessage(data.message);
              } else if (data.type === 'answer') {
                // 최종 답변
                setStatusMessage("");
                botText = data.message;
                pendingId = data.pending_id || null;
                cacheId = data.cache_id || null;
                setStreamedBotMessage(botText);
              } else if (data.type === 'done') {
                // 완료
                wsRef.current?.close();
              }
            } catch (error) {
              // JSON 파싱 실패 시 기존 방식 사용 (하위 호환성)
              const data = e.data;

              if (data === "[STREAM_END]") {
                wsRef.current?.close();
                return;
              }

              botText += data;
              setStreamedBotMessage(botText);
            }
          };

          wsRef.current.onerror = (error) => {
            console.error('WebSocket 오류:', error);
            setBotStreaming(false);
            setStreamedBotMessage('AI 응답 중 에러 발생');
            wsRef.current?.close();
          };

          wsRef.current.onclose = async () => {
            setBotStreaming(false);

            const botMessage: Message = {
              id: (Date.now() + 1).toString(),
              session_id: currentSessionId!,
              content: botText || 'AI 응답이 없습니다.',
              sender: 'assistant',
              created_at: new Date().toISOString(),
              pending_id: pendingId,
              cache_id: cacheId,
              feedback: null,
            };

            await supabase.from('chat_messages').insert([{
              session_id: currentSessionId!,
              content: botMessage.content,
              sender: 'assistant'
            }]);

            setMessages((prev: Message[]) => [...prev, botMessage]);
            setStreamedBotMessage("");

            const updatedMessages = [...messages, userMsg, botMessage];
            summarizeSession(currentSessionId!, updatedMessages);
          };

        } catch (error) {
          console.error('WebSocket 연결 오류:', error);
          setBotStreaming(false);
          const fallbackMessage: Message = {
            id: (Date.now() + 1).toString(),
            session_id: currentSessionId!,
            content: '죄송합니다. 현재 AI 서비스에 연결할 수 없습니다. 네트워크를 확인하고 잠시 후 다시 시도해주세요.',
            sender: 'assistant',
            created_at: new Date().toISOString(),
          };
          
          setMessages(prev => [...prev, fallbackMessage]);
          await supabase.from('chat_messages').insert([{
            session_id: currentSessionId!,
            content: fallbackMessage.content,
            sender: 'assistant'
          }]);
        }
      });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageWrapper,
        item.sender === 'user' ? styles.userMessageWrapper : styles.aiMessageWrapper
      ]}
    >
      <View style={{ alignItems: item.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
        <View
          style={[
            styles.messageBubble,
            item.sender === 'user'
              ? { ...styles.userMessage, backgroundColor: themeColors.userMessageBg }
              : { ...styles.aiMessage, backgroundColor: themeColors.aiMessageBg }
          ]}
        >
          {item.sender === 'user' ? (
            <Text style={[styles.messageText, styles.userMessageText]}>
              {item.content}
            </Text>
          ) : (
            <MarkdownDisplay style={markdownStyles}>
              {item.content}
            </MarkdownDisplay>
          )}
        </View>

        {/* AI 메시지에 좋아요 버튼 추가 */}
        {item.sender === 'assistant' && (item.pending_id || item.cache_id) && !item.feedback && (
          <View style={styles.feedbackContainer}>
            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={() => handleFeedback(item, 'like')}
            >
              <Text style={styles.feedbackButtonText}>
                👍 도움이 됐어요
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <FlatList
        ref={flatListRef}
        data={[...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesContainer}
        contentContainerStyle={[
          styles.messagesContent,
          Platform.OS === 'android' && keyboardHeight > 0 && { paddingBottom: 20 },
          messages.length === 0 && !botStreaming && styles.emptyMessagesContent
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={() => (
          !botStreaming ? (
            <View style={styles.welcomeContainer}>
              <View style={styles.featuresContainer}>
                <View style={[styles.featureCard, { backgroundColor: themeColors.featureCardBg }]}>
                  <Text style={styles.featureIcon}>🤖</Text>
                  <Text style={[styles.featureTitle, { color: themeColors.text }]}>AI 기반 상담</Text>
                  <Text style={[styles.featureDescription, { color: themeColors.secondaryText }]}>
                    최신 AI 기술을 활용한{'\n'}맞춤형 교육 상담 서비스를 제공합니다.
                  </Text>
                </View>
                
                <View style={[styles.featureCard, { backgroundColor: themeColors.featureCardBg }]}>
                  <Text style={styles.featureIcon}>💡</Text>
                  <Text style={[styles.featureTitle, { color: themeColors.text }]}>스마트 학습 가이드</Text>
                  <Text style={[styles.featureDescription, { color: themeColors.secondaryText }]}>
                    개인별 학습 스타일과 목표에 맞는{'\n'}최적의 학습 경로를 제안합니다.
                  </Text>
                </View>
                
                <View style={[styles.featureCard, { backgroundColor: themeColors.featureCardBg }]}>
                  <Text style={styles.featureIcon}>🎓</Text>
                  <Text style={[styles.featureTitle, { color: themeColors.text }]}>전문 교육 상담</Text>
                  <Text style={[styles.featureDescription, { color: themeColors.secondaryText }]}>
                    교육 전문가 수준의 상세한{'\n'}학습 상담과 조언을 제공합니다.
                  </Text>
                </View>
              </View>
            </View>
          ) : null
        )}
        ListFooterComponent={() => (
          botStreaming ? (
            <View style={[styles.messageWrapper, styles.aiMessageWrapper]}>
              <View style={[styles.messageBubble, { ...styles.aiMessage, backgroundColor: themeColors.aiMessageBg }]}>
                {statusMessage ? (
                  // 상태 메시지 표시 (도구 호출 중)
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={themeColors.aiMessageText} style={{ marginRight: 8 }} />
                    <Text style={[{ color: themeColors.aiMessageText, fontSize: 14, fontStyle: 'italic' }]}>
                      {statusMessage}
                    </Text>
                  </View>
                ) : streamedBotMessage.length === 0 ? (
                  // 초기 로딩
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={themeColors.aiMessageText} style={{ marginRight: 8 }} />
                    <Text style={[{ color: themeColors.aiMessageText }]}>
                      AI가 응답을 준비중입니다...
                    </Text>
                  </View>
                ) : (
                  // 답변 표시
                  <MarkdownDisplay style={markdownStyles}>
                    {streamedBotMessage}
                  </MarkdownDisplay>
                )}
              </View>
            </View>
          ) : null
        )}
      />

      <View 
        style={[
          styles.inputContainer,
          { backgroundColor: themeColors.cardBackground, borderTopColor: themeColors.border },
          Platform.OS === 'android' && keyboardHeight > 0 && { marginBottom: keyboardHeight - 50 }
        ]}
      >
        <TextInput
          style={[
            styles.textInput,
            { 
              backgroundColor: themeColors.inputBackground,
              borderColor: themeColors.inputBorder,
              color: themeColors.text
            }
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="메시지를 입력하세요..."
          placeholderTextColor={themeColors.secondaryText}
          multiline
          maxLength={1000}
          editable={!botStreaming}
          onSubmitEditing={sendStreamingMessage}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || botStreaming) && styles.sendButtonDisabled]}
          onPress={sendStreamingMessage}
          disabled={!inputText.trim() || botStreaming}
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
  const colorScheme = useColorScheme();

  const themeColors = {
    loadingBg: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
    loadingText: colorScheme === 'dark' ? '#ccc' : '#666',
  };

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        
        if (error) {
          setUserId(null);
        } else {
          setUserId(data?.user?.id ?? null);
        }
      } catch (error) {
        setUserId(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: themeColors.loadingBg }]}>
        <Text style={[styles.loadingText, { color: themeColors.loadingText }]}>앱을 초기화하는 중...</Text>
      </View>
    );
  }

  if (!userId) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: themeColors.loadingBg }]}>
        <Text style={[styles.loadingText, { color: themeColors.loadingText }]}>로그인이 필요합니다.</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
          swipeEnabled: true,
          swipeEdgeWidth: 50,
          swipeMinDistance: 10,
      }}
    >
      <Drawer.Screen 
        name="ChatMain"
        options={{
          title: '채팅',
        }}
      >
        {() => (
          <ChatScreen 
            sessionId={selectedSessionId} 
            userId={userId}
            setSelectedSessionId={setSelectedSessionId}
          />
        )}
      </Drawer.Screen>
    </Drawer.Navigator>
    </GestureHandlerRootView>
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
  emptyMessagesContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 300,
  },
  featuresContainer: {
    width: '100%',
    paddingHorizontal: 12,
  },
  featureCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  feedbackContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  feedbackButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  feedbackButtonText: {
    fontSize: 13,
    color: '#666',
  },
});