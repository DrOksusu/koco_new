'use client';

interface GuideMessageProps {
  currentLandmark?: string;
  currentIndex: number;
  totalLandmarks: number;
}

export default function GuideMessage({
  currentLandmark,
  currentIndex,
  totalLandmarks
}: GuideMessageProps) {
  const progress = (currentIndex / totalLandmarks) * 100;
  const remaining = totalLandmarks - currentIndex;

  if (currentIndex >= totalLandmarks) {
    return (
      <div className="bg-green-600 text-white px-4 py-2 rounded-lg">
        <span className="font-bold">✓ 모든 랜드마크 설정 완료!</span>
        <span className="ml-2 text-sm">엑셀 데이터 생성 버튼을 클릭하세요.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4">
      {/* 현재 랜드마크 정보 */}
      <div className="bg-blue-600 text-white px-4 py-2 rounded-lg">
        <span className="font-bold text-lg">{currentIndex + 1}. {currentLandmark}</span>
        <span className="ml-3 text-sm opacity-90">({currentIndex + 1}/{totalLandmarks})</span>
      </div>

      {/* 진행률 바 */}
      <div className="flex items-center space-x-2">
        <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-gray-400">{Math.round(progress)}%</span>
      </div>

      {/* 남은 개수 */}
      <div className="text-yellow-400 text-sm font-medium">
        남은 랜드마크: {remaining}개
      </div>
    </div>
  );
}