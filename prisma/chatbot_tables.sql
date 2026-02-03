-- 챗봇 테이블 생성 SQL
-- 데이터베이스: koco

USE koco;

-- 챗봇 미디어 테이블
CREATE TABLE IF NOT EXISTS chat_media (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  media_type ENUM('image', 'video', 'file') NOT NULL,
  s3_key TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size INT,
  mime_type VARCHAR(100),
  thumbnail TEXT,
  duration VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_chat_media_type (media_type),
  INDEX idx_chat_media_active (is_active)
);

-- 챗봇 룰 테이블
CREATE TABLE IF NOT EXISTS chat_rules (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  keywords TEXT NOT NULL,
  response TEXT NOT NULL,
  media_id BIGINT,
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_chat_rule_active (is_active),
  INDEX idx_chat_rule_priority (priority),
  INDEX idx_chat_rule_category (category),

  FOREIGN KEY (media_id) REFERENCES chat_media(id) ON DELETE SET NULL
);

-- 채팅 세션 테이블
CREATE TABLE IF NOT EXISTS chat_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_chat_session_user (user_id)
);

-- 채팅 메시지 테이블
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content TEXT NOT NULL,
  media_id BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_chat_message_session (session_id),
  INDEX idx_chat_message_created (created_at),

  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- 기본 응답 룰 추가 (예시)
INSERT INTO chat_rules (keywords, response, priority, category, is_active) VALUES
('안녕,안녕하세요,하이,hello,hi', '안녕하세요! KOCO 진단 도우미입니다. 무엇을 도와드릴까요?\n\n예시 질문:\n- PSA 분석이란?\n- 랜드마크 찍는 방법\n- 사용법 알려줘', 100, '인사', true),

('도움말,도움,help,사용법,사용방법', 'KOCO 시스템 사용법 안내입니다:\n\n1. X-ray 이미지 업로드\n2. 랜드마크 분석 실행\n3. PSA/PSO 분석 완료\n4. 파일 생성하기\n\n더 자세한 내용이 궁금하시면 구체적으로 질문해 주세요!', 90, 'FAQ', true),

('PSA,psa,PSA분석,프로필분석', 'PSA (Profile Soft tissue Analysis)는 측모 연조직 분석입니다.\n\n분석 방법:\n1. Lateral Ceph 이미지 업로드\n2. "PSA 완성" 버튼 클릭\n3. 연조직 포인트 확인 및 조정\n4. 저장 후 결과 확인\n\nPSA 분석은 얼굴 프로필의 연조직 상태를 평가합니다.', 80, '분석방법', true),

('PSO,pso,PSO분석', 'PSO (Profile Skeletal Outline)는 측모 골격 분석입니다.\n\n분석 방법:\n1. Lateral Ceph 이미지 업로드\n2. "PSO 완성" 버튼 클릭\n3. 골격 라인 확인 및 조정\n4. 저장 후 결과 확인\n\nPSO 분석은 얼굴 프로필의 골격 구조를 평가합니다.', 80, '분석방법', true),

('랜드마크,landmark,랜드마크분석,점찍기', '랜드마크 분석 방법:\n\n1. Lateral Ceph 이미지 업로드\n2. "랜드마크 찍기" 버튼 클릭\n3. 자동으로 검출된 포인트 확인\n4. 필요시 수동으로 위치 조정\n5. 저장 버튼 클릭\n\n정확한 랜드마크 위치가 분석 결과의 정확도를 결정합니다.', 80, '분석방법', true),

('파워포인트,pptx,파일생성,결과파일,PDF,pdf', '분석 결과 파일 생성 방법:\n\n1. 모든 분석 완료 후\n2. 페이지 하단 "반환 파일 형식" 선택\n3. PowerPoint(.pptx) 또는 PDF 선택\n4. "파일 생성하기" 버튼 클릭\n5. 파일 다운로드\n\nPDF는 자동으로 미리보기가 표시됩니다.', 70, '사용법', true);
