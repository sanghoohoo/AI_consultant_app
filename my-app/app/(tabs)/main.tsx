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
  Keyboard
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../../lib/supabaseClient';
import ChatSessionList from '../../components/ChatSessionList';
import { useColorScheme } from '../../components/useColorScheme';

const Drawer = createDrawerNavigator();

// 간단한 마크다운 렌더링 컴포넌트
const MarkdownRenderer = ({ content, style }: { content: string; style?: any }) => {
  const renderMarkdownText = (text: string) => {
    const elements: React.ReactNode[] = [];
    const lines = text.split('\n');
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 코드 블록 처리 (```)
      if (line.trim().startsWith('```')) {
        const codeLines = [];
        i++; // 시작 ```를 넘어감
        
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          codeLines.push(lines[i]);
          i++;
        }
        
        elements.push(
          <View key={key++} style={{
            backgroundColor: style?.codeBackground || '#f6f8fa',
            borderRadius: 6,
            padding: 12,
            marginVertical: 4,
          }}>
            <Text style={{
              fontFamily: 'monospace',
              fontSize: 14,
              color: style?.codeText || style?.color || '#333',
            }}>
              {codeLines.join('\n')}
            </Text>
          </View>
        );
        continue;
      }
      
      // 제목 처리
      if (line.startsWith('# ')) {
        elements.push(
          <Text key={key++} style={{
            fontSize: 24,
            fontWeight: 'bold',
            marginVertical: 8,
            color: style?.color || '#333',
          }}>
            {line.replace('# ', '')}
          </Text>
        );
        continue;
      }
      
      if (line.startsWith('## ')) {
        elements.push(
          <Text key={key++} style={{
            fontSize: 20,
            fontWeight: 'bold',
            marginVertical: 6,
            color: style?.color || '#333',
          }}>
            {line.replace('## ', '')}
          </Text>
        );
        continue;
      }
      
      if (line.startsWith('### ')) {
        elements.push(
          <Text key={key++} style={{
            fontSize: 18,
            fontWeight: 'bold',
            marginVertical: 4,
            color: style?.color || '#333',
          }}>
            {line.replace('### ', '')}
          </Text>
        );
        continue;
      }
      
      // 목록 처리
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <View key={key++} style={{ flexDirection: 'row', marginVertical: 2 }}>
            <Text style={{ marginRight: 8, color: style?.color || '#333' }}>•</Text>
            <Text style={{
              flex: 1,
              fontSize: style?.fontSize || 16,
              color: style?.color || '#333',
            }}>
              {renderInlineMarkdown(line.replace(/^[\s]*[-*]\s/, ''))}
            </Text>
          </View>
        );
        continue;
      }
      
      // 인용구 처리
      if (line.startsWith('> ')) {
        elements.push(
          <View key={key++} style={{
            backgroundColor: '#f6f8fa',
            borderLeftWidth: 4,
            borderLeftColor: '#dfe2e5',
            paddingLeft: 12,
            paddingVertical: 8,
            marginVertical: 4,
          }}>
            <Text style={{
              fontSize: style?.fontSize || 16,
              color: style?.color || '#333',
            }}>
              {renderInlineMarkdown(line.replace('> ', ''))}
            </Text>
          </View>
        );
        continue;
      }
      
      // 일반 텍스트 (줄바꿈이 아닌 경우만)
      if (line.trim()) {
        elements.push(
          <Text key={key++} style={{
            fontSize: style?.fontSize || 16,
            lineHeight: style?.lineHeight || 24,
            color: style?.color || '#333',
            marginVertical: 2,
          }}>
            {renderInlineMarkdown(line)}
          </Text>
        );
      }
    }

    return elements;
  };

  const renderInlineMarkdown = (text: string) => {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    // 인라인 코드 처리 `code`
    const codeRegex = /`([^`]+)`/g;
    let lastIndex = 0;
    let match;

    while ((match = codeRegex.exec(text)) !== null) {
      // 코드 앞의 텍스트
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        parts.push(...processBoldItalic(beforeText, key));
      }
      
      // 코드
      parts.push(
        <Text key={`code-${key++}`} style={{
          backgroundColor: '#f0f0f0',
          color: '#d73a49',
          borderRadius: 3,
          paddingHorizontal: 4,
          paddingVertical: 2,
          fontSize: 14,
          fontFamily: 'monospace',
        }}>
          {match[1]}
        </Text>
      );
      
      lastIndex = match.index + match[0].length;
    }

    // 남은 텍스트
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      parts.push(...processBoldItalic(remainingText, key));
    }

    return parts.length > 0 ? parts : text;
  };

  const processBoldItalic = (text: string, startKey: number) => {
    const parts: React.ReactNode[] = [];
    let key = startKey;

    // **굵은 글씨**와 *기울임* 처리
    const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // 마크다운 앞의 텍스트
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      if (match[1]) {
        // **굵은 글씨**
        parts.push(
          <Text key={`bold-${key++}`} style={{ fontWeight: 'bold' }}>
            {match[2]}
          </Text>
        );
      } else if (match[3]) {
        // *기울임*
        parts.push(
          <Text key={`italic-${key++}`} style={{ fontStyle: 'italic' }}>
            {match[4]}
          </Text>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // 남은 텍스트
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  return <View>{renderMarkdownText(content)}</View>;
};


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
  const drawerStatus = useDrawerStatus();
  const isDrawerOpen = drawerStatus === 'open';
  const colorScheme = useColorScheme();

  // 다크모드 대응 색상 정의
  const themeColors = {
    background: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
  };

  // 세션 삭제 핸들러
  const handleDeleteSession = (deletedSessionId: string) => {
    console.log('세션 삭제됨:', deletedSessionId);
    
    // 현재 선택된 세션이 삭제된 경우 선택 해제
    if (selectedSessionId === deletedSessionId) {
      console.log('현재 선택된 세션이 삭제됨, 선택 해제');
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
          console.log('새 대화 시작 - 빈 채팅창 표시');
          // 세션을 즉시 생성하지 않고 빈 채팅창만 표시
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
  const [userProfile, setUserProfile] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const colorScheme = useColorScheme();

  // 다크모드 대응 색상 정의
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

  // 사용자 프로필 로드
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
          console.log('사용자 프로필 로드됨:', data);
          setUserProfile(data);
        }
      } catch (error) {
        console.error('프로필 로드 오류:', error);
      }
    };
    
    fetchProfile();
  }, []);

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

  // 세션 요약 함수
  const summarizeSession = async (sessionId: string, messages: Message[]) => {
    if (messages.length < 1) return; // 메시지가 없으면 요약하지 않음
    
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
        
        // 세션 제목 업데이트
        await supabase
          .from('chat_sessions')
          .update({ summary: summary })
          .eq('id', sessionId);
          
        console.log('세션 요약 완료:', summary);
      }
    } catch (error) {
      console.error('세션 요약 오류:', error);
    }
  };

  // WebSocket을 통한 스트리밍 메시지 전송 (웹 버전과 동일)
  const sendStreamingMessage = async () => {
    if (!inputText.trim() || botStreaming) return;

    const userMessage = inputText.trim();
    setInputText('');
    setBotStreaming(true);
    setStreamedBotMessage("");

    let currentSessionId = sessionId;

    // 세션이 없으면 새로 생성
    if (!currentSessionId) {
      try {
        console.log('새 세션 생성 중...');
        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert([{ user_id: userId }])
          .select()
          .single();
        
        if (createError) {
          console.error('새 세션 생성 오류:', createError);
          setBotStreaming(false);
          Alert.alert('오류', '세션 생성에 실패했습니다.');
          return;
        }
        
        if (newSession) {
          console.log('새 세션 생성됨:', newSession.id);
          currentSessionId = newSession.id;
          setSelectedSessionId(newSession.id);
        }
      } catch (error) {
        console.error('세션 생성 예외:', error);
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

    // 사용자 메시지를 즉시 표시
    setMessages(prev => [...prev, userMsg]);

    // 사용자 메시지를 DB에 저장
            supabase
      .from('chat_messages')
      .insert([{
        session_id: currentSessionId!,
        content: userMessage,
        sender: 'user'
      }])
      .then(async () => {
        // WebSocket 연결 시도 (웹 버전과 동일)
        const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
        const WS_URL = API_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/chat';
        
        try {
          let botText = '';
          wsRef.current = new WebSocket(WS_URL);
          
          wsRef.current.onopen = () => {
            console.log('WebSocket 연결 성공:', WS_URL);
            const payload = {
              sessionId: currentSessionId,
              messages: [...messages.slice(-10), userMsg].map(msg => ({
                id: msg.id,
                content: msg.content,
                sender: msg.sender,
                timestamp: new Date(msg.created_at).getTime()
              })),
              userId: null, // 나중에 사용자 ID 추가 가능
              attachments: [], // 첨부파일 기능은 나중에 추가
              profile: userProfile,
            };
            console.log('WebSocket으로 전송할 데이터:', payload);
            wsRef.current?.send(JSON.stringify(payload));
          };

          wsRef.current.onmessage = (e) => {
            const data = e.data;
            
            // 스트리밍 완료 신호 확인 (웹 버전과 동일)
            if (data === "[STREAM_END]") {
              console.log('스트리밍 완료, 최종 응답:', botText);
              // 웹 버전처럼 바로 WebSocket 닫기
              wsRef.current?.close();
              return;
            }
            
            botText += data;
            console.log('스트리밍 데이터 수신:', data);
            setStreamedBotMessage(botText);
          };

          wsRef.current.onerror = (error) => {
            console.error('WebSocket 오류:', error);
            setBotStreaming(false);
            setStreamedBotMessage('AI 응답 중 에러 발생');
            wsRef.current?.close();
          };

          wsRef.current.onclose = async () => {
            console.log('WebSocket 연결 종료');
            setBotStreaming(false);
            
            // 웹 버전과 동일하게 최종 메시지 처리
            const botMessage: Message = {
              id: (Date.now() + 1).toString(),
              session_id: currentSessionId!,
              content: botText || 'AI 응답이 없습니다.',
              sender: 'assistant',
              created_at: new Date().toISOString(),
            };
            
            await supabase.from('chat_messages').insert([{
              session_id: currentSessionId!,
              content: botMessage.content,
              sender: 'assistant'
            }]);
            
            setMessages((prev: Message[]) => [...prev, botMessage]);
            setStreamedBotMessage("");
            
            // 세션 요약 실행
            const updatedMessages = [...messages, userMsg, botMessage];
            summarizeSession(currentSessionId!, updatedMessages);
          };

        } catch (error) {
          console.error('WebSocket 연결 오류:', error);
          setBotStreaming(false);
          // 오류 시 fallback 응답
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
          item.sender === 'user' 
            ? { ...styles.userMessage, backgroundColor: themeColors.userMessageBg }
            : { ...styles.aiMessage, backgroundColor: themeColors.aiMessageBg }
        ]}
      >
        {item.sender === 'user' ? (
        <Text style={[
          styles.messageText,
            styles.userMessageText
        ]}>
          {item.content}
        </Text>
        ) : (
          <MarkdownRenderer 
            content={item.content}
            style={{
              ...styles.aiMessageText,
              color: themeColors.aiMessageText,
              codeBackground: themeColors.codeBackground,
              codeText: themeColors.codeText,
            }}
          />
        )}
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

  // sessionId가 없어도 빈 채팅창을 표시

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      {/* 메시지 목록 */}
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
                <MarkdownRenderer 
                  content={streamedBotMessage || 'AI가 응답을 생성중입니다...'}
                  style={{
                    ...styles.aiMessageText,
                    color: themeColors.aiMessageText,
                    codeBackground: themeColors.codeBackground,
                    codeText: themeColors.codeText,
                  }}
                />
              </View>
            </View>
          ) : null
        )}
      />



      {/* 입력창 */}
      <View style={[
        styles.inputContainer,
        { backgroundColor: themeColors.cardBackground, borderTopColor: themeColors.border },
        Platform.OS === 'android' && keyboardHeight > 0 && { marginBottom: keyboardHeight - 50 }
      ]}>
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

  // 다크모드 대응 색상 정의
  const themeColors = {
    loadingBg: colorScheme === 'dark' ? '#1a1a1a' : '#f5f5f5',
    loadingText: colorScheme === 'dark' ? '#ccc' : '#666',
  };

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

  // 처음 진입 시에는 세션을 자동으로 생성하지 않음
  // 사용자가 첫 메시지를 입력할 때 세션이 생성됨

  // 로딩 중일 때 로딩 화면 표시
  if (isLoading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: themeColors.loadingBg }]}>
        <Text style={[styles.loadingText, { color: themeColors.loadingText }]}>앱을 초기화하는 중...</Text>
      </View>
    );
  }

  // 사용자가 로그인되지 않은 경우
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
}); 