# 계측값 정의 관리 시스템 가이드
# Measurement Definitions Management System Guide

## 목차 (Table of Contents)

1. [시스템 개요](#시스템-개요)
2. [사용자 가이드](#사용자-가이드)
3. [관리자 가이드](#관리자-가이드)
4. [API 문서](#api-문서)
5. [기술 아키텍처](#기술-아키텍처)
6. [문제 해결](#문제-해결)

---

## 시스템 개요

### 설명
측모두부계측(Lateral Cephalometric Analysis) 분석 시스템의 계측값 정의를 데이터베이스에 저장하고 관리하는 시스템입니다. 관리자가 계측값의 한글명, 정상 범위, 임상적 해석 등을 업데이트하면 모든 사용자에게 즉시 반영됩니다.

### 주요 기능
- **풍부한 툴팁 정보**: 각 계측항목에 마우스를 올리면 상세한 설명, 정상 범위, 임상적 해석 등을 표시
- **데이터베이스 기반 관리**: 모든 계측값 정의를 DB에 저장하여 중앙 집중식 관리
- **관리자 페이지**: 관리자가 웹 UI를 통해 계측값 정의를 수정 가능
- **자동 캐싱**: 15분 캐시로 성능 최적화
- **Fallback 메커니즘**: DB 오류 시 하드코딩된 데이터로 자동 전환

### 지원하는 계측항목 (33개)
- **각도 측정 (Angular)**: SNA, SNB, ANB, SND, U1 to SN, L1 to GoMe 등
- **거리 측정 (Linear)**: Overjet, Overbite, IMPA, PFH/AFH ratio 등
- **비율 측정 (Ratio)**: Facial axis, Y-axis, Interincisal angle 등

---

## 사용자 가이드

### 계측값 설명 보기

#### 1. 대시보드 접속
측모두부계측 분석 페이지(`/dashboard`)에서 계측값 테이블을 확인할 수 있습니다.

#### 2. 툴팁 보기
각 계측항목명에 마우스를 올리면 상세 정보가 담긴 툴팁이 표시됩니다.

#### 3. 툴팁에 표시되는 정보

**기본 정보**
- **한글명**: 계측항목의 한글 이름 (예: "에스엔에이")
- **전체 명칭**: 영문 전체 이름 (예: "Sella-Nasion-A point angle")
- **설명**: 계측항목이 무엇을 측정하는지에 대한 설명

**임상 정보**
- **정상 범위**: 정상으로 간주되는 수치 범위 (예: "79~83°")
- **높을 때 해석**: 수치가 정상보다 높을 때의 임상적 의미
- **낮을 때 해석**: 수치가 정상보다 낮을 때의 임상적 의미

**추가 정보**
- **임상 참고사항**: 진단 시 참고할 중요 정보
- **측정 방법**: 어떻게 측정하는지에 대한 설명
- **참고 자료**: 데이터 출처 및 참고 문헌

#### 예시: SNA 툴팁

```
┌─────────────────────────────────────────────┐
│ 에스엔에이 (SNA)                              │
│                                             │
│ Sella-Nasion-A point angle                  │
│                                             │
│ 두개저평면(SN)과 상악골 A점이 이루는           │
│ 각도로, 상악골의 전후방 위치를 평가합니다.      │
│                                             │
│ 【정상 범위: 79~83°】                         │
│                                             │
│ ▲ 상악 전돌 (Maxillary Protrusion)          │
│   상악골이 전방으로 돌출된 상태                │
│                                             │
│ ▼ 상악 후퇴 (Maxillary Retrusion)           │
│   상악골이 후방으로 위치한 상태                │
│                                             │
│ 📌 Class II/III 부정교합 진단에              │
│    중요한 지표입니다.                         │
└─────────────────────────────────────────────┘
```

---

## 관리자 가이드

### 관리자 권한 획득

#### 1. 관리자 이메일 등록
다음 Google 계정은 자동으로 관리자 권한이 부여됩니다:
- `ok4192ok@gmail.com`
- `admin@koco.com`

추가 관리자를 등록하려면 `lib/auth/authOptions.ts` 파일의 `ADMIN_EMAILS` 배열에 이메일을 추가하세요:

```typescript
const ADMIN_EMAILS = [
  'ok4192ok@gmail.com',
  'admin@koco.com',
  'new-admin@example.com', // 새 관리자 추가
];
```

#### 2. Google OAuth 로그인
1. 로그인 페이지에서 "Google로 로그인" 클릭
2. 관리자 이메일 계정으로 인증
3. 첫 로그인 시 자동으로 admin 역할이 부여됨

### 관리자 페이지 접속

#### URL
```
/admin/measurements
```

#### 접근 제한
- 관리자 권한(`role: 'admin'`)이 없으면 로그인 페이지로 리다이렉트됩니다.
- 일반 사용자(`role: 'staff'`)는 접근할 수 없습니다.

### 계측값 정의 수정하기

#### 1. 편집 모드 진입
- 수정하고 싶은 행의 "편집" 버튼 클릭
- 해당 행이 파란색 배경으로 변경되고 입력 필드가 활성화됩니다.

#### 2. 수정 가능한 필드
| 필드 | 설명 | 예시 |
|------|------|------|
| **한글명** | 계측항목의 한글 이름 | "에스엔에이" |
| **평균값** | 정상인의 평균 수치 | 81 |
| **정상범위 (최소)** | 정상 범위의 최솟값 | 79 |
| **정상범위 (최대)** | 정상 범위의 최댓값 | 83 |
| **설명** | 계측항목에 대한 설명 | "두개저평면(SN)과 상악골 A점이..." |

#### 3. 저장
- "저장" 버튼 클릭하여 변경사항 저장
- 성공 시 "저장 완료!" 메시지 표시
- 자동으로 목록이 새로고침되어 변경사항 반영

#### 4. 취소
- "취소" 버튼 클릭하여 변경사항 버리기
- 편집 모드가 종료되고 원래 값으로 복원

### 주의사항

⚠️ **중요**: 계측값 정의를 수정하면 모든 사용자에게 즉시 반영됩니다. 신중하게 수정해 주세요.

- 변경사항은 **즉시 데이터베이스에 저장**됩니다.
- **15분 캐시** 후 모든 사용자에게 자동 반영됩니다.
- 긴급 반영이 필요한 경우 사용자에게 페이지 새로고침을 요청하세요.

---

## API 문서

### 공개 API (Public API)

#### GET /api/measurements/definitions
모든 활성 계측값 정의를 가져옵니다.

**인증**: 불필요
**캐싱**: 15분 (CDN 레벨 캐싱 포함)

**요청 예시**
```typescript
const response = await fetch('/api/measurements/definitions');
const data = await response.json();
```

**응답 예시**
```json
{
  "success": true,
  "definitions": [
    {
      "id": "1",
      "name": "SNA",
      "category": "pink",
      "unit": "°",
      "meanValue": 81,
      "titleKo": "에스엔에이",
      "titleEn": "SNA",
      "fullName": "Sella-Nasion-A point angle",
      "description": "두개저평면(SN)과 상악골 A점이 이루는 각도...",
      "normalRangeMin": 79,
      "normalRangeMax": 83,
      "interpretationHigh": "상악 전돌 (Maxillary Protrusion)...",
      "interpretationLow": "상악 후퇴 (Maxillary Retrusion)...",
      "clinicalNote": "Class II/III 부정교합 진단에 중요한 지표입니다.",
      "measurementMethod": "Sella 점, Nasion 점, A point를 연결...",
      "displayOrder": 1,
      "isActive": true,
      "createdAt": "2025-01-15T10:00:00.000Z",
      "updatedAt": "2025-01-15T10:00:00.000Z"
    }
    // ... 32 more items
  ],
  "count": 33
}
```

**응답 헤더**
```
Cache-Control: public, s-maxage=900, stale-while-revalidate=1800
```

### 관리자 API (Admin API)

모든 관리자 API는 `admin` 역할이 필요합니다. 권한이 없으면 `403 Forbidden` 응답을 받습니다.

#### GET /api/admin/measurements
모든 계측값 정의 조회 (관리자 전용)

**인증**: 필수 (`admin` 역할)
**캐싱**: 없음

**요청 예시**
```typescript
const response = await fetch('/api/admin/measurements', {
  headers: {
    'Cookie': 'next-auth.session-token=...' // 세션 쿠키 필요
  }
});
const data = await response.json();
```

**응답**: 공개 API와 동일한 형식

#### PUT /api/admin/measurements/[id]
특정 계측값 정의 수정

**인증**: 필수 (`admin` 역할)

**요청 예시**
```typescript
const response = await fetch('/api/admin/measurements/1', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    titleKo: '수정된 한글명',
    meanValue: 82,
    normalRangeMin: 80,
    normalRangeMax: 84,
    description: '수정된 설명...',
  }),
});
const data = await response.json();
```

**요청 본문** (선택적 필드만 포함)
```typescript
{
  titleKo?: string;
  titleEn?: string;
  fullName?: string;
  description?: string;
  meanValue?: number;
  normalRangeMin?: number;
  normalRangeMax?: number;
  interpretationHigh?: string;
  interpretationLow?: string;
  clinicalNote?: string;
  measurementMethod?: string;
  referenceSource?: string;
  displayOrder?: number;
  isActive?: boolean;
}
```

**응답 예시**
```json
{
  "success": true,
  "definition": {
    "id": "1",
    "name": "SNA",
    "titleKo": "수정된 한글명",
    "meanValue": 82,
    // ... 전체 필드
  }
}
```

**에러 응답**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

#### DELETE /api/admin/measurements/[id]
특정 계측값 정의 삭제 (Soft Delete)

**인증**: 필수 (`admin` 역할)

**참고**: 실제로 데이터베이스에서 삭제하지 않고 `isActive` 플래그를 `false`로 설정합니다.

**요청 예시**
```typescript
const response = await fetch('/api/admin/measurements/1', {
  method: 'DELETE',
});
const data = await response.json();
```

**응답 예시**
```json
{
  "success": true,
  "message": "계측값 정의가 삭제되었습니다"
}
```

### 프론트엔드 통합 예시

#### Zustand Store 사용
```typescript
import { useMeasurementStore } from '@/store/measurementStore';

function MyComponent() {
  const {
    definitions,
    fetchDefinitions,
    definitionsLoading
  } = useMeasurementStore();

  useEffect(() => {
    fetchDefinitions(); // 15분 캐시 적용됨
  }, [fetchDefinitions]);

  if (definitionsLoading) {
    return <div>로딩 중...</div>;
  }

  return (
    <div>
      {definitions.map(def => (
        <div key={def.id}>
          {def.titleKo || def.name}
        </div>
      ))}
    </div>
  );
}
```

#### 직접 API 호출
```typescript
async function fetchMeasurementDefinitions() {
  try {
    const response = await fetch('/api/measurements/definitions');
    if (!response.ok) {
      throw new Error('Failed to fetch');
    }
    const data = await response.json();
    return data.definitions;
  } catch (error) {
    console.error('Error fetching definitions:', error);
    // Fallback to hardcoded data
    return MEASUREMENT_DATA;
  }
}
```

---

## 기술 아키텍처

### 데이터베이스 스키마

#### MeasurementDefinition 모델
```prisma
model MeasurementDefinition {
  id                 BigInt    @id @default(autoincrement())
  name               String    @unique @db.VarChar(100)
  category           String    @db.VarChar(50)
  unit               String    @db.VarChar(20)
  meanValue          Float?

  // 툴팁 정보
  titleKo            String?   @map("title_ko") @db.VarChar(255)
  titleEn            String?   @map("title_en") @db.VarChar(255)
  fullName           String?   @map("full_name") @db.VarChar(255)
  description        String?   @db.Text
  normalRangeMin     Float?    @map("normal_range_min")
  normalRangeMax     Float?    @map("normal_range_max")
  interpretationHigh String?   @map("interpretation_high") @db.Text
  interpretationLow  String?   @map("interpretation_low") @db.Text
  clinicalNote       String?   @map("clinical_note") @db.Text
  measurementMethod  String?   @map("measurement_method") @db.Text
  referenceSource    String?   @map("reference_source") @db.Text

  displayOrder       Int       @default(0) @map("display_order")
  isActive           Boolean   @default(true) @map("is_active")

  createdAt          DateTime  @default(now()) @map("created_at")
  updatedAt          DateTime  @updatedAt @map("updated_at")

  @@map("measurement_definitions")
}
```

### 캐싱 전략

#### 클라이언트 측 캐싱 (Zustand Store)
- **캐시 지속 시간**: 15분
- **캐시 키**: `definitionsLastFetched` 타임스탬프
- **캐시 무효화**: `clearDefinitionsCache()` 함수 호출

```typescript
const CACHE_DURATION = 15 * 60 * 1000; // 15분

fetchDefinitions: async () => {
  const state = get();
  const now = Date.now();

  // 캐시가 유효한 경우 API 호출 건너뛰기
  if (
    state.definitions.length > 0 &&
    state.definitionsLastFetched &&
    now - state.definitionsLastFetched < CACHE_DURATION
  ) {
    return;
  }

  // API 호출 및 캐시 업데이트
  const response = await fetch('/api/measurements/definitions');
  const data = await response.json();

  set({
    definitions: data.definitions,
    definitionsLastFetched: now,
  });
}
```

#### 서버 측 캐싱 (CDN)
- **Cache-Control 헤더**: `public, s-maxage=900, stale-while-revalidate=1800`
- **s-maxage**: 900초 (15분) - CDN이 응답을 캐시하는 시간
- **stale-while-revalidate**: 1800초 (30분) - 재검증 중에도 stale 데이터 제공

### 인증 시스템

#### NextAuth 설정
- **Provider**: Google OAuth 2.0
- **Session Strategy**: JWT (데이터베이스 세션 없음)
- **Admin 식별**: `ADMIN_EMAILS` 배열 기반

#### 자동 역할 할당 프로세스
```typescript
// 1. 사용자 로그인
// 2. signIn 콜백 실행
async signIn({ user, account, profile }) {
  if (user.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: user.email }
    });

    // 3. 신규 사용자인 경우
    if (!existingUser && account) {
      const isAdmin = ADMIN_EMAILS.includes(user.email);

      // 4. 역할 할당하여 사용자 생성
      await prisma.user.create({
        data: {
          email: user.email,
          username: user.name || user.email.split('@')[0],
          role: isAdmin ? 'admin' : 'staff',
          // ...
        }
      });
    }

    // 5. 기존 사용자가 관리자로 승격되어야 하는 경우
    else if (existingUser) {
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
}
```

#### JWT 토큰 구조
```typescript
{
  // 표준 JWT 클레임
  iat: 1234567890,
  exp: 1234567890,

  // 커스텀 클레임
  role: "admin",
  userId: "123",
  email: "ok4192ok@gmail.com"
}
```

### Fallback 메커니즘

DB 조회 실패 시 하드코딩된 데이터(`MEASUREMENT_DATA`)로 자동 전환됩니다.

```typescript
const displayData = definitions.length > 0
  ? definitions.map(def => ({
      name: def.name,
      tooltipData: convertToTooltipData(def)
    }))
  : MEASUREMENT_DATA.map(item => ({
      name: item.name,
      tooltipData: item.tooltip // Fallback
    }));
```

### 컴포넌트 아키텍처

```
MeasurementTable (Client Component)
  ├─ useMeasurementStore() → Zustand Store
  │   └─ fetchDefinitions() → /api/measurements/definitions
  │
  ├─ Tooltip Component
  │   ├─ Simple String Tooltip
  │   └─ Rich TooltipData Object
  │
  └─ Table Rows
      └─ Editable Cells
```

---

## 문제 해결

### 일반 사용자 문제

#### Q1: 툴팁이 표시되지 않아요
**해결 방법**:
1. 페이지를 새로고침하세요.
2. 브라우저 캐시를 지우고 다시 시도하세요.
3. 콘솔(F12 → Console)에서 에러 메시지를 확인하세요.
4. 문제가 지속되면 관리자에게 문의하세요.

#### Q2: 계측값이 업데이트되지 않아요
**원인**: 15분 캐시가 적용되어 있습니다.

**해결 방법**:
1. 최대 15분 대기 후 자동으로 반영됩니다.
2. 즉시 반영이 필요한 경우 페이지를 새로고침하세요 (Ctrl+F5 또는 Cmd+Shift+R).

#### Q3: "로딩 중..." 메시지가 계속 표시돼요
**원인**: API 호출 실패 또는 네트워크 문제

**해결 방법**:
1. 인터넷 연결을 확인하세요.
2. 페이지를 새로고침하세요.
3. 서버 상태를 확인하세요.
4. Fallback 데이터로 자동 전환되어야 하지만, 문제가 지속되면 관리자에게 문의하세요.

### 관리자 문제

#### Q4: 관리자 페이지에 접속할 수 없어요
**증상**: `/admin/measurements` 접속 시 로그인 페이지로 리다이렉트됩니다.

**원인**:
1. 관리자 권한이 없는 계정으로 로그인했습니다.
2. 세션이 만료되었습니다.

**해결 방법**:
1. 관리자 이메일(`ok4192ok@gmail.com` 또는 `admin@koco.com`)로 로그인했는지 확인하세요.
2. 로그아웃 후 다시 로그인하세요.
3. 데이터베이스에서 해당 계정의 `role` 필드가 `'admin'`인지 확인하세요:
   ```sql
   SELECT id, email, role FROM users WHERE email = 'ok4192ok@gmail.com';
   ```
4. 필요시 직접 역할을 업데이트하세요:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'ok4192ok@gmail.com';
   ```

#### Q5: Google 로그인 시 "Try signing in with a different account" 에러
**원인**: NextAuth 어댑터 설정 문제 (이미 수정됨)

**해결 방법**:
1. 최신 코드가 배포되었는지 확인하세요.
2. `lib/auth/authOptions.ts`에 PrismaAdapter가 제거되었는지 확인하세요.
3. 개발 서버를 재시작하세요:
   ```bash
   # 모든 프로세스 종료
   taskkill /F /IM node.exe

   # 개발 서버 재시작
   npm run dev
   ```

#### Q6: 계측값 수정이 저장되지 않아요
**증상**: "저장" 버튼 클릭 후 에러 메시지가 표시됩니다.

**해결 방법**:
1. 콘솔(F12 → Console)에서 에러 메시지를 확인하세요.
2. 네트워크 탭(F12 → Network)에서 API 응답을 확인하세요.
3. 일반적인 에러:
   - **403 Forbidden**: 관리자 권한이 없습니다. Q4를 참고하세요.
   - **400 Bad Request**: 입력 데이터가 유효하지 않습니다. 필드 형식을 확인하세요.
   - **500 Internal Server Error**: 서버 에러입니다. 서버 로그를 확인하세요.

#### Q7: 계측값 정의를 삭제했는데 복구하고 싶어요
**원인**: Soft Delete 방식으로 `isActive` 플래그만 `false`로 설정되어 실제 데이터는 남아 있습니다.

**해결 방법** (데이터베이스 직접 수정):
```sql
-- 삭제된 항목 확인
SELECT id, name, title_ko, is_active
FROM measurement_definitions
WHERE is_active = false;

-- 복구
UPDATE measurement_definitions
SET is_active = true
WHERE id = [복구할_ID];
```

### 개발자 문제

#### Q8: 마이그레이션 에러가 발생해요
**에러**:
```
Error: Migration engine error:
Column `title_ko` does not exist
```

**해결 방법**:
```bash
# 1. Prisma 클라이언트 재생성
npx prisma generate

# 2. 마이그레이션 재실행
npx prisma migrate dev --name add_measurement_definitions

# 3. 시드 데이터 재생성
npx prisma db seed
```

#### Q9: TypeScript 타입 에러
**에러**:
```typescript
Property 'role' does not exist on type 'User'
```

**해결 방법**:
1. `types/next-auth.d.ts` 파일이 존재하는지 확인하세요.
2. TypeScript 서버를 재시작하세요 (VSCode: Cmd+Shift+P → "Restart TS Server").
3. `tsconfig.json`에 타입 정의 경로가 포함되어 있는지 확인하세요.

#### Q10: 시드 데이터가 생성되지 않아요
**해결 방법**:
```bash
# 1. package.json에 prisma.seed 설정 확인
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}

# 2. ts-node 설치
npm install -D ts-node

# 3. 시드 실행
npx prisma db seed
```

#### Q11: API 캐시를 즉시 무효화하고 싶어요
**프론트엔드 캐시 무효화**:
```typescript
import { useMeasurementStore } from '@/store/measurementStore';

// 컴포넌트 내에서
const { clearDefinitionsCache, fetchDefinitions } = useMeasurementStore();

const handleRefresh = async () => {
  clearDefinitionsCache();
  await fetchDefinitions(); // 강제로 새로 가져오기
};
```

**CDN 캐시 무효화**:
- Vercel 배포의 경우: 자동으로 `stale-while-revalidate` 적용
- 수동 무효화가 필요한 경우 배포 플랫폼의 캐시 퍼지 기능 사용

---

## 부록

### 전체 계측항목 목록

| 이름 | 카테고리 | 단위 | 평균값 | 정상범위 |
|------|---------|------|--------|----------|
| SNA | 각도 | ° | 81 | 79~83 |
| SNB | 각도 | ° | 78 | 76~80 |
| ANB | 각도 | ° | 3 | 1~5 |
| SND | 각도 | ° | 76 | 74~78 |
| Wits | 거리 | mm | -1 | -3~1 |
| U1 to SN | 각도 | ° | 103 | 100~106 |
| IMPA | 각도 | ° | 93 | 90~96 |
| L1 to GoMe | 각도 | ° | 93 | 90~96 |
| Interincisal angle | 각도 | ° | 130 | 125~135 |
| Overjet | 거리 | mm | 2.5 | 1~3 |
| Overbite | 거리 | mm | 2.5 | 1~3 |
| Y-axis | 각도 | ° | 59 | 55~63 |
| FMA | 각도 | ° | 25 | 20~30 |
| SN-MP | 각도 | ° | 32 | 28~36 |
| Occlusal plane to SN | 각도 | ° | 14 | 10~18 |
| AB to NP | 각도 | ° | 4 | 0~8 |
| Facial angle | 각도 | ° | 87 | 84~90 |
| Upper lip to E-line | 거리 | mm | -4 | -6~-2 |
| Lower lip to E-line | 거리 | mm | -2 | -4~0 |
| Nasolabial angle | 각도 | ° | 102 | 95~110 |
| Convexity | 각도 | ° | 0 | -8~8 |
| Z angle | 각도 | ° | 75 | 70~80 |
| Upper incisor to NA (mm) | 거리 | mm | 4 | 2~6 |
| Upper incisor to NA (deg) | 각도 | ° | 22 | 18~26 |
| Lower incisor to NB (mm) | 거리 | mm | 4 | 2~6 |
| Lower incisor to NB (deg) | 각도 | ° | 25 | 21~29 |
| Pog to NB | 거리 | mm | 0 | -2~2 |
| PFH/AFH ratio | 비율 | % | 63 | 60~66 |
| Upper facial height | 거리 | mm | 55 | 50~60 |
| Lower facial height | 거리 | mm | 70 | 65~75 |
| Ramus height | 거리 | mm | 55 | 50~60 |
| Body length | 거리 | mm | 75 | 70~80 |
| Palatal plane angle | 각도 | ° | 1 | -3~5 |

### 관련 파일 목록

**데이터베이스**
- `prisma/schema.prisma` - MeasurementDefinition 모델 정의
- `prisma/seed.ts` - 시드 데이터 (33개 계측값 정의)

**API**
- `app/api/measurements/definitions/route.ts` - 공개 API
- `app/api/admin/measurements/route.ts` - 관리자 목록 API
- `app/api/admin/measurements/[id]/route.ts` - 관리자 CRUD API

**프론트엔드**
- `components/tables/MeasurementTable.tsx` - 계측값 테이블 컴포넌트
- `components/ui/Tooltip.tsx` - 툴팁 컴포넌트
- `app/admin/measurements/page.tsx` - 관리자 페이지
- `app/admin/layout.tsx` - 관리자 레이아웃

**상태 관리**
- `store/measurementStore.ts` - Zustand 스토어

**인증**
- `lib/auth/authOptions.ts` - NextAuth 설정
- `types/next-auth.d.ts` - NextAuth 타입 정의

**타입 정의**
- `types/measurementDefinition.types.ts` - 계측값 정의 타입

### 참고 자료

- [Next.js 공식 문서](https://nextjs.org/docs)
- [Prisma 공식 문서](https://www.prisma.io/docs)
- [NextAuth.js 공식 문서](https://next-auth.js.org)
- [Zustand 공식 문서](https://zustand-demo.pmnd.rs)

---

**최종 업데이트**: 2025년 1월
**버전**: 1.0.0
**작성자**: KOCO Development Team
