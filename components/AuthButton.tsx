'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';

export default function AuthButton() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (status === 'loading') {
    return (
      <div className="px-4 py-2">
        <div className="animate-pulse bg-gray-200 h-8 w-20 rounded"></div>
      </div>
    );
  }

  if (session) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {session.user?.image && (
            <img
              src={session.user.image}
              alt="Profile"
              className="w-8 h-8 rounded-full"
            />
          )}
          <span className="font-medium">{session.user?.name || session.user?.email}</span>
          <svg
            className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isMenuOpen && (
          <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
            <Link
              href="/dashboard"
              className="block px-4 py-3 hover:bg-gray-50 text-gray-700"
              onClick={() => setIsMenuOpen(false)}
            >
              대시보드
            </Link>
            <Link
              href="/profile"
              className="block px-4 py-3 hover:bg-gray-50 text-gray-700"
              onClick={() => setIsMenuOpen(false)}
            >
              프로필
            </Link>
            <hr className="border-gray-200" />
            <button
              onClick={() => {
                setIsMenuOpen(false);
                signOut({ callbackUrl: '/' });
              }}
              className="block w-full text-left px-4 py-3 hover:bg-gray-50 text-red-600"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/auth/signin"
        className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
      >
        로그인
      </Link>
      <Link
        href="/auth/signup"
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        회원가입
      </Link>
    </div>
  );
}