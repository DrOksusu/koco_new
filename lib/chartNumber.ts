import { prisma } from '@/lib/prisma';

/**
 * 다음 차트번호를 생성합니다.
 * 형식: KOCO-0001, KOCO-0002, ...
 * 전체 분석 건수를 기준으로 순차적으로 생성됩니다.
 */
export async function generateChartNumber(): Promise<string> {
  // 가장 최근 차트번호를 가진 분석 찾기
  const lastAnalysis = await prisma.xrayAnalysis.findFirst({
    where: {
      chartNumber: {
        not: null
      }
    },
    orderBy: {
      chartNumber: 'desc'
    },
    select: {
      chartNumber: true
    }
  });

  let nextNumber = 1;

  if (lastAnalysis?.chartNumber) {
    // KOCO-0001 형식에서 숫자 추출
    const match = lastAnalysis.chartNumber.match(/KOCO-(\d+)/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // 4자리 숫자로 포맷팅 (0001, 0002, ...)
  const formattedNumber = nextNumber.toString().padStart(4, '0');
  return `KOCO-${formattedNumber}`;
}

/**
 * 현재까지의 총 분석 건수를 반환합니다.
 */
export async function getTotalAnalysisCount(): Promise<number> {
  const count = await prisma.xrayAnalysis.count({
    where: {
      chartNumber: {
        not: null
      }
    }
  });
  return count;
}
