import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { AuthOptions } from 'next-auth';
import bcrypt from 'bcryptjs';

// Admin emails list - these emails will automatically get admin role
const ADMIN_EMAILS = [
  'ok4192ok@gmail.com',
  'admin@koco.com',
];

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: '이메일', type: 'email' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('이메일과 비밀번호를 입력해주세요.');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error('등록되지 않은 이메일입니다.');
        }

        if (!user.passwordHash) {
          throw new Error('이 계정은 Google 로그인을 사용해주세요.');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error('비밀번호가 일치하지 않습니다.');
        }

        if (!user.isActive) {
          throw new Error('비활성화된 계정입니다.');
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.username,
        };
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET!,
  pages: {
    signIn: '/new/auth/signin',
    error: '/new/auth/error',
  },
  session: {
    strategy: 'jwt' as const,
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if user exists in database
      if (user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        // If user doesn't exist, create them
        if (!existingUser && account) {
          const isAdmin = ADMIN_EMAILS.includes(user.email);

          // Get or create default clinic
          let clinic = await prisma.clinic.findFirst();
          if (!clinic) {
            clinic = await prisma.clinic.create({
              data: {
                clinicName: 'Default Clinic',
                clinicCode: 'DEFAULT-001',
                address: 'Seoul, Korea',
                phone: '02-1234-5678',
                licenseNumber: 'LIC-2024-001',
              },
            });
          }

          await prisma.user.create({
            data: {
              email: user.email,
              username: user.name || user.email.split('@')[0],
              passwordHash: '', // Google OAuth users don't need password
              role: isAdmin ? 'admin' : 'staff',
              clinicId: clinic.id,
              isActive: true,
            },
          });
        } else if (existingUser) {
          // If user exists but is not admin and should be, update their role
          const shouldBeAdmin = ADMIN_EMAILS.includes(user.email);
          if (shouldBeAdmin && existingUser.role !== 'admin') {
            await prisma.user.update({
              where: { email: user.email },
              data: { role: 'admin' },
            });
          }
        }
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      // On sign in, add user info to token
      if (user && user.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.userId = dbUser.id.toString();
          token.email = user.email;
        }
      }
      // On subsequent requests, fetch fresh role from DB
      else if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.userId = dbUser.id.toString();
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Add role to session
      if (session.user) {
        session.user.role = token.role as string;
        session.user.id = token.userId as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle basePath for production
      const basePath = process.env.NODE_ENV === 'production' ? '/new' : '';

      // If url is relative (starts with /), add basePath
      if (url.startsWith('/')) {
        // If it already has /new prefix, don't add it again
        if (url.startsWith('/new')) {
          return `${baseUrl}${url}`;
        }
        return `${baseUrl}${basePath}${url}`;
      }

      // If url is absolute and same origin
      if (url.startsWith(baseUrl)) {
        return url;
      }

      // Default: redirect to dashboard with basePath
      return `${baseUrl}${basePath}/dashboard`;
    },
  },
};