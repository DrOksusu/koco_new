'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// 챗봇 컴포넌트를 동적으로 로드 (코드 스플리팅)
const ChatBot = dynamic(() => import('./ChatBot'), {
  ssr: false,
  loading: () => null
});

export default function ChatButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 플로팅 챗봇 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-4 right-4 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-40 ${
          isOpen
            ? 'bg-gray-600 hover:bg-gray-700'
            : 'bg-blue-600 hover:bg-blue-700 animate-pulse hover:animate-none'
        }`}
        title={isOpen ? '채팅 닫기' : '진단 도우미'}
      >
        {isOpen ? (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* 챗봇 컴포넌트 */}
      <ChatBot isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
