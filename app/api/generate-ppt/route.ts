/**
 * PowerPoint 생성 API 프록시
 * CORS 문제 해결을 위해 서버 측에서 koco.me API 호출
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('=== PowerPoint API Proxy called ===');

    // 클라이언트로부터 FormData 받기
    const formData = await request.formData();

    console.log('FormData received, forwarding to koco.me API...');

    // koco.me API로 전달
    const response = await fetch('https://koco.me/dash_board', {
      method: 'POST',
      body: formData,
      // FormData는 자동으로 Content-Type이 설정되므로 헤더 생략
    });

    console.log('API Response status:', response.status);

    if (!response.ok) {
      // 에러 응답 처리
      let errorMessage = `서버 오류 (${response.status})`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        errorMessage = await response.text() || errorMessage;
      }

      console.error('API Error:', errorMessage);

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // 성공 응답 - Blob 데이터 전달
    const blob = await response.blob();

    console.log('✅ PowerPoint generated successfully:', {
      size: blob.size,
      type: blob.type
    });

    // Blob을 ArrayBuffer로 변환하여 반환
    const arrayBuffer = await blob.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': blob.type || 'application/octet-stream',
        'Content-Disposition': 'attachment',
      },
    });

  } catch (error) {
    console.error('PowerPoint API proxy error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      },
      { status: 500 }
    );
  }
}
