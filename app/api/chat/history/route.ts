import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';
import { getPresignedUrl } from '@/lib/s3';

// GET: 채팅 이력 조회
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = BigInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      // 특정 세션의 메시지 조회
      const chatSession = await prisma.chatSession.findFirst({
        where: {
          id: BigInt(sessionId),
          userId: userId
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!chatSession) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }

      // 미디어가 있는 메시지에 presigned URL 추가
      const messagesWithMedia = await Promise.all(
        chatSession.messages.map(async (msg) => {
          let media = null;

          if (msg.mediaId) {
            const chatMedia = await prisma.chatMedia.findUnique({
              where: { id: msg.mediaId }
            });

            if (chatMedia) {
              media = {
                id: chatMedia.id.toString(),
                type: chatMedia.mediaType,
                title: chatMedia.title,
                description: chatMedia.description,
                url: await getPresignedUrl(chatMedia.s3Key),
                fileName: chatMedia.fileName,
                thumbnail: chatMedia.thumbnail
                  ? await getPresignedUrl(chatMedia.thumbnail)
                  : null,
                duration: chatMedia.duration
              };
            }
          }

          return {
            id: msg.id.toString(),
            role: msg.role,
            content: msg.content,
            media,
            createdAt: msg.createdAt
          };
        })
      );

      return NextResponse.json({
        sessionId: chatSession.id.toString(),
        messages: messagesWithMedia
      });
    } else {
      // 사용자의 최근 세션 목록 조회
      const sessions = await prisma.chatSession.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return NextResponse.json({
        sessions: sessions.map(s => ({
          id: s.id.toString(),
          lastMessage: s.messages[0]?.content || '',
          updatedAt: s.updatedAt
        }))
      });
    }

  } catch (error) {
    console.error('Chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}
