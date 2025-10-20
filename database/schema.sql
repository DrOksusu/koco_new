-- KOCO X-ray Analysis Database Schema
-- AWS RDS MySQL/PostgreSQL Compatible

-- Drop tables if they exist (for development)
DROP TABLE IF EXISTS export_logs CASCADE;
DROP TABLE IF EXISTS analysis_history CASCADE;
DROP TABLE IF EXISTS angle_measurements CASCADE;
DROP TABLE IF EXISTS landmarks CASCADE;
DROP TABLE IF EXISTS xray_analyses CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS clinics CASCADE;

-- 1. Clinics table (병원 정보)
CREATE TABLE clinics (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    clinic_name VARCHAR(255) NOT NULL,
    clinic_code VARCHAR(100) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    license_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_clinic_code (clinic_code)
);

-- 2. Users table (사용자 정보)
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'doctor', 'staff') DEFAULT 'staff',
    clinic_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_clinic_id (clinic_id)
);

-- 3. Patients table (환자 정보)
CREATE TABLE patients (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    patient_code VARCHAR(100) UNIQUE NOT NULL,
    patient_name VARCHAR(100) NOT NULL,
    patient_birth_date DATE NOT NULL,
    gender ENUM('M', 'F') NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    clinic_id BIGINT NOT NULL,
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_patient_code (patient_code),
    INDEX idx_patient_name (patient_name),
    INDEX idx_clinic_id (clinic_id)
);

-- 4. X-ray Analyses table (엑스레이 분석 메인)
CREATE TABLE xray_analyses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    analysis_code VARCHAR(100) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL,
    clinic_id BIGINT NOT NULL,
    patient_id BIGINT,
    patient_name VARCHAR(100) NOT NULL,
    patient_birth_date DATE,
    xray_type ENUM('lateral', 'frontal', 'panoramic') DEFAULT 'lateral',
    original_image_url VARCHAR(500),
    annotated_image_url VARCHAR(500),
    file_name VARCHAR(255),
    analysis_status ENUM('in_progress', 'completed', 'failed') DEFAULT 'in_progress',
    diagnosis_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    analyzed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
    INDEX idx_analysis_code (analysis_code),
    INDEX idx_user_id (user_id),
    INDEX idx_patient_id (patient_id),
    INDEX idx_created_at (created_at),
    INDEX idx_analysis_status (analysis_status)
);

-- 5. Landmarks table (랜드마크 좌표)
CREATE TABLE landmarks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    analysis_id BIGINT NOT NULL,
    landmark_name VARCHAR(100) NOT NULL,
    x_coordinate DECIMAL(10, 6) NOT NULL,
    y_coordinate DECIMAL(10, 6) NOT NULL,
    sequence_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_id) REFERENCES xray_analyses(id) ON DELETE CASCADE,
    INDEX idx_analysis_id (analysis_id),
    INDEX idx_landmark_name (landmark_name),
    UNIQUE KEY uk_analysis_landmark (analysis_id, landmark_name)
);

-- 6. Angle Measurements table (각도 측정값)
CREATE TABLE angle_measurements (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    analysis_id BIGINT NOT NULL,
    angle_name VARCHAR(100) NOT NULL,
    angle_value DECIMAL(8, 2) NOT NULL,
    normal_range_min DECIMAL(8, 2),
    normal_range_max DECIMAL(8, 2),
    is_abnormal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_id) REFERENCES xray_analyses(id) ON DELETE CASCADE,
    INDEX idx_analysis_id (analysis_id),
    INDEX idx_angle_name (angle_name),
    UNIQUE KEY uk_analysis_angle (analysis_id, angle_name)
);

-- 7. Analysis History table (분석 이력)
CREATE TABLE analysis_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    analysis_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    action_type ENUM('created', 'modified', 'exported', 'deleted') NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_id) REFERENCES xray_analyses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_analysis_id (analysis_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- 8. Export Logs table (엑셀 다운로드 로그)
CREATE TABLE export_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    analysis_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    export_format ENUM('excel', 'pdf', 'csv') DEFAULT 'excel',
    file_size INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (analysis_id) REFERENCES xray_analyses(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_analysis_id (analysis_id),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
);

-- Insert sample clinic data
INSERT INTO clinics (clinic_name, clinic_code, address, phone, license_number) VALUES
('서울대학교병원', 'SNUH001', '서울특별시 종로구 대학로 101', '02-2072-2114', 'LIC-2024-001'),
('연세대학교 세브란스병원', 'YSH001', '서울특별시 서대문구 연세로 50-1', '02-2228-5555', 'LIC-2024-002');

-- Insert sample user data (password: 'password123' hashed with bcrypt)
INSERT INTO users (email, username, password_hash, role, clinic_id) VALUES
('admin@koco.com', '관리자', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin', 1),
('doctor1@snuh.com', '김의사', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'doctor', 1),
('staff1@snuh.com', '박직원', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'staff', 1);

-- Create views for common queries
CREATE VIEW v_analysis_summary AS
SELECT
    xa.id,
    xa.analysis_code,
    xa.patient_name,
    xa.patient_birth_date,
    xa.xray_type,
    xa.analysis_status,
    xa.created_at,
    xa.analyzed_at,
    u.username as analyzed_by,
    c.clinic_name,
    COUNT(DISTINCT l.id) as landmark_count,
    COUNT(DISTINCT am.id) as angle_count
FROM xray_analyses xa
LEFT JOIN users u ON xa.user_id = u.id
LEFT JOIN clinics c ON xa.clinic_id = c.id
LEFT JOIN landmarks l ON xa.id = l.analysis_id
LEFT JOIN angle_measurements am ON xa.id = am.analysis_id
GROUP BY xa.id;

-- Grant permissions (adjust based on your RDS setup)
-- GRANT ALL PRIVILEGES ON koco_xray.* TO 'your_app_user'@'%';
-- FLUSH PRIVILEGES;