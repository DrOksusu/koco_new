'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { imageCache } from '@/lib/imageCache';
import { apiUrl } from '@/lib/api-client';

interface ChatMedia {
  id: string;
  type: 'image' | 'video' | 'file';
  title: string;
  description?: string;
  url: string;
  fileName?: string;
  thumbnail?: string;
  duration?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  media?: ChatMedia | null;
  createdAt: string;
}

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatBot({ isOpen, onClose }: ChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 스크롤을 맨 아래로
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 채팅창 열릴 때 입력창 포커스
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);

      // 환영 메시지 추가 (첫 오픈 시)
      if (messages.length === 0) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: '안녕하세요! KOCO 진단 도우미입니다.\n\n궁금한 점을 물어보세요. 예시:\n- "PSA 분석이란?"\n- "랜드마크 찍는 방법"\n- "사용법 알려줘"',
          createdAt: new Date().toISOString()
        }]);
      }
    }
  }, [isOpen, messages.length]);

  // 메시지 전송
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      console.log('🚀 Sending chat message:', userMessage.content);
      console.log('🔗 API path:', apiUrl('/api/chat/send'));

      const response = await fetch(apiUrl('/api/chat/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId
        })
      });

      console.log('📥 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Response data:', data);
        setSessionId(data.sessionId);

        const assistantMessage: ChatMessage = {
          id: data.message.id,
          role: 'assistant',
          content: data.message.content,
          media: data.message.media,
          createdAt: data.message.createdAt
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // 에러 응답
        const errorData = await response.text();
        console.error('❌ Error response:', response.status, errorData);
        setMessages(prev => [...prev, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: '죄송합니다, 오류가 발생했습니다. 다시 시도해 주세요.',
          createdAt: new Date().toISOString()
        }]);
      }
    } catch (error) {
      console.error('❌ Chat fetch error:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '네트워크 오류가 발생했습니다. 연결을 확인해 주세요.',
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Enter 키로 전송
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 새 대화 시작
  const startNewChat = () => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: '새로운 대화를 시작합니다.\n\n궁금한 점을 물어보세요!',
      createdAt: new Date().toISOString()
    }]);
    setSessionId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
      {/* 헤더 */}
      <div className="bg-blue-600 text-white px-4 py-3 rounded-t-lg flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">💬</span>
          <span className="font-semibold">KOCO 진단 도우미</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startNewChat}
            className="text-white/80 hover:text-white text-sm"
            title="새 대화"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm">
              🤖
            </div>
            <div className="bg-white rounded-lg px-4 py-2 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="p-4 border-t bg-white rounded-b-lg">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// 메시지 버블 컴포넌트
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* 아바타 */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 ${
        isUser ? 'bg-green-600' : 'bg-blue-600'
      }`}>
        {isUser ? '👤' : '🤖'}
      </div>

      {/* 메시지 내용 */}
      <div className={`max-w-[75%] ${isUser ? 'text-right' : ''}`}>
        <div className={`rounded-lg px-4 py-2 shadow-sm ${
          isUser ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'
        }`}>
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>

        {/* 미디어 첨부 */}
        {message.media && (
          <div className="mt-2">
            <MediaPreview media={message.media} />
          </div>
        )}
      </div>
    </div>
  );
}

// 미디어 미리보기 컴포넌트
function MediaPreview({ media }: { media: ChatMedia }) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadImage = async () => {
      if (media.type === 'image' && media.url) {
        try {
          // S3 이미지인 경우 캐시 사용
          if (media.url.includes('s3') && media.url.includes('amazonaws.com')) {
            const blobUrl = await imageCache.getOrLoadImage(media.url);
            setImageUrl(blobUrl);
          } else {
            setImageUrl(media.url);
          }
        } catch (error) {
          console.error('Failed to load image:', error);
          setImageUrl(media.url);
        }
      }
      setIsLoading(false);
    };

    loadImage();
  }, [media]);

  if (media.type === 'image') {
    return (
      <div className="rounded-lg overflow-hidden bg-gray-100 max-w-xs">
        {isLoading ? (
          <div className="w-full h-32 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <a href={imageUrl || media.url} target="_blank" rel="noopener noreferrer">
            <img
              src={imageUrl || media.url}
              alt={media.title}
              className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity"
            />
          </a>
        )}
        <div className="p-2 bg-white">
          <p className="text-xs font-medium text-gray-700">{media.title}</p>
          {media.description && (
            <p className="text-xs text-gray-500 mt-1">{media.description}</p>
          )}
        </div>
      </div>
    );
  }

  if (media.type === 'video') {
    return (
      <div className="rounded-lg overflow-hidden bg-gray-100 max-w-xs">
        <video
          controls
          className="w-full"
          poster={media.thumbnail || undefined}
        >
          <source src={media.url} type="video/mp4" />
          브라우저가 비디오를 지원하지 않습니다.
        </video>
        <div className="p-2 bg-white">
          <p className="text-xs font-medium text-gray-700">{media.title}</p>
          {media.duration && (
            <p className="text-xs text-gray-500">{media.duration}</p>
          )}
        </div>
      </div>
    );
  }

  if (media.type === 'file') {
    return (
      <a
        href={media.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors max-w-xs"
      >
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">{media.title}</p>
          {media.fileName && (
            <p className="text-xs text-gray-500">{media.fileName}</p>
          )}
        </div>
      </a>
    );
  }

  return null;
}
