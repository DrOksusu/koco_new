# KOCO 자동화 진단 사이트 (PSA, PSO) - 프로젝트 리마인더

## 📌 프로젝트 개요
- **목적**: 두개골 엑스레이 자동 분석 및 진단 자동화 시스템
- **타입**: PSA (Postural Structure Analysis), PSO (Postural Structure Optimization)
- **포트**: 3001
- **스택**: Next.js 15 + TypeScript + Prisma + MySQL + AWS S3

---

## 🗄️ 데이터베이스 구조 (Prisma Schema)

### 핵심 테이블
1. **Clinic** - 병원 정보
2. **User** - 사용자 (admin/doctor/staff)
3. **Patient** - 환자 정보
4. **XrayAnalysis** - 엑스레이 분석 메인 테이블
   - `landmarksData`: 랜드마크 좌표 (JSON)
   - `anglesData`: 각도 측정값 (JSON)
   - `xrayType`: lateral/frontal/panoramic
5. **AnalysisHistory** - 분석 이력 추적
6. **ExportLog** - 내보내기 기록 (Excel/PDF/CSV)

---

## 📁 프로젝트 구조

```
koco_nextjs_final/
├── app/                        # Next.js App Router
│   ├── api/                    # API Routes
│   │   ├── auth/              # 인증 관련
│   │   ├── calculation/       # 각도/거리 계산
│   │   ├── landmark/          # 랜드마크 처리
│   │   ├── measurement/       # 측정 데이터
│   │   ├── psa/              # PSA 분석
│   │   ├── s3/               # AWS S3 업로드
│   │   └── users/            # 사용자 관리
│   ├── auth/                  # 인증 페이지 (signin/signup)
│   ├── dashboard/            # 대시보드
│   ├── analysis/measurement/ # 측정 페이지
│   ├── history/              # 분석 이력
│   ├── psa/                  # PSA 분석 페이지
│   └── landmark/             # 랜드마크 페이지
│
├── components/               # React 컴포넌트
│   ├── AuthButton.tsx
│   ├── FileUpload.tsx       # 이미지 업로드
│   ├── LandmarkCanvas.tsx   # 랜드마크 캔버스
│   ├── MagnifierCanvas.tsx  # 확대 기능
│   ├── PSACanvas.tsx        # PSA 분석 캔버스
│   ├── MeasurementDashboard.tsx
│   ├── LanguageSelector.tsx # 다국어 선택
│   ├── tables/
│   │   ├── DiagnosisTable.tsx
│   │   └── MeasurementTable.tsx
│   └── ui/
│       ├── StatusBadge.tsx
│       ├── ExportButton.tsx
│       └── Tooltip.tsx
│
├── lib/                      # 라이브러리/유틸
│   ├── auth/                # NextAuth 설정
│   ├── calculations/        # 각도/거리 계산 로직
│   ├── constants/           # 상수 정의
│   ├── aws-s3.ts           # S3 연동
│   ├── excel-generator.ts  # Excel 생성
│   ├── landmarks.ts        # 랜드마크 정의
│   ├── s3.ts              # S3 유틸
│   ├── prisma.ts          # Prisma 클라이언트
│   └── i18n.ts            # 다국어 설정
│
├── store/                   # 상태관리 (Zustand)
│   └── measurementStore.ts # 측정 데이터 상태
│
├── types/                   # TypeScript 타입
│   ├── measurement.types.ts
│   └── next-auth.d.ts
│
├── prisma/                  # Prisma ORM
│   └── schema.prisma       # DB 스키마
│
└── public/                  # 정적 파일
```

---

## 🔑 핵심 기능

### 1. **인증 & 권한 관리**
- NextAuth 기반 세션 인증
- 역할: admin, doctor, staff
- Clinic 단위 데이터 격리

### 2. **엑스레이 분석**
- 이미지 업로드 → AWS S3 저장
- 랜드마크 포인트 찍기 (LandmarkCanvas)
- 자동 각도/거리 계산 (calculations/)
- PSA/PSO 분석 결과 생성

### 3. **측정 & 진단**
- MeasurementDashboard: 측정값 시각화
- DiagnosisTable: 진단 결과 테이블
- 정상/비정상 범위 판정

### 4. **데이터 내보내기**
- Excel (xlsx)
- PDF (jspdf + html2canvas)
- CSV

### 5. **다국어 지원**
- i18next + next-i18next
- 한국어/영어 지원

---

## 🛠️ 주요 기술 스택

### Frontend
- Next.js 15 (App Router)
- React 19
- TypeScript
- TailwindCSS
- Zustand (상태관리)
- @tanstack/react-table

### Backend
- Next.js API Routes
- Prisma ORM
- MySQL
- NextAuth (인증)
- bcryptjs (비밀번호 암호화)

### 클라우드
- AWS S3 (이미지 저장)
- Presigned URL (이미지 접근)

### 데이터 처리
- html2canvas (화면 캡처)
- jsPDF (PDF 생성)
- xlsx (Excel 생성)

---

## 🚀 실행 명령어

```bash
# 개발 서버 (포트 3001)
npm run dev

# 프로덕션 빌드
npm run build
npm start

# Prisma
npm run prisma:generate   # 클라이언트 생성
npm run prisma:migrate    # 마이그레이션
npm run prisma:studio     # DB GUI
npm run prisma:seed       # 시드 데이터
```

---

## 📝 개발 시 주의사항

1. **DB 변경 시**: `schema.prisma` 수정 → `prisma:migrate` → `prisma:generate`
2. **이미지 URL**: S3에서 가져오므로 CORS 설정 필요 (`docs/s3-cors-config.json`)
3. **환경변수**: `.env.local` 필요 (DATABASE_URL, AWS 키, NEXTAUTH_SECRET)
4. **포트**: 기본 3001번 사용 (3000과 충돌 방지)
5. **인증**: 모든 분석 페이지는 로그인 필요 (middleware.ts)

---

## 🎯 워크플로우 예시

```
1. 사용자 로그인 → 병원 선택
2. 환자 정보 입력 (Patient)
3. 엑스레이 이미지 업로드 → S3 저장
4. 랜드마크 포인트 찍기 (LandmarkCanvas)
5. 자동 각도 계산 → XrayAnalysis 저장
6. 측정 대시보드에서 결과 확인
7. Excel/PDF로 내보내기 → ExportLog 기록
8. AnalysisHistory에 전체 과정 추적
```

---

## 📂 주요 파일 위치 참고

### API 엔드포인트
- 인증: `app/api/auth/[...nextauth]/route.ts`
- 계산: `app/api/calculation/route.ts`
- 랜드마크: `app/api/landmark/route.ts`
- S3 업로드: `app/api/s3/upload/route.ts`

### 핵심 로직
- 각도 계산: `lib/calculations/`
- 랜드마크 정의: `lib/landmarks.ts`
- S3 연동: `lib/aws-s3.ts`, `lib/s3.ts`
- Excel 생성: `lib/excel-generator.ts`

### 상태관리
- 측정 상태: `store/measurementStore.ts`

---

이 문서는 개발 중 프로젝트 구조와 핵심 기능을 빠르게 리마인드하기 위한 용도입니다.
