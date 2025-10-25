import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/lib/prisma';
import { AuthOptions } from 'next-auth';

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
      authorization: {
        params: {
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET!,
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
  },
};