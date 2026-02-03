import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/prisma';
import { getPresignedUrl } from '@/lib/s3';

// 키워드 매칭 함수
function matchKeywords(message: string, keywords: string): boolean {
  const keywordList = keywords.split(',').map(k => k.trim().toLowerCase());
  const messageLower = message.toLowerCase();

  return keywordList.some(keyword => {
    // 정확한 단어 매칭 또는 포함 매칭
    return messageLower.includes(keyword);
  });
}

// 기본 응답 (매칭되는 룰이 없을 때)
const DEFAULT_RESPONSE = {
  content: '죄송합니다, 해당 질문에 대한 답변을 찾지 못했습니다. 다른 키워드로 질문해 주세요.\n\n도움이 필요하시면 "도움말" 또는 "사용법"을 입력해 보세요.',
  media: null
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    console.log('Chat API - Session:', JSON.stringify(session, null, 2));

    if (!session?.user) {
      console.log('Chat API - No session user');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // session.user.id가 없으면 email로 사용자 조회
    let userId: bigint;
    if (session.user.id) {
      userId = BigInt(session.user.id);
    } else if (session.user.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email }
      });
      if (!user) {
        console.log('Chat API - User not found by email');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      userId = user.id;
    } else {
      console.log('Chat API - No user id or email');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Chat API - User ID:', userId.toString());
    const body = await request.json();
    const { message, sessionId } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // 세션 확인 또는 생성
    let chatSessionId: bigint;

    if (sessionId) {
      chatSessionId = BigInt(sessionId);
    } else {
      // 새 세션 생성
      const newSession = await prisma.chatSession.create({
        data: { userId }
      });
      chatSessionId = newSession.id;
    }

    // 사용자 메시지 저장
    await prisma.chatMessage.create({
      data: {
        sessionId: chatSessionId,
        role: 'user',
        content: message.trim()
      }
    });

    // 룰 매칭 (우선순위 높은 순)
    const rules = await prisma.chatRule.findMany({
      where: { isActive: true },
      include: { media: true },
      orderBy: { priority: 'desc' }
    });

    let matchedRule = null;

    for (const rule of rules) {
      if (matchKeywords(message, rule.keywords)) {
        matchedRule = rule;
        break;
      }
    }

    // 응답 생성
    let responseContent = DEFAULT_RESPONSE.content;
    let responseMedia = null;

    if (matchedRule) {
      responseContent = matchedRule.response;

      if (matchedRule.media) {
        // S3 presigned URL 생성
        const presignedUrl = await getPresignedUrl(matchedRule.media.s3Key);

        responseMedia = {
          id: matchedRule.media.id.toString(),
          type: matchedRule.media.mediaType,
          title: matchedRule.media.title,
          description: matchedRule.media.description,
          url: presignedUrl,
          fileName: matchedRule.media.fileName,
          thumbnail: matchedRule.media.thumbnail
            ? await getPresignedUrl(matchedRule.media.thumbnail)
            : null,
          duration: matchedRule.media.duration
        };
      }
    }

    // 어시스턴트 응답 저장
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        sessionId: chatSessionId,
        role: 'assistant',
        content: responseContent,
        mediaId: matchedRule?.mediaId || null
      }
    });

    return NextResponse.json({
      success: true,
      sessionId: chatSessionId.toString(),
      message: {
        id: assistantMessage.id.toString(),
        role: 'assistant',
        content: responseContent,
        media: responseMedia,
        createdAt: assistantMessage.createdAt
      }
    });

  } catch (error) {
    console.error('Chat error:', error);
    console.error('Chat error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      {
        error: 'Failed to process chat message',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
