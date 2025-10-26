'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Production에서만 /new basePath 사용, development에서는 기본값
  const basePath = process.env.NODE_ENV === 'production' ? '/new/api/auth' : '/api/auth';

  return (
    <SessionProvider basePath={basePath}>
      {children}
    </SessionProvider>
  );
}